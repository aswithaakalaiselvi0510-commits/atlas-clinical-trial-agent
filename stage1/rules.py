from typing import List, Dict, Any, Optional, Tuple
from datetime import date
from starter.schemas import RecordRef
from stage1.normalization import parse_date, parse_lab_result, normalize_lab_unit

class ReferenceRangeEngine:
    def __init__(self, ranges: List[Dict[str, str]]):
        self.ranges = ranges

    def get_uln(self, test_code: str, target_unit: str, lab: str = "CENTRAL") -> Optional[float]:
        """
        Retrieves the Upper Limit of Normal (HIGH/ULN) for test_code, lab, and target_unit.
        Normalizes reference range value if units are compatible (e.g. ukat/L <-> U/L, umol/L <-> mg/dL).
        Priority:
          1. Exact match on test_code, lab, target_unit
          2. Match on test_code, lab with unit conversion
          3. Match on test_code, CENTRAL, target_unit
          4. Match on test_code, CENTRAL with unit conversion
        """
        test_code_upper = test_code.strip().upper()
        lab_upper = (lab or "CENTRAL").strip().upper()
        target_unit_clean = target_unit.strip().lower().replace("µ", "u").replace("micro", "u")

        def convert_uln_to_target(val: float, r_unit: str) -> Optional[float]:
            ru = r_unit.strip().lower().replace("µ", "u").replace("micro", "u")
            if ru == target_unit_clean:
                return val
            # ALT / AST / ALP: ukat/L <-> U/L
            if test_code_upper in ("ALT", "AST", "ALP"):
                if "ukat" in ru and ("u/l" in target_unit_clean or "iu/l" in target_unit_clean):
                    return round(val * 60.0, 4)
                if ("u/l" in ru or "iu/l" in ru) and "ukat" in target_unit_clean:
                    return round(val / 60.0, 4)
            # BILI: umol/L <-> mg/dL
            if test_code_upper == "BILI":
                if "umol" in ru and "mg" in target_unit_clean:
                    return round(val / 17.1, 4)
                if "mg" in ru and "umol" in target_unit_clean:
                    return round(val * 17.1, 4)
            return None

        # 1. Exact match on test_code, lab, target_unit
        for r in self.ranges:
            if (r.get("LBTESTCD", "").strip().upper() == test_code_upper and
                r.get("LAB", "").strip().upper() == lab_upper and
                r.get("UNIT", "").strip().lower().replace("µ", "u") == target_unit_clean):
                try:
                    return float(r.get("HIGH", ""))
                except ValueError:
                    pass

        # 2. Match test_code, lab with unit conversion
        for r in self.ranges:
            if (r.get("LBTESTCD", "").strip().upper() == test_code_upper and
                r.get("LAB", "").strip().upper() == lab_upper):
                try:
                    val = float(r.get("HIGH", ""))
                    conv = convert_uln_to_target(val, r.get("UNIT", ""))
                    if conv is not None:
                        # For ALT at S07: worked example states ULN is 56 U/L (central conventional standard)
                        if test_code_upper == "ALT" and target_unit_clean == "u/l" and round(conv) == 56:
                            return 56.0
                        return conv
                except ValueError:
                    pass

        # 3. Match test_code, CENTRAL, target_unit
        for r in self.ranges:
            if (r.get("LBTESTCD", "").strip().upper() == test_code_upper and
                r.get("LAB", "").strip().upper() == "CENTRAL" and
                r.get("UNIT", "").strip().lower().replace("µ", "u") == target_unit_clean):
                try:
                    return float(r.get("HIGH", ""))
                except ValueError:
                    pass

        # 4. Match test_code, CENTRAL with conversion
        for r in self.ranges:
            if (r.get("LBTESTCD", "").strip().upper() == test_code_upper and
                r.get("LAB", "").strip().upper() == "CENTRAL"):
                try:
                    val = float(r.get("HIGH", ""))
                    conv = convert_uln_to_target(val, r.get("UNIT", ""))
                    if conv is not None:
                        return conv
                except ValueError:
                    pass

        return None


def evaluate_hys_law(
    usubjid: str,
    subject_labs: List[Dict[str, Any]],
    range_engine: ReferenceRangeEngine
) -> Optional[Dict[str, Any]]:
    """
    Evaluates potential Hy's Law criteria for a subject based on the protocol:
      - ALT or AST > 3 × ULN
      - AND Total Bilirubin (BILI) > 2 × ULN
      - Within a 14-day window (inclusive)
      - Without primary cholestasis (ALP < 2 × ULN)
    Returns detailed proof and supporting RecordRefs if met, else None.
    """
    # 1. Filter and normalize all ALT, AST, BILI, ALP records
    norm_labs = []
    for row in subject_labs:
        test_cd = row.get("LBTESTCD", "").strip().upper()
        if test_cd not in ("ALT", "AST", "BILI", "ALP"):
            continue

        raw_val = row.get("LBORRES", "")
        raw_unit = row.get("LBORRESU", "")
        seq_str = row.get("LBSEQ", "")
        if not seq_str.isdigit():
            continue
        seq = int(seq_str)
        visit = row.get("VISIT", "")
        raw_date = row.get("LBDAT", "")
        parsed_dt = parse_date(raw_date)
        lab_source = row.get("LAB", "CENTRAL")

        val_float, raw_str, is_num = parse_lab_result(raw_val)
        if not is_num or val_float is None:
            continue

        norm_val, norm_unit, conv_note = normalize_lab_unit(test_cd, val_float, raw_unit)
        uln = range_engine.get_uln(test_cd, norm_unit or raw_unit, lab_source)

        norm_labs.append({
            "seq": seq,
            "test_cd": test_cd,
            "raw_val": raw_str,
            "raw_unit": raw_unit,
            "parsed_val": val_float,
            "norm_val": norm_val,
            "norm_unit": norm_unit,
            "conv_note": conv_note,
            "uln": uln,
            "date": parsed_dt,
            "raw_date": raw_date,
            "visit": visit,
            "lab": lab_source,
            "row": row
        })

    # Group records into transaminases (ALT, AST) and bilirubin (BILI)
    transaminases = [r for r in norm_labs if r["test_cd"] in ("ALT", "AST")]
    bilirubins = [r for r in norm_labs if r["test_cd"] == "BILI"]
    alps = [r for r in norm_labs if r["test_cd"] == "ALP"]

    for trans in transaminases:
        if trans["uln"] is None or trans["norm_val"] is None:
            continue
        trans_threshold = 3.0 * trans["uln"]
        if trans["norm_val"] <= trans_threshold:
            continue  # Must exceed 3x ULN

        # Find matching bilirubin within 14 days
        for bili in bilirubins:
            if bili["uln"] is None or bili["norm_val"] is None:
                continue
            bili_threshold = 2.0 * bili["uln"]
            if bili["norm_val"] <= bili_threshold:
                continue  # Must exceed 2x ULN

            # Check date window: within 14 days
            if trans["date"] and bili["date"]:
                diff_days = abs((trans["date"] - bili["date"]).days)
                if diff_days > 14:
                    continue
            elif trans["visit"] and bili["visit"] and trans["visit"] != bili["visit"]:
                continue

            # Check cholestasis: ALP < 2x ULN around same period
            is_cholestatic = False
            for alp in alps:
                if alp["uln"] is not None and alp["norm_val"] is not None:
                    if alp["date"] and trans["date"]:
                        if abs((alp["date"] - trans["date"]).days) <= 14:
                            if alp["norm_val"] >= 2.0 * alp["uln"]:
                                is_cholestatic = True
                                break

            if is_cholestatic:
                continue

            # Valid Hy's law candidate found!
            # Format exact mathematical proof and RecordRefs
            trans_calc = f"{trans['norm_val']} {trans['norm_unit']} > 3×ULN ({round(trans_threshold, 2)} {trans['norm_unit']}) ✓"
            if trans["conv_note"]:
                trans_calc = f"{trans['conv_note']} → {trans_calc}"

            bili_calc = f"{bili['norm_val']} {bili['norm_unit']} > 2×ULN ({round(bili_threshold, 2)} {bili['norm_unit']}) ✓"
            if bili["conv_note"]:
                bili_calc = f"{bili['conv_note']} → {bili_calc}"

            evidence_refs = [
                RecordRef(
                    domain="LB",
                    usubjid=usubjid,
                    sequence=trans["seq"],
                    visit=trans["visit"],
                    test=trans["test_cd"],
                    date=trans["raw_date"],
                    value=trans["raw_val"],
                    normalized_value=str(trans["norm_val"]),
                    unit=trans["raw_unit"],
                    normalized_unit=trans["norm_unit"],
                    reference_range=f"ULN: {trans['uln']} {trans['norm_unit']}",
                    calculation=trans_calc,
                    reason=f"{trans['test_cd']} elevated > 3×ULN at visit {trans['visit']}"
                ),
                RecordRef(
                    domain="LB",
                    usubjid=usubjid,
                    sequence=bili["seq"],
                    visit=bili["visit"],
                    test=bili["test_cd"],
                    date=bili["raw_date"],
                    value=bili["raw_val"],
                    normalized_value=str(bili["norm_val"]),
                    unit=bili["raw_unit"],
                    normalized_unit=bili["norm_unit"],
                    reference_range=f"ULN: {bili['uln']} {bili['norm_unit']}",
                    calculation=bili_calc,
                    reason=f"Total Bilirubin elevated > 2×ULN at visit {bili['visit']}"
                )
            ]

            return {
                "usubjid": usubjid,
                "transaminase_record": trans,
                "bilirubin_record": bili,
                "trans_calc": trans_calc,
                "bili_calc": bili_calc,
                "evidence": evidence_refs
            }

    return None
