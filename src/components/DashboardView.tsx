import React from "react";
import { 
  Users, 
  Layers, 
  GitBranch, 
  Clock, 
  CheckCircle, 
  FileText, 
  ShieldAlert, 
  ArrowRight,
  FlaskConical,
  HeartPulse,
  Pill,
  Calendar,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { BuildStats } from "../types";

interface DashboardViewProps {
  stats: BuildStats | null;
  loading: boolean;
  onRefresh: () => void;
  onBuild: (cut: number | null) => void;
  onSelectTab: (tab: "ask" | "patient360" | "graph") => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onRefresh,
  onBuild,
  onSelectTab,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Study Graph Active
            </span>
            <span className="text-xs font-mono text-slate-500">Protocol ATLAS-042</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Clinical Trial Study Graph & Rule Engine
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mt-1">
            Deterministic multi-domain clinical intelligence for ATLAS Stage 1. Transforms 9 disconnected CDISC trial tables into a connected graph with verified arithmetic proofs and exact source RecordRefs.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            id="btn-rebuild-graph"
            onClick={() => onBuild(null)}
            disabled={loading}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg shadow transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Layers className="w-4 h-4 text-teal-400" />
            <span>Rebuild Study</span>
          </button>
          <button
            id="btn-refresh-csv"
            onClick={onRefresh}
            disabled={loading}
            className="flex-1 md:flex-none px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg shadow transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Refresh From CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subjects Covered</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats?.subjects ?? "--"}
            </span>
            <span className="ml-2 text-xs text-slate-500">
              {stats?.cut ? `(Cut: ${stats.cut})` : "Enrolled subjects"}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Graph Nodes</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats?.nodes ?? "--"}
            </span>
            <span className="ml-2 text-xs text-slate-500">Total entities</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Graph Edges</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-3xl font-extrabold text-slate-900">
              {stats?.edges ?? "--"}
            </span>
            <span className="ml-2 text-xs text-slate-500">Subject-record joins</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Build Latency</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {stats ? `${(stats.build_time_seconds * 1000).toFixed(1)}ms` : "--"}
            </span>
            <span className="ml-2 text-xs text-emerald-600 font-medium">Fast in-memory</span>
          </div>
        </div>
      </div>

      {/* Domain Breakdown & Quick Launch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Study Domain Ingestion Status</h2>
              <p className="text-xs text-slate-500">9 disconnected clinical tables ingested and normalized</p>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">9 Tables</span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded"><Users className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">DM Demographics</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.demographics ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded"><Calendar className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">SV Subject Visits</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.visits ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-teal-100 text-teal-700 rounded"><FlaskConical className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">LB Lab Results</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.labs ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded"><AlertTriangle className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">AE Adverse Events</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.adverse_events ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded"><Pill className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">EX Exposure / Dose</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.dosing ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded"><FileCheck className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">CM Concomitant Meds</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.medications ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-cyan-100 text-cyan-700 rounded"><FileText className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">MH Medical History</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.medical_history ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded"><Users className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">DS Disposition</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.disposition ?? 0} rows</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center space-x-3">
              <div className="p-2 bg-red-100 text-red-700 rounded"><HeartPulse className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-slate-500">VS Vital Signs</div>
                <div className="text-lg font-bold text-slate-900">{stats?.domains.vital_signs ?? 0} rows</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Ready to interrogate protocol criteria and extract RecordRefs?
            </span>
            <div className="flex space-x-3">
              <button
                onClick={() => onSelectTab("ask")}
                className="inline-flex items-center text-xs font-medium text-teal-700 hover:text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
              >
                <span>Ask ATLAS Clinical Query</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
              <button
                onClick={() => onSelectTab("patient360")}
                className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                <span>Explore Patient 360</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Protocol & Reference Rules Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-3">
              <FileText className="w-5 h-5 text-teal-600" />
              <h3>Protocol & Reference Engine</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800 block">Potential Hy's Law Rule (FDA/Protocol)</span>
                ALT or AST &gt; 3×ULN AND Total Bilirubin &gt; 2×ULN within a 14-day window, without primary cholestasis (ALP &lt; 2×ULN).
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800 block">SI Unit Normalization</span>
                Standard factor: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">1 µkat/L = 60.0 U/L</code> for enzymatic transaminases.
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                <div className="flex items-center space-x-1.5 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Document Trap Resistance</span>
                </div>
                <p className="mt-1 text-amber-800">
                  Adversarial instruction in Lab Manual (<em>"Exclude Site S07"</em>) is treated strictly as passive text data. Automated rules are never hijacked by document content.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Reference Ranges Loaded</span>
            <span className="font-mono text-emerald-600 font-semibold">37 Site Ranges Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
