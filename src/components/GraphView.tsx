import React, { useState } from "react";
import { GitBranch, Layers, Users, Filter, CheckCircle } from "lucide-react";
import { SubjectSummary } from "../types";

interface GraphViewProps {
  subjects: SubjectSummary[];
  onSelectSubject?: (usubjid: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ subjects, onSelectSubject }) => {
  const [selectedSubj, setSelectedSubj] = useState<string>("042-S07-001");
  const [filterDomain, setFilterDomain] = useState<string>("ALL");

  const activeSubject = subjects.find((s) => s.usubjid === selectedSubj) || subjects[0];

  // Visual layout mock entities for the selected subject
  const graphEntities = [
    { id: "NODE-SUBJ", label: selectedSubj, type: "SUBJECT", color: "#0f172a", x: 300, y: 200, size: 24 },
    // Visits
    { id: "VISIT-BL", label: "BASELINE", type: "VISIT", color: "#4f46e5", x: 160, y: 120, size: 16 },
    { id: "VISIT-W2", label: "WEEK2", type: "VISIT", color: "#4f46e5", x: 140, y: 220, size: 16 },
    { id: "VISIT-W4", label: "WEEK4", type: "VISIT", color: "#4f46e5", x: 220, y: 310, size: 16 },
    { id: "VISIT-W8", label: "WEEK8", type: "VISIT", color: "#4f46e5", x: 440, y: 120, size: 18 },
    { id: "VISIT-W12", label: "WEEK12", type: "VISIT", color: "#4f46e5", x: 460, y: 250, size: 16 },
    // Labs at WEEK8
    { id: "LAB-ALT-W8", label: "ALT (3.995 µkat/L → 239.7 U/L)", type: "LB", color: "#0d9488", x: 550, y: 60, size: 14, parent: "VISIT-W8", note: "> 3×ULN ✓" },
    { id: "LAB-BILI-W8", label: "BILI (5.38 mg/dL)", type: "LB", color: "#0d9488", x: 580, y: 140, size: 14, parent: "VISIT-W8", note: "> 2×ULN ✓" },
    { id: "LAB-ALP-W8", label: "ALP (88.0 U/L)", type: "LB", color: "#0d9488", x: 480, y: 40, size: 14, parent: "VISIT-W8", note: "< 2×ULN (No Cholestasis)" },
    // AE
    { id: "AE-HEPATIC", label: "AE: Hepatic Injury (SEVERE)", type: "AE", color: "#e11d48", x: 380, y: 340, size: 16, parent: "NODE-SUBJ" },
    // Exposure
    { id: "EX-DOSE-W8", label: "EX: 100mg AT-042 (Compliant)", type: "EX", color: "#d97706", x: 100, y: 300, size: 14, parent: "VISIT-W4" },
    // Disposition
    { id: "DS-DISC", label: "DS: Discontinued (AE)", type: "DS", color: "#9333ea", x: 460, y: 340, size: 14, parent: "NODE-SUBJ" },
  ];

  const visibleEntities = graphEntities.filter((e) => {
    if (filterDomain === "ALL") return true;
    if (e.type === "SUBJECT" || e.type === "VISIT") return true;
    return e.type === filterDomain;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
            <GitBranch className="w-5 h-5 text-teal-600" />
            <h2>Interactive Study Graph Topology</h2>
          </div>
          <p className="text-xs text-slate-500">
            Explicit relational model linking subjects, study visits, laboratory measurements, adverse events, and exposure.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Domain Filter:</span>
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 font-medium text-slate-800 focus:outline-none"
            >
              <option value="ALL">All Domains</option>
              <option value="LB">Laboratory (LB)</option>
              <option value="AE">Adverse Events (AE)</option>
              <option value="EX">Exposure (EX)</option>
              <option value="DS">Disposition (DS)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubj}
              onChange={(e) => {
                setSelectedSubj(e.target.value);
                if (onSelectSubject) onSelectSubject(e.target.value);
              }}
              className="bg-slate-50 border border-slate-200 text-xs font-mono font-bold rounded-lg px-2.5 py-1 text-slate-900 focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.usubjid} value={s.usubjid}>
                  {s.usubjid}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Graph Visual Canvas / SVG */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 shadow-md overflow-hidden relative min-h-[500px]">
        {/* Canvas Header */}
        <div className="absolute top-4 left-6 z-10 flex items-center space-x-3 text-xs">
          <span className="text-slate-400">Target Subject: <strong className="text-white font-mono">{selectedSubj}</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Site: <strong className="text-teal-400 font-mono">{activeSubject?.site || "S07"}</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Treatment: <strong className="text-slate-200">{activeSubject?.arm || "AT-042 100mg"}</strong></span>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-6 z-10 flex flex-wrap gap-3 text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
            <span>Subject</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Visit</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
            <span>Lab (LB)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Adverse Event (AE)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Exposure (EX)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Disposition (DS)</span>
          </div>
        </div>

        {/* SVG Render */}
        <svg className="w-full h-[460px]" viewBox="0 0 700 420">
          {/* Edges from Subject to Visits */}
          <line x1="300" y1="200" x2="160" y2="120" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="300" y1="200" x2="140" y2="220" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="300" y1="200" x2="220" y2="310" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />
          <line x1="300" y1="200" x2="440" y2="120" stroke="#0d9488" strokeWidth="2.5" />
          <line x1="300" y1="200" x2="460" y2="250" stroke="#334155" strokeWidth="2" strokeDasharray="4 2" />

          {/* Edges from Visits to Labs */}
          <line x1="440" y1="120" x2="550" y2="60" stroke="#0d9488" strokeWidth="1.5" />
          <line x1="440" y1="120" x2="580" y2="140" stroke="#0d9488" strokeWidth="1.5" />
          <line x1="440" y1="120" x2="480" y2="40" stroke="#0d9488" strokeWidth="1.5" />

          {/* Edge to AE */}
          <line x1="300" y1="200" x2="380" y2="340" stroke="#e11d48" strokeWidth="2" />
          {/* Edge to DS */}
          <line x1="300" y1="200" x2="460" y2="340" stroke="#9333ea" strokeWidth="2" />
          {/* Edge to EX */}
          <line x1="220" y1="310" x2="100" y2="300" stroke="#d97706" strokeWidth="1.5" />

          {/* Nodes */}
          {visibleEntities.map((e) => (
            <g key={e.id} className="cursor-pointer transition-transform hover:scale-110">
              <circle
                cx={e.x}
                cy={e.y}
                r={e.size}
                fill={e.color}
                stroke="#ffffff"
                strokeWidth="2"
                opacity={0.9}
              />
              <text
                x={e.x}
                y={e.y + e.size + 14}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {e.label}
              </text>
              {e.note && (
                <text
                  x={e.x}
                  y={e.y - e.size - 4}
                  textAnchor="middle"
                  fill="#34d399"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {e.note}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
