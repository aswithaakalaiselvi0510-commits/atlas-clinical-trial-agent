import React, { useState, useEffect } from "react";
import { 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  FileSearch, 
  Sparkles,
  Calculator,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Bookmark,
  BookmarkCheck
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { Question, Answer, RecordRef } from "../types";
import { 
  db, 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy 
} from "../lib/firebase";

interface AskAtlasViewProps {
  onAsk: (q: Question) => Promise<Answer | null>;
  loading: boolean;
  onInspectRecord?: (ref: RecordRef) => void;
  onOpenAiAssistantWithContext?: (answer: Answer) => void;
  user: FirebaseUser | null;
}

const BENCHMARK_QUESTIONS: Array<{ id: string; category: string; text: string; label: string }> = [
  {
    id: "Q01",
    category: "FINDING",
    label: "Potential Hy's Law Cases",
    text: "Which subjects meet the potential Hy's law criteria?",
  },
  {
    id: "Q02",
    category: "COUNT",
    label: "AE Discontinuations at S07",
    text: "How many subjects at site S07 discontinued due to an adverse event?",
  },
  {
    id: "Q03",
    category: "LOOKUP",
    label: "042-S05-003 ±7d from WEEK8",
    text: "List the laboratory and adverse-event records for 042-S05-003 within 7 days of the WEEK8 visit.",
  },
  {
    id: "Q04",
    category: "TRAP",
    label: "Wrong Dose at S01 (Trap)",
    text: "Which subjects at site S01 received a wrong dose?",
  },
  {
    id: "Q05",
    category: "COUNT",
    label: "Total Subjects Enrolled",
    text: "How many subjects were enrolled across all sites?",
  },
  {
    id: "Q06",
    category: "FINDING",
    label: "Severe Adverse Events",
    text: "Which subjects had a severe adverse event (GRADE 3 or higher) during the treatment period?",
  },
  {
    id: "Q07",
    category: "LOOKUP",
    label: "042-S07-001 Concomitant Meds",
    text: "List all concomitant medications for subject 042-S07-001 started after baseline.",
  },
  {
    id: "Q08",
    category: "FINDING",
    label: "Site S03 ALT > 3x ULN",
    text: "Which subjects at site S03 had an ALT elevation greater than 3x ULN?",
  },
  {
    id: "Q09",
    category: "COUNT",
    label: "Core Period Completers",
    text: "How many subjects completed the study through the WEEK12 visit?",
  },
  {
    id: "Q10",
    category: "TRAP",
    label: "Prohibited Meds at S02 (Trap)",
    text: "Which subjects at site S02 had a protocol violation for taking prohibited medication?",
  },
];

export const AskAtlasView: React.FC<AskAtlasViewProps> = ({
  onAsk,
  loading,
  onInspectRecord,
  onOpenAiAssistantWithContext,
  user,
}) => {
  const [inputText, setInputText] = useState("Which subjects meet the potential Hy's law criteria?");
  const [currentAnswer, setCurrentAnswer] = useState<Answer | null>(null);
  const [activeChip, setActiveChip] = useState("Q01");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedQueries, setSavedQueries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setSavedQueries([]);
      return;
    }

    const savedRef = collection(db, "users", user.uid, "saved_queries");
    const q = query(savedRef, orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setSavedQueries(items);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveToFirestore = async () => {
    if (!user || !currentAnswer || isSaving) return;
    setIsSaving(true);
    try {
      const savedRef = collection(db, "users", user.uid, "saved_queries");
      await addDoc(savedRef, {
        question_id: currentAnswer.question_id || "ATLAS-RESULT",
        question: currentAnswer.question,
        category: currentAnswer.category,
        answer: currentAnswer.answer,
        evidenceCount: currentAnswer.evidence?.length || 0,
        explanation: currentAnswer.explanation,
        timestamp: serverTimestamp(),
      });
      setIsSaved(true);
    } catch (err) {
      console.error("Failed to save query to Firestore:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const matchedChip = BENCHMARK_QUESTIONS.find((b) => b.text.toLowerCase() === inputText.trim().toLowerCase());
    const res = await onAsk({
      question_id: matchedChip ? matchedChip.id : "Q-USER",
      question: inputText.trim(),
      category: matchedChip?.category || "",
    });
    if (res) {
      setCurrentAnswer(res);
    }
  };

  const handleSelectBenchmark = (item: typeof BENCHMARK_QUESTIONS[0]) => {
    setActiveChip(item.id);
    setInputText(item.text);
    onAsk({
      question_id: item.id,
      question: item.text,
      category: item.category,
    }).then((res) => {
      if (res) setCurrentAnswer(res);
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-2">
          <FileSearch className="w-5 h-5 text-teal-600" />
          <h2>Clinical Query Console</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Deterministic natural-language queries translated to verified graph rules and arithmetic proofs.
        </p>

        {/* Benchmark Chips */}
        <div className="mb-4">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
            Public Benchmark Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {BENCHMARK_QUESTIONS.map((item) => {
              const isSelected = activeChip === item.id;
              const isTrap = item.category === "TRAP";
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectBenchmark(item)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : isTrap
                      ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    isTrap ? "bg-amber-200 text-amber-900" : isSelected ? "bg-teal-500 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {item.category}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="input-clinical-query"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Which subjects meet the potential Hy's law criteria?"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
          <button
            id="btn-ask-atlas"
            type="submit"
            disabled={loading || !inputText.trim()}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm rounded-lg shadow transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin text-white">⟳</span>
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>ASK ATLAS</span>
          </button>
        </form>
      </div>

      {/* Answer & Proof Section */}
      {currentAnswer && (
        <div id="atlas-answer-card" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                  currentAnswer.category === "TRAP"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : currentAnswer.category === "FINDING"
                    ? "bg-purple-100 text-purple-900 border border-purple-300"
                    : currentAnswer.category === "COUNT"
                    ? "bg-blue-100 text-blue-900 border border-blue-300"
                    : "bg-teal-100 text-teal-900 border border-teal-300"
                }`}>
                  {currentAnswer.category}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {currentAnswer.question_id || "ATLAS-RESULT"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-1">
                {currentAnswer.question}
              </h3>
            </div>

            {/* Metrics & Actions */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="font-semibold">Confidence: {(currentAnswer.confidence * 100).toFixed(0)}%</span>
              </div>
              {currentAnswer.execution_time_seconds !== undefined && (
                <div className="flex items-center space-x-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono">{(currentAnswer.execution_time_seconds * 1000).toFixed(2)}ms</span>
                </div>
              )}
              {user && (
                <button
                  onClick={handleSaveToFirestore}
                  disabled={isSaving || isSaved}
                  className={`px-3 py-1 rounded border text-xs font-semibold flex items-center space-x-1 transition-colors ${
                    isSaved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                  }`}
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isSaving ? "Saving..." : "Save Finding"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Answer Display */}
          <div className="p-6">
            <div className="mb-6">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Verified Clinical Result:
              </span>

              {/* Case 1: TRAP / Empty Result */}
              {Array.isArray(currentAnswer.answer) && currentAnswer.answer.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      No verified matching records found in study data.
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      {currentAnswer.explanation || "All domain records satisfy protocol standards. Zero deviations or errors identified."}
                    </p>
                    <div className="mt-2 inline-flex items-center text-xs font-mono bg-slate-200/80 px-2 py-0.5 rounded text-slate-700">
                      answer = [] (Strict zero-hallucination compliance)
                    </div>
                  </div>
                </div>
              ) : currentAnswer.category === "COUNT" ? (
                /* Case 2: COUNT */
                <div className="p-6 bg-slate-900 text-white rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs text-teal-400 uppercase tracking-wider font-semibold">Total Verified Count</div>
                    <div className="text-4xl font-extrabold mt-1 text-white">
                      {typeof currentAnswer.answer === "number" ? currentAnswer.answer : JSON.stringify(currentAnswer.answer)}
                    </div>
                    <p className="text-xs text-slate-300 mt-2">
                      {currentAnswer.explanation}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 text-2xl font-bold">
                    #
                  </div>
                </div>
              ) : Array.isArray(currentAnswer.answer) && typeof currentAnswer.answer[0] === "string" ? (
                /* Case 3: FINDING with Subject IDs */
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-600 mb-2 font-medium">
                    Qualifying Subjects ({currentAnswer.answer.length} total):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentAnswer.answer.map((subjId: string) => (
                      <span
                        key={subjId}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-mono font-bold bg-white text-slate-900 border border-slate-300 shadow-sm"
                      >
                        {subjId}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-3">
                    {currentAnswer.explanation}
                  </p>
                </div>
              ) : (
                /* Case 4: Structured record list */
                <div className="space-y-2">
                  <p className="text-xs text-slate-700 mb-2">
                    {currentAnswer.explanation}
                  </p>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Domain</th>
                          <th className="p-2.5">USUBJID</th>
                          <th className="p-2.5">Sequence</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(Array.isArray(currentAnswer.answer) ? currentAnswer.answer : []).map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-teal-700">{row.domain || "--"}</td>
                            <td className="p-2.5 font-mono">{row.usubjid || "--"}</td>
                            <td className="p-2.5 font-mono">{row.sequence ?? "--"}</td>
                            <td className="p-2.5">{row.date || "--"}</td>
                            <td className="p-2.5 text-slate-600">{row.value || row.reason || JSON.stringify(row)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Evidence & Proof Cards */}
            {currentAnswer.evidence && currentAnswer.evidence.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-4 h-4 text-teal-600" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Deterministic Supporting Evidence ({currentAnswer.evidence.length} RecordRefs)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    100% Traceable Source Records
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentAnswer.evidence.map((ref: RecordRef, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-400 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-900 text-white">
                            {ref.domain}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {ref.usubjid}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            seq {ref.sequence}
                          </span>
                        </div>
                        {ref.date && (
                          <span className="text-xs text-slate-500">{ref.date}</span>
                        )}
                      </div>

                      {/* Values & Calculation */}
                      <div className="space-y-1.5 text-xs">
                        {ref.test && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Test Code:</span>
                            <span className="font-semibold text-slate-800">{ref.test}</span>
                          </div>
                        )}
                        {ref.value && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Original Result:</span>
                            <span className="font-mono font-medium text-slate-800">
                              {ref.value} {ref.unit || ""}
                            </span>
                          </div>
                        )}
                        {ref.normalized_value && ref.normalized_value !== ref.value && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Normalized Value:</span>
                            <span className="font-mono font-semibold text-teal-700">
                              {ref.normalized_value} {ref.normalized_unit || ""}
                            </span>
                          </div>
                        )}
                        {ref.reference_range && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Reference Limit:</span>
                            <span className="font-mono text-slate-600">{ref.reference_range}</span>
                          </div>
                        )}
                        {ref.calculation && (
                          <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200 font-mono text-emerald-800 text-xs">
                            <div className="font-semibold text-[10px] text-emerald-600 uppercase">Arithmetic Proof:</div>
                            {ref.calculation}
                          </div>
                        )}
                        {ref.reason && !ref.calculation && (
                          <div className="text-slate-600 mt-1 italic">
                            {ref.reason}
                          </div>
                        )}
                      </div>

                      {onInspectRecord && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                          <button
                            onClick={() => onInspectRecord(ref)}
                            className="text-xs text-teal-700 hover:text-teal-900 font-medium inline-flex items-center space-x-1"
                          >
                            <span>Inspect Raw Record</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ask Gemini to Explain */}
            {onOpenAiAssistantWithContext && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Need clinical or protocol context for this finding?
                </span>
                <button
                  onClick={() => onOpenAiAssistantWithContext(currentAnswer)}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Explain with AI Clinical Co-Pilot</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
