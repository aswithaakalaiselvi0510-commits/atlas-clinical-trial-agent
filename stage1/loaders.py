import csv
import os
from typing import Dict, List, Any

def safe_load_csv(filepath: str) -> List[Dict[str, str]]:
    """Loads CSV file safely, skipping malformed rows and trimming keys/values."""
    if not os.path.exists(filepath):
        return []
    records = []
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return []
        
        cleaned_header = [col.strip() for col in header]
        for row in reader:
            if not row or not any(field.strip() for field in row):
                continue  # skip completely blank lines
            # If row length doesn't match header, pad or truncate safely
            if len(row) < len(cleaned_header):
                row = row + [""] * (len(cleaned_header) - len(row))
            row_dict = {cleaned_header[i]: row[i].strip() for i in range(len(cleaned_header))}
            records.append(row_dict)
    return records

def load_study_data(data_dir: str) -> Dict[str, List[Dict[str, str]]]:
    """Loads all 9 study tables and reference ranges from data directory."""
    files_map = {
        "demographics": "demographics.csv",
        "visits": "visits.csv",
        "labs": "labs.csv",
        "adverse_events": "adverse_events.csv",
        "dosing": "dosing.csv",
        "medications": "medications.csv",
        "medical_history": "medical_history.csv",
        "disposition": "disposition.csv",
        "vital_signs": "vital_signs.csv",
        "reference_ranges": "reference_ranges.csv",
    }
    loaded = {}
    for key, filename in files_map.items():
        path = os.path.join(data_dir, filename)
        loaded[key] = safe_load_csv(path)
    return loaded

def load_documents(doc_dir: str) -> Dict[str, str]:
    """Reads protocol and laboratory manual documents."""
    docs = {}
    if not os.path.exists(doc_dir):
        return docs
    for filename in os.listdir(doc_dir):
        path = os.path.join(doc_dir, filename)
        if os.path.isfile(path):
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                docs[filename] = f.read()
    return docs
