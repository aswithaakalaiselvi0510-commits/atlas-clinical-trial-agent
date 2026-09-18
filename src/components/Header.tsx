import React from "react";
import { 
  Activity, 
  Database, 
  RotateCw, 
  Search, 
  User as UserIcon, 
  Share2, 
  Sparkles, 
  CheckCircle2, 
  Sliders,
  Mic,
  LogIn,
  LogOut
} from "lucide-react";
import { User } from "firebase/auth";
import { BuildStats } from "../types";
import { signInWithGoogle, logOut } from "../lib/firebase";

interface HeaderProps {
  activeTab: "dashboard" | "ask" | "patient360" | "graph" | "ai";
  setActiveTab: (tab: "dashboard" | "ask" | "patient360" | "graph" | "ai") => void;
  stats: BuildStats | null;
  loading: boolean;
  onRefresh: () => void;
  onBuild: (cut: number | null) => void;
  selectedCut: number | null;
  setSelectedCut: (cut: number | null) => void;
  user: User | null;
  onOpenLiveVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  loading,
  onRefresh,
  onBuild,
  selectedCut,
  setSelectedCut,
  user,
  onOpenLiveVoice,
}) => {
  return (
    <header id="atlas-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-white">ATLAS</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  STAGE 1
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Clinical-Trial Study Graph & Evidence Query Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "dashboard"
                  ? "bg-slate-800 text-teal-400 border border-slate-700"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              id="tab-ask"
              onClick={() => setActiveTab("ask")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "ask"
                  ? "bg-slate-800 text-teal-400 border border-slate-700"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Ask ATLAS</span>
            </button>

            <button
              id="tab-patient360"
              onClick={() => setActiveTab("patient360")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "patient360"
                  ? "bg-slate-800 text-teal-400 border border-slate-700"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Patient 360</span>
            </button>

            <button
              id="tab-graph"
              onClick={() => setActiveTab("graph")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "graph"
                  ? "bg-slate-800 text-teal-400 border border-slate-700"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Study Graph</span>
            </button>

            <button
              id="tab-ai"
              onClick={() => setActiveTab("ai")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "ai"
                  ? "bg-purple-900/40 text-purple-300 border border-purple-500/40"
                  : "text-purple-300/80 hover:bg-purple-900/20 hover:text-purple-200"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Co-Pilot</span>
            </button>
          </nav>

          {/* Actions & User Auth */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Voice API Button */}
            <button
              id="btn-live-voice"
              onClick={onOpenLiveVoice}
              title="Launch Gemini 3.8 Live Voice Conversation"
              className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center space-x-1.5 text-xs font-semibold transition-colors"
            >
              <Mic className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span className="hidden sm:inline">Live Voice</span>
            </button>

            {/* Cut selector */}
            <div className="hidden xl:flex items-center space-x-1 text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">
              <Sliders className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <button
                onClick={() => { setSelectedCut(null); onBuild(null); }}
                className={`px-1.5 py-0.5 rounded ${selectedCut === null ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                All
              </button>
              <button
                onClick={() => { setSelectedCut(10); onBuild(10); }}
                className={`px-1.5 py-0.5 rounded ${selectedCut === 10 ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Cut 10
              </button>
              <button
                onClick={() => { setSelectedCut(5); onBuild(5); }}
                className={`px-1.5 py-0.5 rounded ${selectedCut === 5 ? "bg-teal-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Cut 5
              </button>
            </div>

            {/* Refresh Button */}
            <button
              id="btn-refresh-study"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh and rebuild study graph from current files"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-400" : ""}`} />
            </button>

            {/* Firebase Auth Controls */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-7 h-7 rounded-full border border-teal-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-teal-800 flex items-center justify-center text-xs font-bold text-teal-200">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold leading-none text-slate-200 truncate max-w-[120px]">
                    {user.displayName || "Investigator"}
                  </div>
                  <div className="text-[10px] text-teal-400 leading-none mt-0.5">
                    Verified GCP
                  </div>
                </div>
                <button
                  onClick={() => logOut()}
                  title="Sign Out"
                  className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
