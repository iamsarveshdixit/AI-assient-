import { useState, useEffect, useRef, useCallback } from "react";
import { SessionState, ToolCallInfo, Transcription, ZoyaMessage } from "../types";
import { AudioStreamer } from "../lib/AudioStreamer";

export function useLiveSession() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [latestSubtitles, setLatestSubtitles] = useState<string>("");
  const [activeTool, setActiveTool] = useState<ToolCallInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sound levels for animations
  const [userVolume, setUserVolume] = useState<number>(0);
  const [zoyaVolume, setZoyaVolume] = useState<number>(0);

  // Refs to avoid stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const volumeIntervalRef = useRef<any>(null);

  // Cleanup helper
  const disconnect = useCallback(() => {
    console.log("[LiveSession] Disconnecting and cleaning up resources...");
    setState("disconnected");
    setActiveTool(null);
    setUserVolume(0);
    setZoyaVolume(0);

    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (streamerRef.current) {
      try {
        streamerRef.current.stopRecording();
        streamerRef.current.stopPlayback();
      } catch (err) {
        console.error("[LiveSession] Error during streamer cleanup:", err);
      }
      streamerRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        // Already closed or closing
      }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    disconnect();
    setState("connecting");
    setError(null);
    setTranscriptions([]);
    setLatestSubtitles("Connecting to Zoya...");

    try {
      // 1. Initialize AudioStreamer
      const streamer = new AudioStreamer();
      streamerRef.current = streamer;

      // 2. Set up playback status callbacks to update state dynamically
      streamer.onPlaybackStarted = () => {
        setState("speaking");
      };
      streamer.onPlaybackEnded = () => {
        setState((current) => (current === "speaking" ? "listening" : current));
        setZoyaVolume(0);
      };

      // 3. Establish WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      console.log(`[LiveSession] Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("[LiveSession] WebSocket connection established.");
        setLatestSubtitles("Listening...");
        
        try {
          // Start capturing mic audio and streaming PCM16 chunks
          await streamer.startRecording((base64Audio) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "audio", data: base64Audio }));
            }
          });
          
          setState("listening");

          // Start monitoring voice levels for the UI animations
          volumeIntervalRef.current = setInterval(() => {
            if (streamerRef.current) {
              setUserVolume(streamerRef.current.getMicVolume());
              setZoyaVolume(streamerRef.current.getSpeakerVolume());
            }
          }, 50);

        } catch (err: any) {
          console.error("[LiveSession] Failed to start mic recording on connection:", err);
          setError("Microphone permission denied or device not found.");
          disconnect();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ZoyaMessage = JSON.parse(event.data);
          
          switch (msg.type) {
            case "audio":
              if (msg.data && streamerRef.current) {
                streamerRef.current.playAudioChunk(msg.data);
              }
              break;

            case "transcription":
              if (msg.text && msg.role) {
                const newTrans: Transcription = {
                  id: Math.random().toString(36).substring(7),
                  role: msg.role,
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString(),
                };
                
                setTranscriptions((prev) => [...prev, newTrans]);
                if (msg.role === "zoya") {
                  setLatestSubtitles(msg.text);
                }
              }
              break;

            case "interrupted":
              console.log("[LiveSession] Interruption signal received from Zoya.");
              if (streamerRef.current) {
                streamerRef.current.stopPlayback();
              }
              setState("listening");
              setLatestSubtitles("Interrupted... Zoya is listening!");
              break;

            case "toolCall":
              if (msg.name && msg.args && msg.id) {
                console.log(`[LiveSession] Executing tool: ${msg.name}`, msg.args);
                const toolInfo: ToolCallInfo = {
                  id: msg.id,
                  name: msg.name,
                  args: msg.args,
                  executed: true,
                  timestamp: new Date().toLocaleTimeString(),
                };
                setActiveTool(toolInfo);

                // Handle browser execution of the tool
                if (msg.name === "openWebsite" && msg.args.url) {
                  // Instant visual feedback and open window safely
                  setLatestSubtitles(`Opening ${msg.args.siteName || 'website'}...`);
                  setTimeout(() => {
                    window.open(msg.args.url, "_blank", "noopener,noreferrer");
                  }, 800);
                } else if (msg.name === "searchWeb" && msg.args.query) {
                  setLatestSubtitles(`Searching Google for "${msg.args.query}"...`);
                  // Let's open Google search in a new tab for them too!
                  setTimeout(() => {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(msg.args.query)}`, "_blank", "noopener,noreferrer");
                  }, 800);
                }

                // Clear tool display after 4 seconds
                setTimeout(() => {
                  setActiveTool((current) => (current?.id === msg.id ? null : current));
                }, 4000);
              }
              break;

            case "status":
              if (msg.status === "session_closed") {
                disconnect();
              }
              break;

            case "error":
              setError(msg.message || "An error occurred during the session.");
              disconnect();
              break;
          }
        } catch (err) {
          console.error("[LiveSession] Error processing incoming WebSocket message:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("[LiveSession] WebSocket error occurred:", err);
        setError("WebSocket connection failed. Make sure server is running.");
        disconnect();
      };

      ws.onclose = () => {
        console.log("[LiveSession] WebSocket connection closed.");
        disconnect();
      };

    } catch (err: any) {
      console.error("[LiveSession] Connection initialization failed:", err);
      setError(err.message || "Failed to establish a connection with Zoya.");
      disconnect();
    }
  }, [disconnect]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Send optional text to Gemini (e.g. initial greeting or prompt fallback)
  const sendTextPrompt = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "text", text }));
      setState("processing");
    }
  }, []);

  return {
    state,
    transcriptions,
    latestSubtitles,
    activeTool,
    error,
    userVolume,
    zoyaVolume,
    connect,
    disconnect,
    sendTextPrompt,
  };
}
export default useLiveSession;
