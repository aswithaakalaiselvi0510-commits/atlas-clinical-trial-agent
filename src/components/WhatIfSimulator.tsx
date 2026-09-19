import React, { useState } from "react";
import { Sliders, RefreshCw, AlertTriangle, ShieldCheck, Zap, Info, ChevronRight } from "lucide-react";
import { KGNode } from "../types";

interface WhatIfSimulatorProps {
  activeSubjectId: string;
  onSimulateChange: (simulatedValues: {
    altRatio: number;
    biliRatio: number;
    alpRatio: number;
    dayWindow: number;
    isHysLawTriggered: boolean;
  }) => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  activeSubjectId,
  onSimulateChange,
}) => {
  const [altRatio, setAltRatio] = useState<number>(4.0);
  const [biliRatio, setBiliRatio] = useState<number>(2.4);
  const [alpRatio, setAlpRatio] = useState<number>(0.8);
  const [dayWindow, setDayWindow] = useState<number>(7);

  // Evaluate rule in real-time
  const isHysLaw = altRatio >= 3.0 && biliRatio >= 2.0 && alpRatio < 2.0 && dayWindow <= 14;

  const handleUpdate = (newAlt: number, newBili: number, newAlp: number, newDays: number) => {
    const triggered = newAlt >= 3.0 && newBili >= 2.0 && newAlp < 2.0 && newDays <= 14;
    onSimulateChange({
      altRatio: newAlt,
      biliRatio: newBili,
      alpRatio: newAlp,
      dayWindow: newDays,
      isHysLawTriggered: triggered,
    });
  };

  const handleReset = () => {
    setAltRatio(4.0);
    setBiliRatio(2.4);
    setAlpRatio(0.8);
    setDayWindow(7);
    handleUpdate(4.0, 2.4, 0.8, 7);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-5 shadow-lg space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold tracking-wide text-white">
            Counterfactual Anomaly Propagation Engine
          </h3>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-teal-300 flex items-center space-x-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Test hypothesis scenarios by perturbing biomarker multiples. Watch the Knowledge Graph dynamically recompute edge causal weights and propagate risk throughout the topology.
      </p>

      {/* Real-time Status Card */}
      <div
        className={`p-3.5 rounded-lg border flex items-start space-x-3 transition-all ${
          isHysLaw
            ? "bg-rose-950/50 border-rose-600/60 text-rose-200"
            : "bg-emerald-950/40 border-emerald-600/60 text-emerald-200"
        }`}
      >
        {isHysLaw ? (
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="text-xs space-y-1">
          <div className="font-bold flex items-center space-x-2">
            <span>{isHysLaw ? "CRITICAL: Potential Hy's Law Active" : "CLEARED: Safety Threshold Not Met"}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                isHysLaw ? "bg-rose-500 text-white" : "bg-emerald-600 text-white"
              }`}
            >
              {isHysLaw ? "Causal Cascade Triggered" : "Negative / Tolerated"}
            </span>
          </div>
          <p className="text-[11px] opacity-90">
            {isHysLaw
              ? "ALT ≥ 3×ULN and Total Bilirubin ≥ 2×ULN without cholestasis (ALP < 2×ULN) within 14 days. Graph highlights DILI cascade."
              : alpRatio >= 2.0
              ? "Cholestatic phenotype detected (ALP ≥ 2×ULN). Hepatocellular Hy's Law rule excluded by FDA 2009 guidance."
              : "Biomarker peak is below regulatory alert thresholds. Graph causal edges de-escalate."}
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4 text-xs">
        {/* ALT Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono">
            <span className="text-slate-300">ALT Transaminase Peak:</span>
            <span className={`font-bold ${altRatio >= 3.0 ? "text-rose-400" : "text-emerald-400"}`}>
              {altRatio.toFixed(1)}× ULN {altRatio >= 3.0 && "(≥ 3× Alert)"}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="6.0"
            step="0.1"
            value={altRatio}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setAltRatio(val);
              handleUpdate(val, biliRatio, alpRatio, dayWindow);
            }}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.5×</span>
            <span className="text-amber-400 font-semibold">3.0× (Threshold)</span>
            <span>6.0×</span>
          </div>
        </div>

        {/* BILI Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono">
            <span className="text-slate-300">Total Bilirubin Peak:</span>
            <span className={`font-bold ${biliRatio >= 2.0 ? "text-rose-400" : "text-emerald-400"}`}>
              {biliRatio.toFixed(1)}× ULN {biliRatio >= 2.0 && "(≥ 2× Jaundice)"}
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={biliRatio}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setBiliRatio(val);
              handleUpdate(altRatio, val, alpRatio, dayWindow);
            }}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.5×</span>
            <span className="text-amber-400 font-semibold">2.0× (Threshold)</span>
            <span>5.0×</span>
          </div>
        </div>

        {/* ALP Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono">
            <span className="text-slate-300">Alkaline Phosphatase (ALP):</span>
            <span className={`font-bold ${alpRatio >= 2.0 ? "text-amber-400" : "text-slate-200"}`}>
              {alpRatio.toFixed(1)}× ULN {alpRatio >= 2.0 ? "(Cholestatic Excluded)" : "(No Cholestasis)"}
            </span>
          </div>
          <input
            type="range"
            min="0.4"
            max="4.0"
            step="0.1"
            value={alpRatio}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setAlpRatio(val);
              handleUpdate(altRatio, biliRatio, val, dayWindow);
            }}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0.4×</span>
            <span className="text-blue-400">2.0× (Cholestatic cutoff)</span>
            <span>4.0×</span>
          </div>
        </div>

        {/* Days Window Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono">
            <span className="text-slate-300">Temporal Window (Days):</span>
            <span className={`font-bold ${dayWindow <= 14 ? "text-teal-400" : "text-amber-400"}`}>
              ±{dayWindow} days {dayWindow <= 14 ? "(Within 14d)" : "(> 14d Window Expired)"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={dayWindow}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setDayWindow(val);
              handleUpdate(altRatio, biliRatio, alpRatio, val);
            }}
            className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>1 day</span>
            <span className="text-teal-400">14 days (Regulatory Limit)</span>
            <span>30 days</span>
          </div>
        </div>
      </div>
    </div>
  );
};
