/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Power,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Search,
  Activity,
  Heart,
  Skull,
  HelpCircle,
  MessageSquareOff,
  CornerDownRight,
  Wifi,
  Github
} from "lucide-react";
import { useLiveSession } from "./hooks/useLiveSession";
import { VoiceOrb } from "./components/VoiceOrb";

export default function App() {
  const {
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
  } = useLiveSession();

  const [showLogs, setShowLogs] = useState(false);
  const [showPersonalityHelp, setShowPersonalityHelp] = useState(false);

  const toggleConnection = () => {
    if (state === "disconnected") {
      connect();
    } else {
      disconnect();
    }
  };

  // Fun playful triggers for testing or starting conversations easily!
  const starterPrompts = [
    { text: "Give me a sassy compliment.", label: "Compliment Me" },
    { text: "What's your mood today?", label: "Ask Her Mood" },
    { text: "Tease me a little.", label: "Tease Me" },
    { text: "Open Google.", label: "Trigger Open Website" },
    { text: "Search for tech news.", label: "Trigger Search" },
  ];

  const handleStarterPrompt = (promptText: string) => {
    if (state === "disconnected") {
      // Auto connect and send prompt if clicked when disconnected
      connect().then(() => {
        // Wait a brief moment to allow websocket to open before sending packet
        setTimeout(() => {
          sendTextPrompt(promptText);
        }, 1500);
      });
    } else {
      sendTextPrompt(promptText);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-[#e0e0e6] flex flex-col items-center justify-between font-sans overflow-x-hidden relative">
      
      {/* Elegant Dark Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-40 z-0" />
      
      {/* Atmospheric Background Glows */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-fuchsia-900/15 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* Top Navigation / Status Rail */}
      <header className="w-full max-w-lg px-6 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)] ${state !== "disconnected" ? "animate-pulse" : "opacity-40"}`} />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-emerald-500/80">
            {state !== "disconnected" ? "Session Live: Gemini-3.1" : "Session: Offline"}
          </span>
        </div>
        <div className="text-right">
          <h1 className="text-lg font-light tracking-widest uppercase italic">Zoya <span className="font-bold text-fuchsia-500">AI</span></h1>
          <p className="text-[8px] uppercase tracking-[0.3em] opacity-40">The voice of your better half</p>
        </div>
      </header>

      {/* Main Interaction Area (Persona Aura) */}
      <main className="flex-1 w-full max-w-lg px-6 flex flex-col items-center justify-center gap-8 py-6 z-10">
        
        {/* Sassy Stats Panel HUD */}
        <div className="w-full grid grid-cols-3 gap-3">
          <div className="border border-white/5 bg-black/40 p-2.5 rounded-xl flex flex-col items-center justify-center">
            <span className="font-mono text-[9px] text-white/30 tracking-wider">CHARISMA</span>
            <span className="font-display font-bold text-xs text-fuchsia-400 mt-0.5 flex items-center gap-1">
              MAX <Heart className="w-3.5 h-3.5 fill-fuchsia-400 stroke-fuchsia-400" />
            </span>
          </div>
          <div className="border border-white/5 bg-black/40 p-2.5 rounded-xl flex flex-col items-center justify-center">
            <span className="font-mono text-[9px] text-white/30 tracking-wider">SARCASM</span>
            <span className="font-display font-bold text-xs text-purple-400 mt-0.5 flex items-center gap-1">
              98% <Skull className="w-3.5 h-3.5 text-purple-400" />
            </span>
          </div>
          <div className="border border-white/5 bg-black/40 p-2.5 rounded-xl flex flex-col items-center justify-center">
            <span className="font-mono text-[9px] text-white/30 tracking-wider">INTERFACE</span>
            <span className="font-display font-bold text-xs text-teal-400 mt-0.5 flex items-center gap-1">
              VOICE <Activity className="w-3.5 h-3.5 text-teal-400" />
            </span>
          </div>
        </div>

        {/* Central Core Voice Sphere */}
        <div className="relative my-4 flex items-center justify-center w-full">
          <VoiceOrb
            state={state}
            userVolume={userVolume}
            zoyaVolume={zoyaVolume}
            onClick={toggleConnection}
          />
        </div>

        {/* Floating Tool Execution Overlay HUD */}
        <AnimatePresence>
          {activeTool && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="w-full border border-fuchsia-500/30 bg-black/95 shadow-[0_0_20px_rgba(217,70,239,0.15)] rounded-2xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
                  {activeTool.name === "openWebsite" ? (
                    <ExternalLink className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Search className="w-5 h-5 animate-pulse" />
                  )}
                </div>
                <div className="text-left">
                  <span className="font-mono text-[9px] text-fuchsia-400 uppercase tracking-widest font-semibold block">
                    ZOYA EXECUTED ACTION
                  </span>
                  <p className="text-xs font-medium text-slate-300 mt-0.5">
                    {activeTool.name === "openWebsite"
                      ? `Navigating to ${activeTool.args.siteName || activeTool.args.url}`
                      : `Searching Google for "${activeTool.args.query}"`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Panel regarding Zoya's personality */}
        <AnimatePresence>
          {showPersonalityHelp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full border border-white/5 bg-black/40 p-4 rounded-2xl text-left overflow-hidden"
            >
              <h3 className="text-xs font-display font-bold tracking-wider text-fuchsia-400 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Zoya's Cyber Persona
              </h3>
              <p className="text-xs text-white/60 mt-2 leading-relaxed">
                Zoya is not your average clinical assistant. She's a witty, slightly sarcastic, and sassy female AI. She speaks with a play-flirtatious, teasing tone—like a witty best friend who keeps you on your toes. She hates boring explanations, so ask her anything and see how she replies with real voice-to-voice!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Conversation Starter Chips */}
        <div className="w-full text-center">
          <span className="text-[9px] font-mono text-white/30 tracking-[0.2em] block mb-2.5 uppercase">
            Quick Spark Triggers (Tap to prompt Zoya)
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            {starterPrompts.map((prompt, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleStarterPrompt(prompt.text)}
                className="px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-fuchsia-500/30 text-[10px] font-medium text-white/80 cursor-pointer transition-all"
              >
                {prompt.label}
              </motion.button>
            ))}
          </div>
        </div>
      </main>

      {/* Sassy Glassmorphic Captions Overlay Drawer */}
      <footer className="w-full max-w-lg px-6 pb-6 pt-2 z-20 flex flex-col gap-3">
        
        {/* The Live Subtitles Bubble */}
        <div className="border border-white/5 bg-black/75 backdrop-blur-xl p-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Subtle Ambient top line glow */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />

          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
              Real-time Dialogue stream
            </span>
            <span className="text-[9px] font-mono text-fuchsia-400 animate-pulse uppercase tracking-[0.2em] font-bold">
              {state === "speaking" ? "Streaming Live" : state === "listening" ? "Listening" : "Ready"}
            </span>
          </div>

          <p className="text-sm font-serif italic text-fuchsia-100 leading-relaxed min-h-12 flex items-center justify-center text-center">
            {latestSubtitles ? `"${latestSubtitles}"` : `"Touch the central core to wake me up. Don't worry, I don't bite... much."`}
          </p>
        </div>

        {/* Hardware Tools Access HUD Indicators */}
        <div className="grid grid-cols-2 gap-4 border border-white/5 bg-black/35 p-3 rounded-2xl my-1">
          {/* Browser access */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${activeTool?.name === "openWebsite" ? "opacity-100 text-fuchsia-400 font-bold" : "opacity-60 text-slate-300"}`}>
            <div className={`w-8 h-8 rounded-lg bg-white/5 border ${activeTool?.name === "openWebsite" ? "border-fuchsia-500/50 bg-fuchsia-500/10" : "border-white/10"} flex items-center justify-center shrink-0`}>
              <div className={`w-3 h-3 border-2 ${activeTool?.name === "openWebsite" ? "border-fuchsia-400" : "border-white/40"} rounded-sm`} />
            </div>
            <div className="text-[9px] uppercase tracking-wider text-left">
              <div className="font-semibold text-white/80">Browser Access</div>
              <div className="opacity-50 text-[8px] font-mono">{activeTool?.name === "openWebsite" ? "ACTIVE" : "IDLE"}</div>
            </div>
          </div>

          {/* Search tool */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${activeTool?.name === "searchWeb" ? "opacity-100 text-fuchsia-400 font-bold" : "opacity-60 text-slate-300"}`}>
            <div className={`w-8 h-8 rounded-lg bg-white/5 border ${activeTool?.name === "searchWeb" ? "border-fuchsia-500/50 bg-fuchsia-500/10" : "border-white/10"} flex items-center justify-center shrink-0`}>
              <div className={`w-2.5 h-2.5 bg-white/40 rounded-full ${activeTool?.name === "searchWeb" ? "bg-fuchsia-400" : "bg-white/40"}`} />
            </div>
            <div className="text-[9px] uppercase tracking-wider text-left">
              <div className="font-semibold text-white/80">Search Tools</div>
              <div className="opacity-50 text-[8px] font-mono">{activeTool?.name === "searchWeb" ? "ACTIVE" : "READY"}</div>
            </div>
          </div>
        </div>

        {/* System Telemetry & Logs line toggle */}
        <div className="flex items-center justify-between px-2 text-[10px] font-mono text-white/40">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-[9px] font-mono text-fuchsia-400/80 hover:text-fuchsia-300 flex items-center gap-1 transition-all cursor-pointer uppercase tracking-wider"
          >
            <CornerDownRight className="w-3 h-3 text-fuchsia-400" /> 
            {showLogs ? "Close diagnostic feeds" : "View transcript logs"}
          </button>
          
          <div className="flex items-center gap-3 tracking-widest text-[8px]">
            <div>LATENCY: {state !== "disconnected" ? "42ms" : "0ms"}</div>
            <div>BUFFER: {state !== "disconnected" ? "16.0kB" : "0.0kB"}</div>
          </div>
        </div>

        {/* Expanded Transcripts Log Drawer */}
        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 160 }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full border border-white/5 bg-black/90 rounded-2xl p-4 text-left overflow-y-auto"
            >
              {transcriptions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-white/30 italic">
                  No dialog captured yet. Power up the core and chat!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {transcriptions.map((t) => (
                    <div key={t.id} className="text-xs">
                      <div className="flex items-center justify-between opacity-40 font-mono text-[9px] mb-0.5">
                        <span className={t.role === "zoya" ? "text-fuchsia-400 uppercase font-semibold" : "text-teal-400 uppercase font-semibold"}>
                          {t.role === "zoya" ? "Zoya" : "You"}
                        </span>
                        <span>{t.timestamp}</span>
                      </div>
                      <p className="text-white/80 leading-relaxed pl-1">{t.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Popup Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="border border-rose-500/20 bg-rose-950/70 text-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-left"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5 uppercase tracking-wider text-[10px] text-rose-300">Diagnostic Warning</span>
                <p>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </footer>
    </div>
  );
}
