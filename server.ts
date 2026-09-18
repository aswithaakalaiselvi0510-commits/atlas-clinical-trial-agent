import express from "express";
import http from "http";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";

const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to communicate with the Python StudyGraph & Atlas bridge
async function callPythonBridge(requestPayload: any): Promise<any> {
  try {
    const payloadStr = JSON.stringify(requestPayload);
    const { stdout, stderr } = await execFileAsync("python3", ["bridge.py", payloadStr], {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30000,
    });
    if (!stdout.trim()) {
      throw new Error(`Empty response from Python bridge. Stderr: ${stderr}`);
    }
    return JSON.parse(stdout.trim());
  } catch (err: any) {
    console.error("Python bridge execution error:", err);
    return {
      status: "error",
      error: err.message || "Failed to execute Python clinical engine.",
    };
  }
}

// Lazy Gemini API client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// API Routes
app.get("/api/health", async (req, res) => {
  const bridgeRes = await callPythonBridge({ action: "health" });
  res.json({
    status: "ok",
    server: "ATLAS Express Service",
    timestamp: new Date().toISOString(),
    gemini_available: !!process.env.GEMINI_API_KEY,
    engine: bridgeRes,
  });
});

app.get("/api/stats", async (req, res) => {
  const result = await callPythonBridge({ action: "stats" });
  res.json(result);
});

app.post("/api/build", async (req, res) => {
  const cut = req.body?.cut ? Number(req.body.cut) : null;
  const result = await callPythonBridge({ action: "build", cut });
  res.json(result);
});

app.post("/api/refresh", async (req, res) => {
  const cut = req.body?.cut ? Number(req.body.cut) : null;
  const result = await callPythonBridge({ action: "refresh", cut });
  res.json(result);
});

app.get("/api/subjects", async (req, res) => {
  const result = await callPythonBridge({ action: "all_subjects" });
  res.json(result);
});

app.get("/api/patient/:usubjid", async (req, res) => {
  const usubjid = req.params.usubjid;
  const result = await callPythonBridge({ action: "patient360", usubjid });
  res.json(result);
});

app.post("/api/ask", async (req, res) => {
  const question = req.body?.question || req.body;
  const result = await callPythonBridge({ action: "ask", question });
  res.json(result);
});

// AI Clinical Research Assistant (Gemini)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, modelChoice, enableThinking, enableSearch } = req.body;
    const ai = getGemini();
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Please set GEMINI_API_KEY in Settings.",
      });
    }

    const selectedModel = modelChoice || (enableThinking ? "gemini-3.1-pro-preview" : "gemini-3.5-flash");
    const systemInstruction = `You are ATLAS AI Clinical Co-Pilot, an expert assistant in clinical trial data engineering, CDISC SDTM standards, and protocol compliance (ATLAS-042).
You assist investigators, clinical data managers, and biostatisticians in interpreting study findings, understanding protocol criteria (such as potential Hy's Law: ALT/AST > 3x ULN and Total Bilirubin > 2x ULN within 14 days without cholestasis), examining laboratory unit conversions (1 µkat/L = 60 U/L), and verifying deterministic study graph evidence.
Always be objective, scientific, evidence-first, and precise. Never fabricate subject IDs or laboratory numbers.`;

    const config: any = {
      systemInstruction,
    };

    if (enableThinking && selectedModel === "gemini-3.1-pro-preview") {
      config.thinkingConfig = { thinkingLevel: "HIGH" };
    }

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    res.json({
      reply: response.text,
      modelUsed: selectedModel,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
    });
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    res.status(500).json({ error: error.message || "Gemini processing failed" });
  }
});

// Audio transcription (gemini-3.5-transcribe)
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    const ai = getGemini();
    if (!ai) {
      return res.status(503).json({ error: "Gemini API key not configured" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "audio/webm",
                data: audioBase64,
              },
            },
            {
              text: "Please accurately transcribe this clinical research dictation. Preserve all medical terminology, numbers, units, and clinical trial acronyms.",
            },
          ],
        },
      ],
    });

    res.json({ transcript: response.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "Transcription failed" });
  }
});

// Image analysis (gemini-3.1-pro-preview)
app.post("/api/gemini/analyze-image", async (req, res) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body;
    const ai = getGemini();
    if (!ai) {
      return res.status(503).json({ error: "Gemini API key not configured" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              text: prompt || "Analyze this clinical chart, laboratory plot, or trial documentation in detail. Explain all findings and potential abnormalities.",
            },
          ],
        },
      ],
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Image analysis error:", error);
    res.status(500).json({ error: error.message || "Image analysis failed" });
  }
});

// Vite middleware for development vs static dist for production
async function startServer() {
  const server = http.createServer(app);

  // WebSocket for Live API (gemini-3.8-live)
  const wss = new WebSocketServer({ server, path: "/live" });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to Gemini Live WebSocket");
    const ai = getGemini();
    if (!ai) {
      clientWs.send(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }));
      clientWs.close();
      return;
    }

    try {
      const session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are ATLAS Live Clinical Voice Co-Pilot. You converse in real-time with clinical investigators about clinical trial ATLAS-042, potential Hy's Law criteria, subject trajectories, and CDISC SDTM data. Be scientifically precise, objective, and concise.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onclose: () => {
            clientWs.send(JSON.stringify({ status: "closed" }));
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (parsed.text) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (err) {
          console.error("Error processing realtime audio input:", err);
        }
      });

      clientWs.on("close", () => {
        session.close();
      });
    } catch (err: any) {
      console.error("Gemini Live connect error:", err);
      clientWs.send(JSON.stringify({ error: err.message || "Failed to establish Live session" }));
      clientWs.close();
    }
  });

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
    console.log(`ATLAS Clinical Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
