import os
import time
from typing import Dict, List, Any, Optional, Tuple
from stage1.loaders import load_study_data, load_documents
from stage1.normalization import parse_date, parse_lab_result, normalize_lab_unit
from stage1.rules import ReferenceRangeEngine

class StudyGraph:
    """Connected in-memory clinical trial study graph and indexing engine."""
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.doc_dir = os.path.join(os.path.dirname(data_dir) if os.path.dirname(data_dir) else ".", "documents")
        if not os.path.exists(self.doc_dir):
            self.doc_dir = "documents"
        
        # State tracking
        self.is_built = False
        self.build_stats = {}
        self.subjects: Dict[str, Dict[str, Any]] = {}
        self.records_by_key: Dict[Tuple[str, str, int], Dict[str, Any]] = {}
        self.labs_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.ae_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.visits_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.disposition_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.dosing_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.meds_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.history_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.vitals_by_subject: Dict[str, List[Dict[str, Any]]] = {}
        self.range_engine: Optional[ReferenceRangeEngine] = None
        self.documents: Dict[str, str] = {}
        self.nodes_count = 0
        self.edges_count = 0

    def build(self, cut: Optional[int] = None) -> Dict[str, Any]:
        """
        Reads study files, normalizes fields, builds relationships, generates indexes and statistics.
        Supports rebuilding (clears old derived state completely).
        """
        t0 = time.perf_counter()

        # Clear any prior state
        self.subjects.clear()
        self.records_by_key.clear()
        self.labs_by_subject.clear()
        self.ae_by_subject.clear()
        self.visits_by_subject.clear()
        self.disposition_by_subject.clear()
        self.dosing_by_subject.clear()
        self.meds_by_subject.clear()
        self.history_by_subject.clear()
        self.vitals_by_subject.clear()
        self.nodes_count = 0
        self.edges_count = 0

        # Load raw data and reference ranges
        data = load_study_data(self.data_dir)
        self.documents = load_documents(self.doc_dir)
        self.range_engine = ReferenceRangeEngine(data.get("reference_ranges", []))

        # Ingest Demographics (DM)
        raw_dm = data.get("demographics", [])
        dm_by_subj = {}
        subj_order = []
        for r in raw_dm:
            usubjid = r.get("USUBJID", "").strip()
            if not usubjid:
                continue
            # Deduplicate subjects in case same subject is enrolled or listed multiple times
            if usubjid not in dm_by_subj:
                dm_by_subj[usubjid] = r
                subj_order.append(usubjid)

        # Apply cut if specified (cut restricts count of subjects ingested)
        if cut is not None and cut > 0:
            subj_order = subj_order[:cut]
            dm_by_subj = {s: dm_by_subj[s] for s in subj_order}

        # Initialize subject data structures
        for usubjid in subj_order:
            self.subjects[usubjid] = {
                "demographics": dm_by_subj[usubjid],
                "visits": [],
                "labs": [],
                "adverse_events": [],
                "dosing": [],
                "medications": [],
                "medical_history": [],
                "disposition": [],
                "vital_signs": [],
            }
            self.labs_by_subject[usubjid] = []
            self.ae_by_subject[usubjid] = []
            self.visits_by_subject[usubjid] = []
            self.disposition_by_subject[usubjid] = []
            self.dosing_by_subject[usubjid] = []
            self.meds_by_subject[usubjid] = []
            self.history_by_subject[usubjid] = []
            self.vitals_by_subject[usubjid] = []

            # 1 node for subject
            self.nodes_count += 1

            # Store DM record in records_by_key as sequence 1
            self.records_by_key[("DM", usubjid, 1)] = dm_by_subj[usubjid]

        # Ingest Visits (SV)
        for r in data.get("visits", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq = int(r.get("VISITNUM", "1") or "1")
            r_copy = dict(r)
            r_copy["parsed_date"] = parse_date(r.get("SVDAT"))
            self.visits_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["visits"].append(r_copy)
            self.records_by_key[("SV", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> Visit

        # Ingest Labs (LB)
        for r in data.get("labs", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("LBSEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            test_cd = r.get("LBTESTCD", "").strip().upper()
            raw_val = r.get("LBORRES", "")
            raw_unit = r.get("LBORRESU", "")
            lab_source = r.get("LAB", "CENTRAL")

            val_float, raw_str, is_num = parse_lab_result(raw_val)
            norm_val, norm_unit, conv_note = normalize_lab_unit(test_cd, val_float, raw_unit)
            uln = self.range_engine.get_uln(test_cd, norm_unit or raw_unit, lab_source)

            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_date"] = parse_date(r.get("LBDAT"))
            r_copy["val_float"] = val_float
            r_copy["raw_str"] = raw_str
            r_copy["is_num"] = is_num
            r_copy["norm_val"] = norm_val
            r_copy["norm_unit"] = norm_unit
            r_copy["conv_note"] = conv_note
            r_copy["uln"] = uln

            self.labs_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["labs"].append(r_copy)
            self.records_by_key[("LB", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject/Visit -> Lab

        # Ingest Adverse Events (AE)
        for r in data.get("adverse_events", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("AESEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_stdate"] = parse_date(r.get("AESTDAT"))
            r_copy["parsed_endate"] = parse_date(r.get("AEENDAT"))
            self.ae_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["adverse_events"].append(r_copy)
            self.records_by_key[("AE", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> AE

        # Ingest Dosing (EX)
        for r in data.get("dosing", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("EXSEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_date"] = parse_date(r.get("EXDAT"))
            self.dosing_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["dosing"].append(r_copy)
            self.records_by_key[("EX", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> Dose

        # Ingest Medications (CM)
        for r in data.get("medications", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("CMSEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_stdate"] = parse_date(r.get("CMSTDAT"))
            self.meds_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["medications"].append(r_copy)
            self.records_by_key[("CM", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> Medication

        # Ingest Medical History (MH)
        for r in data.get("medical_history", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("MHSEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_stdate"] = parse_date(r.get("MHSTDAT"))
            self.history_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["medical_history"].append(r_copy)
            self.records_by_key[("MH", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> History

        # Ingest Disposition (DS)
        for r in data.get("disposition", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("DSSEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_date"] = parse_date(r.get("DSSTDAT"))
            self.disposition_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["disposition"].append(r_copy)
            self.records_by_key[("DS", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> Disposition

        # Ingest Vital Signs (VS)
        for r in data.get("vital_signs", []):
            usubjid = r.get("USUBJID", "").strip()
            if usubjid not in self.subjects:
                continue
            seq_str = r.get("VSSEQ", "").strip()
            if not seq_str.isdigit():
                continue
            seq = int(seq_str)
            r_copy = dict(r)
            r_copy["seq"] = seq
            r_copy["parsed_date"] = parse_date(r.get("VSDAT"))
            self.vitals_by_subject[usubjid].append(r_copy)
            self.subjects[usubjid]["vital_signs"].append(r_copy)
            self.records_by_key[("VS", usubjid, seq)] = r_copy
            self.nodes_count += 1
            self.edges_count += 1  # Subject -> Vitals

        build_time = round(time.perf_counter() - t0, 5)
        self.is_built = True
        self.build_stats = {
            "nodes": self.nodes_count,
            "edges": self.edges_count,
            "subjects": len(self.subjects),
            "subjects_covered": len(self.subjects),
            "build_time": build_time,
            "build_time_seconds": build_time,
            "cut": cut,
            "domains": {
                "demographics": len(self.subjects),
                "visits": sum(len(v) for v in self.visits_by_subject.values()),
                "labs": sum(len(v) for v in self.labs_by_subject.values()),
                "adverse_events": sum(len(v) for v in self.ae_by_subject.values()),
                "dosing": sum(len(v) for v in self.dosing_by_subject.values()),
                "medications": sum(len(v) for v in self.meds_by_subject.values()),
                "medical_history": sum(len(v) for v in self.history_by_subject.values()),
                "disposition": sum(len(v) for v in self.disposition_by_subject.values()),
                "vital_signs": sum(len(v) for v in self.vitals_by_subject.values()),
            }
        }
        return self.build_stats

    def patient360(self, usubjid: str) -> Dict[str, Any]:
        """
        Returns the connected patient 360 profile for the subject.
        Every record remains traceable to its original source.
        """
        clean_id = usubjid.strip()
        if clean_id not in self.subjects:
            return {
                "found": False,
                "usubjid": clean_id,
                "error": f"Subject {clean_id} not found in study graph."
            }

        subj = self.subjects[clean_id]
        return {
            "found": True,
            "usubjid": clean_id,
            "demographics": subj["demographics"],
            "visits": subj["visits"],
            "labs": subj["labs"],
            "adverse_events": subj["adverse_events"],
            "dosing": subj["dosing"],
            "medications": subj["medications"],
            "medical_history": subj["medical_history"],
            "disposition": subj["disposition"],
            "vital_signs": subj["vital_signs"],
            "connected_records_count": (
                len(subj["visits"]) + len(subj["labs"]) + len(subj["adverse_events"]) +
                len(subj["dosing"]) + len(subj["medications"]) + len(subj["medical_history"]) +
                len(subj["disposition"]) + len(subj["vital_signs"])
            )
        }
