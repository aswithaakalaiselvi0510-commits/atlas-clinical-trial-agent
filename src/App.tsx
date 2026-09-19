import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { AskAtlasView } from "./components/AskAtlasView";
import { Patient360View } from "./components/Patient360View";
import { GraphView } from "./components/GraphView";
import { AiAssistantDrawer } from "./components/AiAssistantDrawer";
import { EvidenceDetailModal } from "./components/EvidenceDetailModal";
import { LiveVoiceModal } from "./components/LiveVoiceModal";
import { BuildStats, SubjectSummary, Question, Answer, Patient360, RecordRef } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "ask" | "patient360" | "graph" | "ai">("dashboard");
  const [stats, setStats] = useState<BuildStats | null>(null);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCut, setSelectedCut] = useState<number | null>(null);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);

  // Modals & Drawers
  const [inspectedRecord, setInspectedRecord] = useState<RecordRef | null>(null);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [contextAnswer, setContextAnswer] = useState<Answer | null>(null);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      if (statsData.status === "ok" && statsData.stats) {
        setStats(statsData.stats);
      }

      // 2. Fetch Subjects list
      const subjRes = await fetch("/api/subjects");
      const subjData = await subjRes.json();
      if (subjData.status === "ok" && Array.isArray(subjData.subjects)) {
        setSubjects(subjData.subjects);
      }
    } catch (err) {
      console.error("Failed to load study graph data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuild = async (cut: number | null) => {
    setLoading(true);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cut }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.stats) {
        setStats(data.stats);
      }
      // reload subjects
      const subjRes = await fetch("/api/subjects");
      const subjData = await subjRes.json();
      if (subjData.status === "ok") {
        setSubjects(subjData.subjects);
      }
    } catch (err) {
      console.error("Build failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cut: selectedCut }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.stats) {
        setStats(data.stats);
      }
      const subjRes = await fetch("/api/subjects");
      const subjData = await subjRes.json();
      if (subjData.status === "ok") {
        setSubjects(subjData.subjects);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (q: Question): Promise<Answer | null> => {
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.answer) {
        return data.answer;
      }
      return null;
    } catch (err) {
      console.error("Query failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPatient = async (usubjid: string): Promise<Patient360 | null> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patient/${encodeURIComponent(usubjid)}`);
      const data = await res.json();
      if (data.status === "ok" && data.patient) {
        return data.patient;
      }
      return null;
    } catch (err) {
      console.error("Fetch patient 360 failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAiWithContext = (ans: Answer) => {
    setContextAnswer(ans);
    setIsAiOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={(t) => {
          if (t === "ai") {
            setIsAiOpen(true);
          } else {
            setActiveTab(t);
          }
        }}
        stats={stats}
        loading={loading}
        onRefresh={handleRefresh}
        onBuild={handleBuild}
        selectedCut={selectedCut}
        setSelectedCut={setSelectedCut}
        user={user}
        onOpenLiveVoice={() => setIsLiveVoiceOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <DashboardView
            stats={stats}
            loading={loading}
            onRefresh={handleRefresh}
            onBuild={handleBuild}
            onSelectTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === "ask" && (
          <AskAtlasView
            onAsk={handleAsk}
            loading={loading}
            onInspectRecord={(ref) => setInspectedRecord(ref)}
            onOpenAiAssistantWithContext={handleOpenAiWithContext}
            user={user}
          />
        )}

        {activeTab === "patient360" && (
          <Patient360View
            subjects={subjects}
            onFetchPatient={handleFetchPatient}
            loading={loading}
            onInspectRecord={(ref) => setInspectedRecord(ref)}
            user={user}
          />
        )}

        {activeTab === "graph" && (
          <GraphView
            subjects={subjects}
            onSelectSubject={(subjId) => {
              setActiveTab("patient360");
            }}
            user={user}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <strong>ATLAS Clinical Trial Intelligence</strong> — Stage 1 Verified Implementation
          </div>
          <div className="flex items-center space-x-4">
            <span>Deterministic Evidence Rules</span>
            <span>•</span>
            <span>CDISC SDTM Ingestion</span>
            <span>•</span>
            <span>Zero-Hallucination Guardrails</span>
          </div>
        </div>
      </footer>

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiOpen}
        onClose={() => {
          setIsAiOpen(false);
          setContextAnswer(null);
        }}
        initialContextAnswer={contextAnswer}
        user={user}
      />

      {/* Gemini 3.8 Live Voice Modal */}
      <LiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
      />

      {/* Raw Record Inspector Modal */}
      <EvidenceDetailModal
        recordRef={inspectedRecord}
        onClose={() => setInspectedRecord(null)}
      />
    </div>
  );
}
