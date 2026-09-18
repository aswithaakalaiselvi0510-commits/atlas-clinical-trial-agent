import React, { useState, useEffect } from "react";
import { 
  User, 
  FlaskConical, 
  AlertTriangle, 
  Calendar, 
  Pill, 
  FileCheck, 
  FileText, 
  HeartPulse, 
  Clock, 
  Search, 
  ChevronRight,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { Patient360, SubjectSummary, RecordRef } from "../types";
import { ClinicalReviewNotes } from "./ClinicalReviewNotes";

interface Patient360ViewProps {
  subjects: SubjectSummary[];
  onFetchPatient: (usubjid: string) => Promise<Patient360 | null>;
  loading: boolean;
  onInspectRecord?: (ref: RecordRef) => void;
  user: FirebaseUser | null;
}

export const Patient360View: React.FC<Patient360ViewProps> = ({
  subjects,
  onFetchPatient,
  loading,
  onInspectRecord,
  user,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("042-S07-001");
  const [patientData, setPatientData] = useState<Patient360 | null>(null);
  const [activeDomainTab, setActiveDomainTab] = useState<string>("labs");
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    if (selectedSubjectId) {
      onFetchPatient(selectedSubjectId).then((res) => {
        if (res) setPatientData(res);
      });
    }
  }, [selectedSubjectId]);

  const filteredSubjects = subjects.filter((s) =>
    s.usubjid.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (s.site && s.site.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (s.arm && s.arm.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
              <User className="w-5 h-5 text-teal-600" />
              <h2>Patient 360 Deep Clinical Viewer</h2>
            </div>
            <p className="text-xs text-slate-500">
              Complete longitudinal trajectory linking all 8 clinical domains across study visits.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Filter subjects..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            <select
              id="select-subject"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {filteredSubjects.map((s) => (
                <option key={s.usubjid} value={s.usubjid}>
                  {s.usubjid} ({s.site || "Site"} - {s.arm || "Arm"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Patient Profile & Demographics Card */}
      {patientData && patientData.found && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-mono font-bold text-lg">
                {patientData.usubjid.split("-").pop()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white font-mono">
                    {patientData.usubjid}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Site: {patientData.demographics?.SITEID || "--"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-1">
                  <span>Arm: <strong className="text-white">{patientData.demographics?.ARM || "--"}</strong></span>
                  <span>Age: <strong className="text-white">{patientData.demographics?.AGE || "--"} yrs</strong></span>
                  <span>Sex: <strong className="text-white">{patientData.demographics?.SEX || "--"}</strong></span>
                  <span>Enrolled: <strong className="text-white">{patientData.demographics?.ENRLDATE || "--"}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right flex items-center space-x-3">
              <div className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 text-xs text-slate-300">
                <span className="text-teal-400 font-bold">{patientData.connected_records_count ?? 0}</span> Connected Records
              </div>
            </div>
          </div>

          {/* Domain Tabs Navigation */}
          <div className="border-b border-slate-200 bg-slate-50 px-6 flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => setActiveDomainTab("labs")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "labs"
                  ? "border-teal-600 text-teal-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Laboratory Results ({patientData.labs?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveDomainTab("adverse_events")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "adverse_events"
                  ? "border-rose-600 text-rose-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Adverse Events ({patientData.adverse_events?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveDomainTab("visits")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "visits"
                  ? "border-indigo-600 text-indigo-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Subject Visits ({patientData.visits?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveDomainTab("dosing")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "dosing"
                  ? "border-amber-600 text-amber-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Exposure / Dosing ({patientData.dosing?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveDomainTab("medications")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "medications"
                  ? "border-emerald-600 text-emerald-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Concomitant Meds ({patientData.medications?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveDomainTab("disposition")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "disposition"
                  ? "border-purple-600 text-purple-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Disposition ({patientData.disposition?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveDomainTab("vital_signs")}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-1.5 border-b-2 ${
                activeDomainTab === "vital_signs"
                  ? "border-red-600 text-red-700 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Vital Signs ({patientData.vital_signs?.length || 0})</span>
            </button>
          </div>

          {/* Domain Tab Table Content */}
          <div className="p-6">
            {activeDomainTab === "labs" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Test Code</th>
                      <th className="p-2.5">Raw Value</th>
                      <th className="p-2.5">Raw Unit</th>
                      <th className="p-2.5">Normalized Value</th>
                      <th className="p-2.5">Normalized Unit</th>
                      <th className="p-2.5">ULN (High)</th>
                      <th className="p-2.5">Visit</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.labs || []).map((lb, idx) => {
                      const isHigh = lb.norm_val && lb.uln && lb.norm_val > lb.uln;
                      const is3xULN = lb.norm_val && lb.uln && lb.norm_val >= 3 * lb.uln;
                      return (
                        <tr key={idx} className={`hover:bg-slate-50 ${is3xULN ? "bg-rose-50/50" : isHigh ? "bg-amber-50/30" : ""}`}>
                          <td className="p-2.5 font-mono text-slate-500">{lb.raw?.LBSEQ}</td>
                          <td className="p-2.5 font-bold font-mono text-slate-900">{lb.LBTESTCD}</td>
                          <td className="p-2.5 font-mono">{lb.raw?.LBORRES}</td>
                          <td className="p-2.5 text-slate-500">{lb.raw?.LBORRESU}</td>
                          <td className="p-2.5 font-mono font-bold text-teal-800">
                            {lb.norm_val !== undefined && lb.norm_val !== null ? lb.norm_val : "--"}
                          </td>
                          <td className="p-2.5 text-slate-600">{lb.norm_unit || "--"}</td>
                          <td className="p-2.5 font-mono text-slate-500">
                            {lb.uln !== undefined && lb.uln !== null ? `${lb.uln} ${lb.norm_unit || ""}` : "--"}
                          </td>
                          <td className="p-2.5">{lb.VISIT || "--"}</td>
                          <td className="p-2.5">{lb.LBDTC || "--"}</td>
                          <td className="p-2.5 text-right">
                            {onInspectRecord && (
                              <button
                                onClick={() => onInspectRecord({
                                  domain: "LB",
                                  usubjid: patientData.usubjid,
                                  sequence: Number(lb.raw?.LBSEQ || 0),
                                  test: lb.LBTESTCD,
                                  value: lb.raw?.LBORRES,
                                  unit: lb.raw?.LBORRESU,
                                  normalized_value: String(lb.norm_val),
                                  normalized_unit: lb.norm_unit,
                                  visit: lb.VISIT,
                                  date: lb.LBDTC,
                                  calculation: lb.conv_note
                                })}
                                className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeDomainTab === "adverse_events" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Term (AETERM)</th>
                      <th className="p-2.5">Severity</th>
                      <th className="p-2.5">Serious (AESER)</th>
                      <th className="p-2.5">Causality (AEREL)</th>
                      <th className="p-2.5">Action Taken</th>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.adverse_events || []).map((ae, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{ae.raw?.AESEQ}</td>
                        <td className="p-2.5 font-bold text-slate-900">{ae.AETERM}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ae.AESEV === "SEVERE" || ae.AESEV === "GRADE 3"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-800"
                          }`}>
                            {ae.AESEV}
                          </span>
                        </td>
                        <td className="p-2.5">{ae.AESER || "N"}</td>
                        <td className="p-2.5 text-slate-700">{ae.AEREL || "--"}</td>
                        <td className="p-2.5 text-slate-700">{ae.AEACN || "--"}</td>
                        <td className="p-2.5">{ae.AESTDTC || "--"}</td>
                        <td className="p-2.5">{ae.AEENDTC || "Ongoing"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDomainTab === "visits" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Visit (VISIT)</th>
                      <th className="p-2.5">Visit Num</th>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.visits || []).map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{v.raw?.VISITNUM || idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{v.VISIT}</td>
                        <td className="p-2.5 font-mono">{v.VISITNUM}</td>
                        <td className="p-2.5">{v.SVSTDTC}</td>
                        <td className="p-2.5">{v.SVENDTC || v.SVSTDTC}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDomainTab === "dosing" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Treatment (EXTRT)</th>
                      <th className="p-2.5">Dose</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5">Visit</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Error Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.dosing || []).map((ex, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{ex.raw?.EXSEQ}</td>
                        <td className="p-2.5 font-bold text-slate-900">{ex.EXTRT}</td>
                        <td className="p-2.5 font-mono">{ex.EXDOSE}</td>
                        <td className="p-2.5 text-slate-600">{ex.EXDOSU}</td>
                        <td className="p-2.5">{ex.VISIT}</td>
                        <td className="p-2.5">{ex.EXSTDTC}</td>
                        <td className="p-2.5">
                          {ex.EXERR ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold text-[11px]">
                              {ex.EXERR}
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDomainTab === "medications" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Medication (CMTRT)</th>
                      <th className="p-2.5">Indication</th>
                      <th className="p-2.5">Start Date</th>
                      <th className="p-2.5">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.medications || []).map((cm, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{cm.raw?.CMSEQ}</td>
                        <td className="p-2.5 font-bold text-slate-900">{cm.CMTRT}</td>
                        <td className="p-2.5 text-slate-700">{cm.CMINDC || "--"}</td>
                        <td className="p-2.5">{cm.CMSTDTC}</td>
                        <td className="p-2.5">{cm.CMENDTC || "Ongoing"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDomainTab === "disposition" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Status (DSDECOD)</th>
                      <th className="p-2.5">Reason (DSTERM)</th>
                      <th className="p-2.5">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.disposition || []).map((ds, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{ds.raw?.DSSEQ}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ds.DSDECOD === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {ds.DSDECOD}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700">{ds.DSTERM || "--"}</td>
                        <td className="p-2.5">{ds.DSSTDTC}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeDomainTab === "vital_signs" && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Seq</th>
                      <th className="p-2.5">Test (VSTESTCD)</th>
                      <th className="p-2.5">Result</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5">Visit</th>
                      <th className="p-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(patientData.vital_signs || []).map((vs, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-500">{vs.raw?.VSSEQ}</td>
                        <td className="p-2.5 font-bold font-mono text-slate-900">{vs.VSTESTCD}</td>
                        <td className="p-2.5 font-mono">{vs.VSORRES}</td>
                        <td className="p-2.5 text-slate-500">{vs.VSORRESU}</td>
                        <td className="p-2.5">{vs.VISIT}</td>
                        <td className="p-2.5">{vs.VSDTC}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investigator Review Notes & Audit Trail (Firestore) */}
      <ClinicalReviewNotes user={user} subjectId={selectedSubjectId} />
    </div>
  );
};
