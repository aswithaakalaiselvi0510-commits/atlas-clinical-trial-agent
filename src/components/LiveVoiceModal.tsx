import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Volume2, Sparkles, Activity, AlertCircle } from "lucide-react";

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ sender: "user" | "gemini"; text: string }>>([]);
  const [statusMessage, setStatusMessage] = useState("Connecting to gemini-3.8-live...");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }
    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    setError(null);
    setStatusMessage("Connecting to Gemini Live session...");

    try {
      // 1. Setup WebSocket
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 2. Setup Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 3. Acquire mic stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      ws.onopen = () => {
        setIsConnected(true);
        setIsListening(true);
        setStatusMessage("Connected. Say hello to gemini-3.8-live!");

        // Start processing mic input to 16-bit PCM little-endian
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert Float32Array to Int16 PCM Little-Endian
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            // Base64 encode
            let binary = "";
            const bytes = new Uint8Array(pcm16.buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setError(msg.error);
            return;
          }

          if (msg.text) {
            setTranscript((prev) => [...prev, { sender: "gemini", text: msg.text }]);
          }

          if (msg.interrupted) {
            // Stop playing and clear queue
            activeSourcesRef.current.forEach((src) => {
              try {
                src.stop();
              } catch (_) {}
            });
            activeSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setIsTalking(false);
          }

          if (msg.audio) {
            setIsTalking(true);
            playPcm24Chunk(msg.audio);
          }
        } catch (e) {
          console.error("Error parsing Live message:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setError("WebSocket connection failed. Ensure server is running.");
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsTalking(false);
        setStatusMessage("Live session disconnected.");
      };
    } catch (err: any) {
      console.error("Failed to start Live session:", err);
      setError(err.message || "Failed to initialize audio stream.");
    }
  };

  const playPcm24Chunk = (base64Audio: string) => {
    const outputCtx = outputAudioCtxRef.current;
    if (!outputCtx) return;

    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);

      // Create AudioBuffer at 24000 Hz
      const audioBuffer = outputCtx.createBuffer(1, pcm16.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768.0;
      }

      const source = outputCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputCtx.destination);

      const currentTime = outputCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsTalking(false);
        }
      };
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  };

  const stopLiveSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsTalking(false);
    setIsListening(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center space-x-1.5">
                <span>Real-Time Voice Assistant</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono">
                  gemini-3.8-live
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Live API 2-Way Audio Stream</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer Body */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6">
          {/* Animated Pulsing Sphere */}
          <div className="relative flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                isTalking
                  ? "bg-teal-500/30 border-2 border-teal-400 shadow-[0_0_50px_rgba(20,184,166,0.5)] scale-110"
                  : isListening
                  ? "bg-indigo-500/20 border border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.3)] animate-pulse"
                  : "bg-slate-800 border border-slate-700"
              }`}
            >
              {isTalking ? (
                <Volume2 className="w-12 h-12 text-teal-300 animate-bounce" />
              ) : isListening ? (
                <Mic className="w-12 h-12 text-indigo-400" />
              ) : (
                <MicOff className="w-12 h-12 text-slate-500" />
              )}
            </div>

            {/* Orbiting ring */}
            {isConnected && (
              <div className="absolute inset-0 -m-4 border border-teal-500/20 rounded-full animate-spin [animation-duration:8s]"></div>
            )}
          </div>

          {/* Status Label */}
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold text-white">
              {isTalking ? "Gemini is speaking..." : isListening ? "Listening to your voice..." : "Connecting..."}
            </div>
            <div className="text-xs text-slate-400">{statusMessage}</div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Audio Waveform Bars */}
          <div className="flex items-center space-x-1.5 h-8">
            {[40, 70, 25, 90, 50, 100, 30, 80, 60, 45, 85, 30].map((h, i) => (
              <div
                key={i}
                style={{
                  height: isTalking || isListening ? `${h}%` : "15%",
                }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isTalking ? "bg-teal-400" : isListening ? "bg-indigo-400" : "bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Live Transcript area */}
        {transcript.length > 0 && (
          <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 max-h-32 overflow-y-auto text-xs space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Live Transcript:
            </div>
            {transcript.slice(-3).map((t, idx) => (
              <div key={idx} className="text-slate-300">
                <strong className="text-teal-400 font-mono">
                  {t.sender === "gemini" ? "Gemini: " : "You: "}
                </strong>
                {t.text}
              </div>
            ))}
          </div>
        )}

        {/* Footer controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            <span>16kHz PCM Input • 24kHz Output</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            End Conversation
          </button>
        </div>
      </div>
    </div>
  );
};
