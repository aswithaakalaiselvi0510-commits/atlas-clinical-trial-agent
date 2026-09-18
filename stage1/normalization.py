import re
from datetime import datetime, date
from typing import Optional, Tuple, Any

def parse_date(date_str: Any) -> Optional[date]:
    """Parse multiple clinical trial date formats safely without throwing exceptions."""
    if not date_str or not isinstance(date_str, str):
        return None
    s = date_str.strip()
    if not s or s.upper() in ("ND", "NA", "UNKNOWN", "NONE"):
        return None

    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d-%b-%Y",  # e.g., 30-Mar-2026
        "%d-%B-%Y",  # e.g., 30-March-2026
        "%d/%m/%Y",
        "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

def parse_lab_result(raw_val: Any) -> Tuple[Optional[float], str, bool]:
    """
    Parse laboratory result.
    Returns:
        (parsed_float, raw_string, is_numeric)
    Critical requirements:
        - '<5' does NOT become 0.
        - 'ND' does NOT become 0.
        - Comma decimals like '12,4' become 12.4.
    """
    if raw_val is None:
        return None, "", False
    s = str(raw_val).strip()
    if not s:
        return None, "", False

    # Check for < or > notations (e.g. <5, >100)
    if s.startswith("<") or s.startswith(">"):
        return None, s, False

    # Check for non-numeric terms like ND, NA, NEGATIVE
    if s.upper() in ("ND", "NA", "NOT DETECTED", "NEGATIVE", "POSITIVE"):
        return None, s, False

    # Replace European comma decimal with period if standard pattern e.g. "12,4"
    cleaned = s
    if re.match(r"^-?\d+,\d+$", s):
        cleaned = s.replace(",", ".")

    try:
        val = float(cleaned)
        return val, s, True
    except ValueError:
        return None, s, False

def normalize_lab_unit(test_code: str, val: Optional[float], unit: Optional[str]) -> Tuple[Optional[float], Optional[str], Optional[str]]:
    """
    Normalizes laboratory values to standard reference units.
    Standard rule:
        1 µkat/L = 60.0 U/L for ALT and AST transaminases.
        1 µmol/L = 1 / 17.1 mg/dL for BILI.
    Returns:
        (normalized_val, normalized_unit, conversion_note)
    """
    if val is None or unit is None:
        return val, unit, None

    u = unit.strip()
    u_lower = u.lower().replace("µ", "u").replace("micro", "u")

    # Transaminases: ALT / AST
    if test_code in ("ALT", "AST"):
        if "ukat" in u_lower:
            # 1 ukat/L = 60 U/L
            norm_val = round(val * 60.0, 4)
            return norm_val, "U/L", f"{val} {unit} × 60 = {norm_val} U/L"
        elif u_lower in ("u/l", "iu/l", "iu/ml"):
            return val, "U/L", None

    # Total Bilirubin: BILI
    if test_code == "BILI":
        if "umol" in u_lower:
            # 1 mg/dL = 17.1 umol/L -> val / 17.1
            norm_val = round(val / 17.1, 4)
            return norm_val, "mg/dL", f"{val} {unit} / 17.1 = {norm_val} mg/dL"
        elif u_lower in ("mg/dl", "mg/100ml"):
            return val, "mg/dL", None

    # Alkaline Phosphatase: ALP
    if test_code == "ALP":
        if "ukat" in u_lower:
            norm_val = round(val * 60.0, 4)
            return norm_val, "U/L", f"{val} {unit} × 60 = {norm_val} U/L"
        elif u_lower in ("u/l", "iu/l"):
            return val, "U/L", None

    return val, unit, None
