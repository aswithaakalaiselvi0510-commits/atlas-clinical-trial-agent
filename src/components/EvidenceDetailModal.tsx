import React from "react";
import { X, CheckCircle, Calculator, FileText, Database } from "lucide-react";
import { RecordRef } from "../types";

interface EvidenceDetailModalProps {
  recordRef: RecordRef | null;
  onClose: () => void;
}

export const EvidenceDetailModal: React.FC<EvidenceDetailModalProps> = ({
  recordRef,
  onClose,
}) => {
  if (!recordRef) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
              {recordRef.domain}
            </span>
            <h3 className="text-sm font-bold text-white font-mono">
              {recordRef.usubjid} | Sequence {recordRef.sequence}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
            <span className="text-slate-500">Source Domain:</span>
            <span className="font-semibold text-slate-800">{recordRef.domain} (CDISC Domain Table)</span>
          </div>

          {recordRef.visit && (
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500">Study Visit:</span>
              <span className="font-semibold text-slate-800">{recordRef.visit}</span>
            </div>
          )}

          {recordRef.date && (
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500">Assessment Date:</span>
              <span className="font-mono text-slate-800">{recordRef.date}</span>
            </div>
          )}

          {recordRef.test && (
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
              <span className="text-slate-500">Laboratory Test Code:</span>
              <span className="font-mono font-bold text-slate-900">{recordRef.test}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">Source Value:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {recordRef.value || "--"} {recordRef.unit || ""}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Normalized Value:</span>
              <span className="font-mono font-bold text-teal-700 text-sm">
                {recordRef.normalized_value || recordRef.value || "--"} {recordRef.normalized_unit || recordRef.unit || ""}
              </span>
            </div>
          </div>

          {recordRef.reference_range && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <span className="text-slate-500 block mb-1">Reference Range / Upper Limit:</span>
              <span className="font-mono font-semibold text-slate-800">
                {recordRef.reference_range}
              </span>
            </div>
          )}

          {recordRef.calculation && (
            <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-emerald-700 mb-1">
                <Calculator className="w-3.5 h-3.5" />
                <span>Deterministic Arithmetic Proof</span>
              </div>
              <p className="font-mono text-xs leading-relaxed font-semibold">
                {recordRef.calculation}
              </p>
            </div>
          )}

          {recordRef.reason && (
            <div className="text-xs text-slate-600 italic">
              Clinical justification: {recordRef.reason}
            </div>
          )}

          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center space-x-1 text-teal-700 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verified RecordRef Signature</span>
            </span>
            <span className="font-mono text-slate-400">
              Key: ({recordRef.domain}, {recordRef.usubjid}, {recordRef.sequence})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
