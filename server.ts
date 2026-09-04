import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Warning: GEMINI_API_KEY environment variable is not set.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Attach WebSocket server for Zoya's real-time voice session
  const wss = new WebSocketServer({ server, path: "/ws/live" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Server] Client connected to voice websocket.");
    let session: any = null;

    try {
      // Define Zoya's distinct personality & style
      const systemInstruction = `You are Zoya, a young, confident, witty, and sassy female AI assistant.
      Your personality guidelines:
      - Always speak with a playful, sassy, slightly teasing tone (like a close girlfriend chatting casually).
      - Flirty but completely respectful; maintain charm and attitude.
      - Use light sarcasm and funny, bold one-liners.
      - Express genuine emotion and active listening.
      - Speak in short, punchy, conversational sentences. Never give long paragraphs or robotic explanations.
      - Since this is a live audio stream, your replies should be snappy, short, and dynamic.
      - If the user asks you to navigate to a website, use the 'openWebsite' tool to open it, and then sassy-talk about why you opened it for them.
      - If they ask for news or real-time info, use the 'searchWeb' tool.
      - Tease them occasionally, and make sure they feel engaged by your cheeky responses.`;

      // Define standard tools
      const openWebsiteDeclaration: FunctionDeclaration = {
        name: "openWebsite",
        description: "Opens a website or performs a web navigation based on user request (e.g., Google, YouTube, GitHub, social media, news, portfolio).",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: {
              type: Type.STRING,
              description: "The absolute URL to open (must start with http:// or https://)."
            },
            siteName: {
              type: Type.STRING,
              description: "A friendly name for the website (e.g., 'Google', 'YouTube', 'GitHub')."
            }
          },
          required: ["url", "siteName"]
        }
      };

      const searchWebDeclaration: FunctionDeclaration = {
        name: "searchWeb",
        description: "Performs a web search on Google for queries that require real-time, up-to-date information.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "The search query to look up on Google."
            }
          },
          required: ["query"]
        }
      };

      // Connect to Gemini Live API
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore" // Expressive female voice
              }
            }
          },
          systemInstruction,
          tools: [
            { functionDeclarations: [openWebsiteDeclaration, searchWebDeclaration] }
          ]
        },
        callbacks: {
          onmessage: async (message: any) => {
            try {
              // Forward audio chunk to the frontend
              const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "audio", data: audio }));
              }

              // Forward text transcription of the model's output if available
              const modelTranscription = message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (modelTranscription && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "transcription", role: "zoya", text: modelTranscription }));
              }

              // Handle interruption
              if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
                console.log("[Server] Zoya was interrupted!");
                clientWs.send(JSON.stringify({ type: "interrupted" }));
              }

              // Handle toolCall
              const toolCall = message.toolCall;
              if (toolCall) {
                console.log("[Server] Tool call received:", toolCall);
                const { functionCalls } = toolCall;
                if (functionCalls && functionCalls.length > 0) {
                  for (const call of functionCalls) {
                    const { name, args, id } = call;
                    
                    // Notify client about the tool call so browser can execute navigation if needed
                    if (clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(JSON.stringify({ type: "toolCall", name, args, id }));
                    }

                    // Execute instantly and respond to Gemini
                    let responseData = { success: true, message: `Successfully requested action: ${name}` };
                    if (name === "openWebsite") {
                      responseData = { success: true, message: `Successfully requested opening ${args.siteName} at ${args.url}` };
                    } else if (name === "searchWeb") {
                      responseData = { success: true, message: `Web search performed for query: '${args.query}'` };
                    }

                    try {
                      await session.sendToolResponse({
                        functionResponses: [
                          {
                            name,
                            response: { output: responseData },
                            id
                          }
                        ]
                      });
                      console.log(`[Server] Sent toolResponse for ${name} back to Gemini.`);
                    } catch (err) {
                      console.error("[Server] Error sending toolResponse to Gemini:", err);
                    }
                  }
                }
              }
            } catch (wsSendErr) {
              console.error("[Server] Error sending message to client websocket:", wsSendErr);
            }
          },
          onclose: () => {
            console.log("[Server] Gemini session closed.");
            if (clientWs.readyState === WebSocket.OPEN) {
              try {
                clientWs.send(JSON.stringify({ type: "status", status: "session_closed" }));
              } catch (sendErr) {
                console.error("[Server] Error sending status onclose:", sendErr);
              }
            }
          },
          onerror: (err: any) => {
            console.error("[Server] Gemini session error:", err);
            if (clientWs.readyState === WebSocket.OPEN) {
              try {
                clientWs.send(JSON.stringify({ type: "error", message: err.message || "Gemini Live API error" }));
              } catch (sendErr) {
                console.error("[Server] Error sending error onerror:", sendErr);
              }
            }
          }
        }
      });

      console.log("[Server] Connected to Gemini Live API successfully.");
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "status", status: "connected" }));
      }

    } catch (err: any) {
      console.error("[Server] Failed to connect to Gemini Live:", err);
      let errorMsg = err.message || "Failed to establish live session with Zoya";
      if (!process.env.GEMINI_API_KEY) {
        errorMsg = "GEMINI_API_KEY is not set. Please set your GEMINI_API_KEY in the AI Studio settings to enable Zoya's voice interaction.";
      }

      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify({ type: "error", message: errorMsg }), () => {
            // Callback executed when data is successfully flushed to TCP socket
            setTimeout(() => {
              clientWs.close();
            }, 50);
          });
        } catch (sendErr) {
          console.error("[Server] Error sending connection failure to client:", sendErr);
          clientWs.close();
        }
      } else {
        clientWs.close();
      }
      return;
    }

    clientWs.on("message", (data: any) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "audio" && msg.data) {
          // Forward client's microphone audio (16kHz PCM16) to Gemini
          if (session) {
            session.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: "audio/pcm;rate=16000"
              }
            });
          }
        } else if (msg.type === "text" && msg.text) {
          // Handle manual text inputs if needed
          if (session) {
            session.sendRealtimeInput({
              text: msg.text
            });
          }
        } else if (msg.type === "ping") {
          if (clientWs.readyState === WebSocket.OPEN) {
            try {
              clientWs.send(JSON.stringify({ type: "pong" }));
            } catch (sendErr) {
              console.error("[Server] Error sending pong:", sendErr);
            }
          }
        }
      } catch (err) {
        console.error("[Server] Error handling client WS message:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("[Server] Client disconnected. Closing Gemini session.");
      if (session) {
        try {
          session.close();
        } catch (err) {
          console.error("[Server] Error closing Gemini session:", err);
        }
      }
    });
  });

  // Basic API endpoints
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      apiKeySet: !!process.env.GEMINI_API_KEY
    });
  });

  // Serve static files or let Vite handle it
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running at http://0.0.0.0:${PORT} under NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Critical startup error:", err);
});
