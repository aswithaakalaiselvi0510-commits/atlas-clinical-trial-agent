import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Brain, 
  Search, 
  X, 
  Check, 
  AlertCircle,
  ExternalLink,
  Bot,
  User,
  Zap
} from "lucide-react";
import { ChatMessage, Answer } from "../types";
import { User as FirebaseUser } from "firebase/auth";
import { db, collection, addDoc, serverTimestamp } from "../lib/firebase";

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialContextAnswer?: Answer | null;
  user?: FirebaseUser | null;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  initialContextAnswer,
  user,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      content: "Hello! I am ATLAS AI Clinical Co-Pilot. I can help you interpret study findings, review potential Hy's Law criteria, clarify laboratory unit conversions (1 µkat/L = 60 U/L), or search clinical literature.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      modelUsed: "gemini-3.5-flash",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [enableThinking, setEnableThinking] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Image analysis state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialContextAnswer) {
      const prompt = `Can you explain the clinical significance of finding '${initialContextAnswer.question}'? Evidence includes ${initialContextAnswer.evidence.length} record(s). Candidate subjects: ${JSON.stringify(initialContextAnswer.answer)}.`;
      handleSendMessage(prompt);
    }
  }, [initialContextAnswer]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: historyPayload,
          modelChoice: selectedModel,
          enableThinking,
          enableSearch,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gemini request failed");
      }

      const sources = data.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || "Web Source",
        uri: chunk.web?.uri,
      })).filter((s: any) => s.uri) || [];

      const botMsg: ChatMessage = {
        id: "b-" + Date.now(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: data.modelUsed,
        groundingSources: sources,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Persist conversation turn to Firestore if signed in
      if (user) {
        try {
          const chatRef = collection(db, "users", user.uid, "chat_sessions");
          addDoc(chatRef, {
            userPrompt: text.trim(),
            botResponse: data.reply,
            modelUsed: data.modelUsed,
            timestamp: serverTimestamp(),
          });
        } catch (_) {}
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: `Error: ${err.message || "Failed to reach Gemini API. Ensure GEMINI_API_KEY is configured in Settings."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processAudioTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Microphone access could not be acquired.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioTranscription = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const res = await fetch("/api/gemini/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: "audio/webm",
          }),
        });
        const data = await res.json();
        if (data.transcript) {
          setInputMessage((prev) => (prev ? prev + " " + data.transcript : data.transcript));
        }
      };
    } catch (e) {
      console.error("Transcription error:", e);
    } finally {
      setTranscribing(false);
    }
  };

  // Image Upload and Analysis
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingImage(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        const res = await fetch("/api/gemini/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            mimeType: file.type || "image/jpeg",
            prompt: "Please examine this clinical laboratory chart or trial documentation. Identify all transaminase or bilirubin abnormalities, reference ranges, and test values.",
          }),
        });
        const data = await res.json();
        if (data.analysis) {
          const imgMsg: ChatMessage = {
            id: "img-" + Date.now(),
            role: "assistant",
            content: `**Clinical Document/Image Analysis:**\n\n${data.analysis}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            modelUsed: "gemini-3.1-pro-preview",
          };
          setMessages((prev) => [...prev, imgMsg]);
        }
      } catch (err: any) {
        console.error("Image analysis failed:", err);
      } finally {
        setAnalyzingImage(false);
      }
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>ATLAS AI Clinical Co-Pilot</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-400/30">
                GEMINI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              CDISC, Hy's Law & Protocol Reasoning
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Control Bar (Model, Thinking, Search) */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Model Select */}
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 text-[11px]"
        >
          <option value="gemini-3.5-flash">gemini-3.5-flash (Balanced)</option>
          <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex)</option>
          <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast)</option>
        </select>

        {/* Toggles */}
        <div className="flex items-center space-x-2">
          {/* High Thinking Toggle */}
          <button
            onClick={() => setEnableThinking(!enableThinking)}
            className={`px-2 py-1 rounded border flex items-center space-x-1 transition-colors text-[11px] ${
              enableThinking
                ? "bg-purple-100 text-purple-900 border-purple-300 font-semibold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
            title="Enable Deep Reasoning (ThinkingLevel.HIGH with gemini-3.1-pro-preview)"
          >
            <Brain className="w-3 h-3 text-purple-600" />
            <span>High Thinking</span>
          </button>

          {/* Google Search Grounding */}
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`px-2 py-1 rounded border flex items-center space-x-1 transition-colors text-[11px] ${
              enableSearch
                ? "bg-blue-100 text-blue-900 border-blue-300 font-semibold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
            title="Ground answers with Google Search literature"
          >
            <Search className="w-3 h-3 text-blue-600" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div className="flex items-center space-x-1 mb-1 text-[10px] text-slate-400">
              {msg.role === "assistant" ? (
                <>
                  <Bot className="w-3 h-3 text-purple-600" />
                  <span>ATLAS AI</span>
                  {msg.modelUsed && (
                    <span className="font-mono text-[9px] bg-slate-200 px-1 rounded text-slate-600">
                      {msg.modelUsed}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <User className="w-3 h-3 text-slate-500" />
                  <span>Investigator</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-xl text-xs max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-slate-900 text-white rounded-br-none"
                  : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none"
              }`}
            >
              {msg.content}

              {/* Grounding Sources */}
              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px]">
                  <span className="font-semibold text-slate-500 block mb-1">Sources:</span>
                  <div className="space-y-1">
                    {msg.groundingSources.slice(0, 3).map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center space-x-1 truncate"
                      >
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{src.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs text-purple-700 p-2 bg-purple-50 rounded-lg max-w-[70%] border border-purple-100">
            <span className="animate-spin">⟳</span>
            <span>Reasoning across protocol rules & trial data...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
        <button
          onClick={() => handleSendMessage("Explain the FDA Potential Hy's Law criteria in detail.")}
          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors"
        >
          Hy's Law Criteria
        </button>
        <button
          onClick={() => handleSendMessage("Why must 1 µkat/L be converted to 60 U/L for ALT/AST?")}
          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors"
        >
          SI Unit Normalization
        </button>
        <button
          onClick={() => handleSendMessage("Summarize the clinical profile for subject 042-S07-001.")}
          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition-colors"
        >
          042-S07-001 Trajectory
        </button>
      </div>

      {/* Input Form & Multimedia Actions */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          {/* File upload hidden */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzingImage || loading}
            title="Upload lab chart or document image for analysis (gemini-3.1-pro-preview)"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ImageIcon className={`w-4 h-4 ${analyzingImage ? "animate-pulse text-purple-600" : ""}`} />
          </button>

          {/* Voice transcription button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={transcribing || loading}
            title={isRecording ? "Stop dictation" : "Voice dictation (gemini-3.5-transcribe)"}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? "bg-rose-100 text-rose-600 animate-pulse"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              transcribing
                ? "Transcribing dictation with gemini-3.5-transcribe..."
                : isRecording
                ? "Listening to clinical dictation..."
                : "Ask clinical query or discuss evidence..."
            }
            className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
          />

          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
