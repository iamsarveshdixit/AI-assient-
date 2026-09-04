import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Volume2, Sparkles, AlertCircle } from "lucide-react";
import { SessionState } from "../types";

interface VoiceOrbProps {
  state: SessionState;
  userVolume: number;
  zoyaVolume: number;
  onClick: () => void;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  userVolume,
  zoyaVolume,
  onClick,
}) => {
  // Normalize volume for visualization (typically ranges 0-100 on our analyser)
  const userVolNormalized = Math.min(100, Math.max(0, userVolume));
  const zoyaVolNormalized = Math.min(100, Math.max(0, zoyaVolume));

  const getOrbColor = () => {
    switch (state) {
      case "disconnected":
        return "from-slate-950 to-[#0c0a15] border-fuchsia-500/30 shadow-[0_0_30px_rgba(217,70,239,0.15)]";
      case "connecting":
        return "from-amber-600 via-fuchsia-600 to-indigo-600 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)]";
      case "listening":
        return "from-indigo-600 via-fuchsia-500 to-emerald-400 border-teal-400 shadow-[0_0_60px_rgba(16,185,129,0.4)]";
      case "processing":
        return "from-indigo-700 via-purple-600 to-pink-500 border-indigo-400 shadow-[0_0_70px_rgba(147,51,234,0.5)]";
      case "speaking":
        return "from-indigo-600 via-fuchsia-600 to-purple-400 border-fuchsia-400 shadow-[0_0_100px_rgba(192,38,211,0.65)]";
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "disconnected":
        return "BOOT ZOYA POWER CORE";
      case "connecting":
        return "STABLIZING CHANNELS...";
      case "listening":
        return "ACTIVE LISTENING STATE";
      case "processing":
        return "DIGESTING YOUR WORDS...";
      case "speaking":
        return "ZOYA IS TRANSMITTING";
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Dynamic Background Glow Rings */}
      <AnimatePresence>
        {state !== "disconnected" && (
          <>
            {/* Outermost Ripple */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: 1.35 + (state === "speaking" ? zoyaVolNormalized * 0.009 : userVolNormalized * 0.009),
                opacity: state === "listening" ? 0.15 : state === "speaking" ? 0.3 : 0.1,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className={`absolute w-80 h-80 rounded-full blur-2xl bg-gradient-to-r ${
                state === "speaking" ? "from-fuchsia-600 to-indigo-600" : "from-indigo-500 to-emerald-500"
              }`}
            />

            {/* Inner Ripple */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: 1.15 + (state === "speaking" ? zoyaVolNormalized * 0.006 : userVolNormalized * 0.006),
                opacity: state === "listening" ? 0.25 : state === "speaking" ? 0.45 : 0.2,
              }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`absolute w-64 h-64 rounded-full blur-xl bg-gradient-to-r ${
                state === "speaking" ? "from-fuchsia-500/20 to-purple-500/20" : "from-emerald-500/20 to-indigo-500/20"
              }`}
            />
          </>
        )}
      </AnimatePresence>

      {/* Decorative Rotating Tech Rings */}
      <div className="absolute w-84 h-84 border border-fuchsia-500/10 rounded-full pointer-events-none flex items-center justify-center scale-110">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          className={`w-80 h-80 border border-dashed rounded-full ${
            state === "speaking"
              ? "border-fuchsia-500/30"
              : state === "listening"
              ? "border-indigo-400/30"
              : "border-slate-800/40"
          }`}
        />
      </div>

      <div className="absolute w-[360px] h-[360px] border border-indigo-400/20 rounded-full pointer-events-none flex items-center justify-center">
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className={`w-[350px] h-[350px] border border-dotted rounded-full ${
            state === "speaking"
              ? "border-purple-500/25"
              : state === "listening"
              ? "border-teal-500/25"
              : "border-slate-900/60"
          }`}
        />
      </div>

      {/* Main Core Button */}
      <motion.button
        id="voice-orb-btn"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
        className={`relative z-10 w-60 h-60 rounded-full bg-gradient-to-tr ${getOrbColor()} border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-500`}
      >
        {/* Glass Morphism Overlay */}
        <div className="absolute inset-1 rounded-full bg-black/25 backdrop-blur-[2px] flex flex-col items-center justify-center overflow-hidden">
          
          {/* Waveforms */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 px-8 pointer-events-none">
            {state === "speaking" && (
              <div className="flex items-end justify-center gap-1.5 h-24">
                {[...Array(9)].map((_, i) => {
                  const heights = [20, 60, 40, 85, 55, 96, 70, 35, 18];
                  const randomHeight = heights[i % heights.length] * (0.4 + (zoyaVolNormalized / 100) * 0.6);
                  return (
                    <motion.div
                      key={i}
                      animate={{ height: [`${randomHeight * 0.3}px`, `${randomHeight}px`, `${randomHeight * 0.3}px`] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.45 + (i % 3) * 0.12,
                        ease: "easeInOut",
                      }}
                      className="w-1.5 bg-white/90 rounded-full"
                    />
                  );
                })}
              </div>
            )}

            {state === "listening" && (
              <div className="flex items-center justify-center gap-1.5 h-20">
                {[...Array(9)].map((_, i) => {
                  const baseH = 8 + (userVolNormalized > 10 ? userVolNormalized * 0.5 : 3);
                  const delay = i * 0.04;
                  return (
                    <motion.div
                      key={i}
                      animate={{ height: [`${baseH}px`, `${baseH * 2.5}px`, `${baseH}px`] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.7,
                        delay,
                        ease: "easeInOut",
                      }}
                      className="w-1.5 bg-teal-400/90 rounded-full"
                    />
                  );
                })}
              </div>
            )}

            {state === "connecting" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-12 h-12 border-2 border-fuchsia-400 border-t-transparent rounded-full"
              />
            )}

            {state === "disconnected" && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1.02, 0.98] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className="flex flex-col items-center text-fuchsia-400/80"
              >
                <Sparkles className="w-10 h-10 stroke-[1.2]" />
              </motion.div>
            )}

            {state === "processing" && (
              <div className="flex items-center justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [-6, 6, -6] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5,
                      delay: i * 0.12,
                      ease: "easeInOut",
                    }}
                    className="w-4 h-4 rounded-full bg-gradient-to-tr from-fuchsia-500 to-indigo-400 shadow-md"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Central state icon */}
          <div className="absolute bottom-6 flex flex-col items-center pointer-events-none">
            {state === "speaking" && (
              <Volume2 className="w-6 h-6 text-fuchsia-300 animate-pulse" />
            )}
            {state === "listening" && (
              <Mic className="w-6 h-6 text-teal-300" />
            )}
          </div>
        </div>
      </motion.button>

      {/* State Badge Indicator */}
      <div className="mt-8 flex flex-col items-center">
        <span
          className={`font-mono text-xs tracking-[0.3em] font-bold transition-all duration-300 uppercase ${
            state === "speaking"
              ? "text-fuchsia-400 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]"
              : state === "listening"
              ? "text-teal-400 drop-shadow-[0_0_10px_rgba(20,184,166,0.4)]"
              : state === "connecting"
              ? "text-amber-400 animate-pulse"
              : state === "processing"
              ? "text-indigo-400"
              : "text-slate-500"
          }`}
        >
          {getStatusText()}
        </span>

        {/* Dynamic helper description below state */}
        <span className="text-[10px] text-white/40 mt-2 font-sans uppercase tracking-[0.4em]">
          {state === "disconnected" && "START THE VOICE EXPERIENCE"}
          {state === "connecting" && "SYCHRONIZING REALTIME EMOTION"}
          {state === "listening" && "SASSY & ATTENTIVE"}
          {state === "processing" && "COMPILING HIGH-CONSCIOUS RETORT"}
          {state === "speaking" && "24kHz PCM AUDIO FEED"}
        </span>
      </div>
    </div>
  );
};
export default VoiceOrb;
