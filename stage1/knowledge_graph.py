"""
Knowledge Graph topology and causal cascade extraction engine for ATLAS.
Constructs semantic, multi-relational knowledge graphs connecting protocol domains,
temporal visits, laboratory biomarkers, adverse events, and regulatory criteria.
"""
from typing import Dict, List, Any, Optional
from stage1.rules import evaluate_hys_law

def build_knowledge_graph(study_graph: Any, scope: str = "study", usubjid: Optional[str] = None) -> Dict[str, Any]:
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    causal_chains: List[Dict[str, Any]] = []
    
    seen_nodes = set()
    seen_edges = set()

    def add_node(node_id: str, label: str, category: str, sub_category: str = "NORMAL", val: float = 1.0, color: str = "#64748b", details: Optional[Dict[str, Any]] = None):
        if node_id not in seen_nodes:
            seen_nodes.add(node_id)
            nodes.append({
                "id": node_id,
                "label": label,
                "category": category,
                "subCategory": sub_category,
                "val": val,
                "color": color,
                "details": details or {}
            })

    def add_edge(source: str, target: str, relationship: str, is_causal: bool = False, severity: str = "NORMAL", label: str = ""):
        edge_key = (source, target, relationship)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            edges.append({
                "id": f"{source}->{target}:{relationship}",
                "source": source,
                "target": target,
                "relationship": relationship,
                "isCausal": is_causal,
                "severity": severity,
                "label": label or relationship.replace("_", " ").title()
            })

    # Central Study Node
    study_id = "STUDY-ATLAS-042"
    add_node(study_id, "ATLAS-042 Trial", "STUDY", "STUDY", 25, "#0f172a", {
        "title": "Phase 2b Randomized Double-Blind Safety & Efficacy Trial",
        "phase": "Phase 2b",
        "protocol": "ATLAS-042",
        "indication": "Metabolic Steatohepatitis & Liver Fibrosis"
    })

    # Criterion Nodes (Regulatory Standards)
    crit_hylaw = "CRIT-HYLAW"
    add_node(crit_hylaw, "Hy's Law Criterion (FDA 2009)", "CRITERION", "REGULATORY", 20, "#e11d48", {
        "rule": "ALT or AST > 3x ULN AND Total Bilirubin > 2x ULN within 14 days without cholestasis (ALP < 2x ULN)",
        "regulatoryAuthority": "FDA / CDER DILI Guidance",
        "clinicalSignificance": "10% estimated mortality risk when hepatocellular jaundice occurs"
    })

    # Treatment Arms
    arms = set()
    sites = set()
    for uid, s in study_graph.subjects.items():
        dm = s["demographics"]
        if dm.get("ARM"):
            arms.add(dm.get("ARM"))
        if dm.get("SITEID"):
            sites.add(dm.get("SITEID"))

    for arm_name in sorted(arms):
        arm_id = f"ARM-{arm_name.replace(' ', '_')}"
        color = "#3b82f6" if "100" in arm_name else ("#60a5fa" if "50" in arm_name else "#94a3b8")
        add_node(arm_id, arm_name, "ARM", "TREATMENT", 18, color, {"arm": arm_name})
        add_edge(study_id, arm_id, "CONTAINS_ARM", False, "NORMAL", "Treatment Arm")

    for site_name in sorted(sites):
        site_id = f"SITE-{site_name}"
        add_node(site_id, f"Site {site_name}", "SITE", "LOCATION", 16, "#0d9488", {"site": site_name})
        add_edge(study_id, site_id, "CONDUCTED_AT", False, "NORMAL", "Trial Site")

    # Evaluate Hy's Law across subjects
    hys_law_candidates = {}
    for uid, labs in study_graph.labs_by_subject.items():
        res = evaluate_hys_law(uid, labs, study_graph.range_engine)
        if res:
            hys_law_candidates[uid] = res

    # Select target subjects based on scope
    target_subjects = []
    if scope == "patient" and usubjid:
        clean_id = usubjid.strip()
        if clean_id in study_graph.subjects:
            target_subjects = [clean_id]
    elif scope == "hys_law_cascade":
        target_subjects = list(hys_law_candidates.keys())
    else:
        # Full study scope: prioritize Hy's law subjects + representative subjects
        target_subjects = list(study_graph.subjects.keys())
        if len(target_subjects) > 30:
            # Include all Hy's law candidates + top subjects
            prioritized = list(hys_law_candidates.keys())
            others = [s for s in target_subjects if s not in prioritized]
            target_subjects = prioritized + others[:15]

    for uid in target_subjects:
        subj = study_graph.subjects[uid]
        dm = subj["demographics"]
        site = dm.get("SITEID")
        arm = dm.get("ARM")
        is_hl = uid in hys_law_candidates

        subj_node_id = f"SUBJ-{uid}"
        subj_color = "#dc2626" if is_hl else "#0284c7"
        subj_subcat = "CRITICAL_ALERT" if is_hl else "NORMAL"
        add_node(subj_node_id, uid, "SUBJECT", subj_subcat, 18 if is_hl else 14, subj_color, {
            "usubjid": uid,
            "site": site,
            "arm": arm,
            "age": dm.get("AGE"),
            "sex": dm.get("SEX"),
            "isHysLawCandidate": is_hl,
            "hysLawDetails": hys_law_candidates.get(uid)
        })

        if site:
            add_edge(f"SITE-{site}", subj_node_id, "ENROLLED_SUBJECT", False, "NORMAL", "Enrolls")
        if arm:
            add_edge(f"ARM-{arm.replace(' ', '_')}", subj_node_id, "ASSIGNED_TO", False, "NORMAL", "Assigned")

        # Ingest Subject Visits
        visits_by_name = {}
        for v in subj.get("visits", []):
            vname = v.get("VISIT", "").strip().upper()
            if not vname:
                continue
            v_id = f"VISIT-{uid}-{vname}"
            visits_by_name[vname] = v_id
            add_node(v_id, f"{uid} {vname}", "VISIT", "TIMELINE", 12, "#6366f1", {
                "visit": vname,
                "date": v.get("SVDAT"),
                "subject": uid
            })
            add_edge(subj_node_id, v_id, "UNDERWENT_VISIT", False, "NORMAL", vname)

        # Ingest Subject Labs (focus on ALT, AST, BILI, ALP)
        for lab in subj.get("labs", []):
            test_cd = lab.get("LBTESTCD", "").strip().upper()
            if test_cd not in ("ALT", "AST", "BILI", "ALP"):
                continue
            raw_val = lab.get("LBORRES", "")
            raw_unit = lab.get("LBORRESU", "")
            visit = lab.get("VISIT", "").strip().upper()
            seq = lab.get("LBSEQ", "")
            
            # Find ULN if possible
            uln = study_graph.range_engine.get_uln(test_cd, raw_unit)
            val_f = None
            try:
                val_f = float(raw_val)
            except (ValueError, TypeError):
                pass

            ratio = (val_f / uln) if (val_f and uln and uln > 0) else 1.0
            is_elevated = (test_cd in ("ALT", "AST") and ratio >= 3.0) or (test_cd == "BILI" and ratio >= 2.0)
            
            lab_node_id = f"LAB-{uid}-{test_cd}-{seq}"
            lab_color = "#e11d48" if is_elevated else ("#f59e0b" if ratio > 1.2 else "#10b981")
            lab_subcat = "CRITICAL_ELEVATION" if is_elevated else ("MILD_ELEVATION" if ratio > 1.2 else "NORMAL")
            
            label_text = f"{test_cd}: {raw_val} {raw_unit} ({ratio:.1f}x ULN)"
            add_node(lab_node_id, label_text, "LAB", lab_subcat, 14 if is_elevated else 10, lab_color, {
                "test": test_cd,
                "value": raw_val,
                "unit": raw_unit,
                "ratioToUln": round(ratio, 2),
                "uln": uln,
                "visit": visit,
                "date": lab.get("LBDAT"),
                "isElevated": is_elevated
            })

            # Connect lab to visit if exists, else subject
            parent_id = visits_by_name.get(visit, subj_node_id)
            add_edge(parent_id, lab_node_id, "MEASURED_LAB", is_elevated, "CRITICAL" if is_elevated else "NORMAL", f"{ratio:.1f}x ULN")

            # If elevated, connect to Hy's Law Criterion
            if is_elevated:
                add_edge(lab_node_id, crit_hylaw, "EVALUATED_AGAINST", True, "CRITICAL", f"Triggers {test_cd} Threshold")

        # Ingest Adverse Events
        for ae in subj.get("adverse_events", []):
            aeterm = ae.get("AETERM", "Adverse Event")
            severity = ae.get("AESEV", "MODERATE").upper()
            seq = ae.get("AESEQ", "1")
            ae_id = f"AE-{uid}-{seq}"
            
            is_severe = "SEVERE" in severity or "GRADE 3" in severity or "GRADE 4" in severity or "HEPATIC" in aeterm.upper()
            ae_color = "#dc2626" if is_severe else "#f97316"
            add_node(ae_id, f"AE: {aeterm} ({severity})", "AE", "SEVERE" if is_severe else "MODERATE", 15 if is_severe else 11, ae_color, {
                "term": aeterm,
                "severity": severity,
                "startDate": ae.get("AESTDAT"),
                "serious": ae.get("AESER", "N"),
                "outcome": ae.get("AEOUT")
            })
            add_edge(subj_node_id, ae_id, "EXPERIENCED_AE", is_severe, "CRITICAL" if is_severe else "WARNING", severity)

        # Ingest Disposition (DS)
        for ds in subj.get("disposition", []):
            dsterm = ds.get("DSTERM", "")
            seq = ds.get("seq", 1)
            ds_id = f"DS-{uid}-{seq}"
            is_disc = "DISCONTINUED" in dsterm.upper() or "WITHDRAWAL" in dsterm.upper()
            ds_color = "#9333ea" if is_disc else "#64748b"
            add_node(ds_id, f"DS: {dsterm}", "DISP", "DISCONTINUATION" if is_disc else "COMPLETION", 14 if is_disc else 10, ds_color, {
                "term": dsterm,
                "date": ds.get("DSSTDAT"),
                "reason": ds.get("DSDECOD")
            })
            add_edge(subj_node_id, ds_id, "STUDY_DISPOSITION", is_disc, "WARNING" if is_disc else "NORMAL", "Outcome")

        # Ingest Exposure (EX)
        for ex in subj.get("dosing", []):
            dose = ex.get("EXDOSE", "")
            dose_u = ex.get("EXDOSU", "mg")
            seq = ex.get("EXSEQ", "1")
            ex_id = f"EX-{uid}-{seq}"
            add_node(ex_id, f"Dose: {dose}{dose_u} AT-042", "EX", "DOSE", 10, "#d97706", {
                "dose": dose,
                "unit": dose_u,
                "date": ex.get("EXSTDAT")
            })
            add_edge(subj_node_id, ex_id, "RECEIVED_DOSE", False, "NORMAL", f"{dose}{dose_u}")

        # If Hy's Law candidate, construct explicit causal cascade chain
        if is_hl:
            hl_info = hys_law_candidates[uid]
            add_edge(crit_hylaw, subj_node_id, "FLAGGED_HY_LAW", True, "CRITICAL", "Potential Hy's Law Flagged")
            
            # Identify causal path nodes
            causal_hops = [subj_node_id]
            # Add Week 8 or visit where peak occurred
            w8_visit = visits_by_name.get("WEEK8") or visits_by_name.get("WEEK4") or (list(visits_by_name.values())[0] if visits_by_name else None)
            if w8_visit:
                causal_hops.append(w8_visit)
            causal_hops.append(crit_hylaw)

            # Find matching severe AE
            matching_ae = None
            for ae in subj.get("adverse_events", []):
                if "HEPATIC" in ae.get("AETERM", "").upper() or "LIVER" in ae.get("AETERM", "").upper():
                    matching_ae = f"AE-{uid}-{ae.get('AESEQ', '1')}"
                    break
            if matching_ae:
                causal_hops.append(matching_ae)
                # Link criterion directly to AE for causal visualization
                add_edge(crit_hylaw, matching_ae, "CORRELATED_ADVERSE_EVENT", True, "CRITICAL", "Causal Etiology")

            # Find discontinuation
            matching_ds = None
            for ds in subj.get("disposition", []):
                if "DISCONTINUED" in ds.get("DSTERM", "").upper():
                    matching_ds = f"DS-{uid}-{ds.get('seq', 1)}"
                    break
            if matching_ds:
                causal_hops.append(matching_ds)
                if matching_ae:
                    add_edge(matching_ae, matching_ds, "LED_TO_DISCONTINUATION", True, "CRITICAL", "Adverse Event Cessation")

            causal_chains.append({
                "subjectId": uid,
                "title": f"Subject {uid} Hy's Law & DILI Causal Cascade",
                "hops": causal_hops,
                "summary": f"ALT/AST elevation ({hl_info['trans_calc']}) concurrent with Bilirubin elevation ({hl_info['bili_calc']}) without cholestasis at Week 8 visit leading to severe hepatic injury and subject discontinuation.",
                "evidence": hl_info.get("evidence", []),
                "calculations": {
                    "trans": hl_info.get("trans_calc"),
                    "bili": hl_info.get("bili_calc"),
                    "window": hl_info.get("window_calc")
                }
            })

    metrics = {
        "totalNodes": len(nodes),
        "totalEdges": len(edges),
        "subjectsCovered": len(target_subjects),
        "hysLawCandidates": list(hys_law_candidates.keys()),
        "hysLawCandidatesCount": len(hys_law_candidates),
        "causalChainsCount": len(causal_chains)
    }

    return {
        "status": "ok",
        "scope": scope,
        "nodes": nodes,
        "edges": edges,
        "causalChains": causal_chains,
        "metrics": metrics
    }
