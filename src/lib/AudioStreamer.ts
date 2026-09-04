/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioStreamer {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Playback state
  private nextStartTime = 0;
  private scheduledSources: AudioBufferSourceNode[] = [];
  
  // Callbacks
  public onAudioChunkRecorded: ((base64Pcm16: string) => void) | null = null;
  public onPlaybackStarted: (() => void) | null = null;
  public onPlaybackEnded: (() => void) | null = null;

  // Volume visualization
  private inputVolumeAnalyser: AnalyserNode | null = null;
  private outputVolumeAnalyser: AnalyserNode | null = null;

  constructor() {}

  /**
   * Starts microphone capture at 16000Hz PCM16
   */
  async startRecording(onAudioChunk: (base64Pcm16: string) => void): Promise<void> {
    this.onAudioChunkRecorded = onAudioChunk;

    try {
      // 1. Request microphone access
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize input AudioContext at 16000 Hz
      this.inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.micSource = this.inputAudioCtx.createMediaStreamSource(this.micStream);
      
      // Analyser for user voice visualization
      this.inputVolumeAnalyser = this.inputAudioCtx.createAnalyser();
      this.inputVolumeAnalyser.fftSize = 256;
      this.micSource.connect(this.inputVolumeAnalyser);

      // 3. Create ScriptProcessorNode (buffer size 4096, 1 channel)
      this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.onAudioChunkRecorded) return;

        const float32Array = e.inputBuffer.getChannelData(0);
        const pcm16Buffer = this.float32ToPCM16(float32Array);
        const base64 = this.arrayBufferToBase64(pcm16Buffer);
        
        this.onAudioChunkRecorded(base64);
      };

      this.micSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioCtx.destination);
      
      console.log("[AudioStreamer] Microphone recording started successfully at 16kHz.");
    } catch (err) {
      console.error("[AudioStreamer] Failed to start microphone recording:", err);
      this.stopRecording();
      throw err;
    }
  }

  /**
   * Stops microphone recording and cleans up resources
   */
  stopRecording(): void {
    console.log("[AudioStreamer] Stopping microphone recording.");
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== "closed") {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }

    this.inputVolumeAnalyser = null;
    this.onAudioChunkRecorded = null;
  }

  /**
   * Plays a 24kHz raw PCM16 audio chunk with gapless scheduling
   */
  playAudioChunk(base64Data: string): void {
    if (!this.outputAudioCtx) {
      this.outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      // Analyser for Zoya's voice visualization
      this.outputVolumeAnalyser = this.outputAudioCtx.createAnalyser();
      this.outputVolumeAnalyser.fftSize = 256;
      this.outputVolumeAnalyser.connect(this.outputAudioCtx.destination);
    }

    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume();
    }

    // 1. Decode base64 to bytes
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Convert to Float32Array (each sample is 2 bytes/16-bit)
    const numSamples = len / 2;
    const float32 = new Float32Array(numSamples);
    const dataView = new DataView(bytes.buffer);
    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true); // little-endian
      float32[i] = int16 / 32768.0;
    }

    // 3. Create AudioBuffer (1 channel, 24kHz)
    const buffer = this.outputAudioCtx.createBuffer(1, numSamples, 24000);
    buffer.copyToChannel(float32, 0);

    // 4. Create and configure Buffer Source
    const source = this.outputAudioCtx.createBufferSource();
    source.buffer = buffer;

    // Connect to analyser and then destination
    if (this.outputVolumeAnalyser) {
      source.connect(this.outputVolumeAnalyser);
    } else {
      source.connect(this.outputAudioCtx.destination);
    }

    // Precise continuous scheduling
    const currentTime = this.outputAudioCtx.currentTime;
    if (this.nextStartTime < currentTime) {
      // Small buffer to prevent start popping
      this.nextStartTime = currentTime + 0.04;
    }

    // Register active scheduled source
    this.scheduledSources.push(source);
    
    if (this.scheduledSources.length === 1) {
      this.onPlaybackStarted?.();
    }

    source.onended = () => {
      // Remove from active scheduled sources list
      this.scheduledSources = this.scheduledSources.filter((s) => s !== source);
      if (this.scheduledSources.length === 0) {
        this.onPlaybackEnded?.();
      }
    };

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  /**
   * Instantly stops playback and cancels all queued audio chunks (on interruption)
   */
  stopPlayback(): void {
    console.log("[AudioStreamer] Instantly stopping and clearing playback queue.");
    
    // Clear callbacks first to avoid state change loops
    this.scheduledSources.forEach((source) => {
      source.onended = null;
      try {
        source.stop();
      } catch (err) {
        // Source might not have started yet or already finished
      }
    });

    this.scheduledSources = [];
    this.nextStartTime = 0;
    this.onPlaybackEnded?.();
  }

  /**
   * Helper to get real-time frequency/volume data for visual waveforms
   */
  getMicVolume(): number {
    if (!this.inputVolumeAnalyser) return 0;
    const dataArray = new Uint8Array(this.inputVolumeAnalyser.frequencyBinCount);
    this.inputVolumeAnalyser.getByteFrequencyData(dataArray);
    
    // Average amplitude
    let total = 0;
    for (let i = 0; i < dataArray.length; i++) {
      total += dataArray[i];
    }
    return total / dataArray.length;
  }

  getSpeakerVolume(): number {
    if (!this.outputVolumeAnalyser) return 0;
    const dataArray = new Uint8Array(this.outputVolumeAnalyser.frequencyBinCount);
    this.outputVolumeAnalyser.getByteFrequencyData(dataArray);
    
    // Average amplitude
    let total = 0;
    for (let i = 0; i < dataArray.length; i++) {
      total += dataArray[i];
    }
    return total / dataArray.length;
  }

  /**
   * Converts Float32 audio samples to 16-bit PCM ArrayBuffer
   */
  private float32ToPCM16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(i * 2, val, true); // true = little-endian
    }
    return buffer;
  }

  /**
   * Converts an ArrayBuffer to a Base64-encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
export default AudioStreamer;
