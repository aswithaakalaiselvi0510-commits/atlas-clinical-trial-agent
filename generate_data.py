import csv
import os

os.makedirs("data", exist_ok=True)

# 1. Demographics
dm_rows = [
    ["USUBJID", "SUBJID", "SITEID", "AGE", "SEX", "ARM", "ENRLDATE"],
    ["042-S01-001", "001", "S01", "45", "M", "AT-042 100mg", "2026-01-10"],
    ["042-S01-002", "002", "S01", "52", "F", "Placebo", "2026-01-12"],
    ["042-S01-003", "003", "S01", "39", "M", "AT-042 100mg", "2026-01-15"],
    ["042-S02-001", "001", "S02", "58", "F", "AT-042 100mg", "2026-01-18"],
    ["042-S02-002", "002", "S02", "64", "M", "Placebo", "2026-01-20"],
    ["042-S03-001", "001", "S03", "41", "M", "AT-042 100mg", "2026-01-22"],
    ["042-S03-002", "002", "S03", "49", "F", "Placebo", "2026-01-25"],
    ["042-S03-003", "003", "S03", "55", "M", "AT-042 100mg", "2026-01-28"],
    ["042-S03-099", "099", "S03", "50", "F", "AT-042 100mg", "2026-02-01"],
    ["042-S03-099", "099", "S03", "50", "F", "AT-042 100mg", "2026-02-01"], # Intended duplicate subject row to test deduplication
    ["042-S04-001", "001", "S04", "62", "M", "Placebo", "2026-02-03"],
    ["042-S04-002", "002", "S04", "47", "F", "AT-042 100mg", "2026-02-05"],
    ["042-S05-001", "001", "S05", "38", "M", "Placebo", "2026-02-08"],
    ["042-S05-002", "002", "S05", "53", "F", "AT-042 100mg", "2026-02-10"],
    ["042-S05-003", "003", "S05", "66", "M", "AT-042 100mg", "2026-02-14"],
    ["042-S06-001", "001", "S06", "44", "F", "Placebo", "2026-02-16"],
    ["042-S06-002", "002", "S06", "59", "M", "AT-042 100mg", "2026-02-18"],
    ["042-S07-001", "001", "S07", "54", "M", "AT-042 100mg", "2026-02-02"],
    ["042-S07-002", "002", "S07", "48", "F", "Placebo", "2026-02-04"],
    ["042-S07-003", "003", "S07", "61", "M", "Placebo", "2026-02-06"],
    ["042-S07-004", "004", "S07", "52", "F", "AT-042 100mg", "2026-02-07"],
    ["042-S08-012", "012", "S08", "46", "F", "Placebo", "2026-02-12"],
    ["042-S08-013", "013", "S08", "51", "M", "Placebo", "2026-02-15"],
    ["042-S08-014", "014", "S08", "57", "M", "AT-042 100mg", "2026-02-20"],
]

with open("data/demographics.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(dm_rows)

# 2. Visits
sv_rows = [
    ["USUBJID", "VISIT", "VISITNUM", "SVDAT"],
    ["042-S01-001", "BASELINE", "1", "2026-01-10"],
    ["042-S01-001", "WEEK2", "2", "2026-01-24"],
    ["042-S01-001", "WEEK4", "3", "2026-02-07"],
    ["042-S01-001", "WEEK8", "4", "2026-03-07"],
    ["042-S01-001", "WEEK12", "5", "2026-04-04"],
    ["042-S01-002", "BASELINE", "1", "2026-01-12"],
    ["042-S01-002", "WEEK2", "2", "2026-01-26"],
    ["042-S01-002", "WEEK4", "3", "2026-02-09"],
    ["042-S01-002", "WEEK8", "4", "2026-03-09"],
    ["042-S01-002", "WEEK12", "5", "2026-04-06"],
    ["042-S01-003", "BASELINE", "1", "2026-01-15"],
    ["042-S01-003", "WEEK2", "2", "2026-01-29"],
    ["042-S01-003", "WEEK4", "3", "2026-02-12"],
    ["042-S01-003", "WEEK8", "4", "2026-03-12"],
    ["042-S01-003", "WEEK12", "5", "2026-04-09"],
    ["042-S05-003", "BASELINE", "1", "2026-02-14"],
    ["042-S05-003", "WEEK2", "2", "2026-02-28"],
    ["042-S05-003", "WEEK4", "3", "2026-03-14"],
    ["042-S05-003", "WEEK8", "4", "2026-04-12"], # Key test visit date
    ["042-S07-001", "BASELINE", "1", "2026-02-02"],
    ["042-S07-001", "WEEK2", "2", "2026-02-16"],
    ["042-S07-001", "WEEK4", "3", "2026-03-02"],
    ["042-S07-001", "WEEK8", "4", "2026-03-30"], # Key worked example visit date
    ["042-S07-002", "BASELINE", "1", "2026-02-04"],
    ["042-S07-002", "WEEK2", "2", "2026-02-18"],
    ["042-S07-002", "WEEK4", "3", "2026-03-04"],
    ["042-S07-002", "WEEK8", "4", "2026-04-01"],
    ["042-S07-002", "WEEK12", "5", "2026-04-29"],
    ["042-S07-003", "BASELINE", "1", "2026-02-06"],
    ["042-S07-003", "WEEK2", "2", "2026-02-20"],
    ["042-S07-003", "WEEK4", "3", "2026-03-06"],
    ["042-S07-003", "WEEK8", "4", "2026-04-03"],
    ["042-S07-003", "WEEK12", "5", "2026-05-01"],
    ["042-S07-004", "BASELINE", "1", "2026-02-07"],
    ["042-S07-004", "WEEK2", "2", "2026-02-21"],
    ["042-S07-004", "WEEK4", "3", "2026-03-05"],
    ["042-S08-014", "BASELINE", "1", "2026-02-20"],
    ["042-S08-014", "WEEK2", "2", "2026-03-06"],
    ["042-S08-014", "WEEK4", "3", "2026-03-20"],
    ["042-S08-014", "WEEK8", "4", "2026-05-02"],
]

with open("data/visits.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(sv_rows)

# 3. Labs
lb_rows = [
    ["USUBJID", "LBSEQ", "VISIT", "LBDAT", "LBTESTCD", "LBTEST", "LBORRES", "LBORRESU", "LAB"],
    # Baseline normal labs
    ["042-S01-001", "1", "BASELINE", "2026-01-10", "ALT", "Alanine Aminotransferase", "22.0", "U/L", "CENTRAL"],
    ["042-S01-001", "2", "BASELINE", "2026-01-10", "AST", "Aspartate Aminotransferase", "20.0", "U/L", "CENTRAL"],
    ["042-S01-001", "3", "BASELINE", "2026-01-10", "BILI", "Bilirubin Total", "0.6", "mg/dL", "CENTRAL"],
    ["042-S01-001", "4", "BASELINE", "2026-01-10", "ALP", "Alkaline Phosphatase", "65.0", "U/L", "CENTRAL"],
    
    # Comma decimal and non-numeric value test records
    ["042-S02-001", "10", "WEEK2", "2026-02-15", "BILI", "Bilirubin Total", "<5", "mg/dL", "CENTRAL"],
    ["042-S02-002", "12", "WEEK4", "2026-03-01", "ALT", "Alanine Aminotransferase", "ND", "U/L", "CENTRAL"],
    ["042-S03-001", "15", "WEEK4", "2026-03-10", "ALT", "Alanine Aminotransferase", "12,4", "U/L", "CENTRAL"],
    
    # Malformed row with empty columns that parser must safely ignore without crashing
    ["042-S03-002", "", "", "", "", "", "", "", ""],

    # Subject 042-S05-003 WEEK8 (Hy's Law candidate 1)
    ["042-S05-003", "16", "BASELINE", "2026-02-14", "ALT", "Alanine Aminotransferase", "28.0", "U/L", "CENTRAL"],
    ["042-S05-003", "17", "BASELINE", "2026-02-14", "BILI", "Bilirubin Total", "0.7", "mg/dL", "CENTRAL"],
    ["042-S05-003", "18", "WEEK8", "2026-04-12", "ALT", "Alanine Aminotransferase", "195.0", "U/L", "CENTRAL"],
    ["042-S05-003", "19", "WEEK8", "2026-04-12", "BILI", "Bilirubin Total", "3.10", "mg/dL", "CENTRAL"],
    ["042-S05-003", "20", "WEEK8", "2026-04-12", "ALP", "Alkaline Phosphatase", "95.0", "U/L", "CENTRAL"],
    ["042-S05-003", "21", "WEEK8", "2026-04-15", "AST", "Aspartate Aminotransferase", "145.0", "U/L", "CENTRAL"],

    # Subject 042-S07-001 WEEK8 (Hy's Law worked example)
    ["042-S07-001", "21", "BASELINE", "2026-02-02", "ALT", "Alanine Aminotransferase", "0.45", "ukat/L", "S07"],
    ["042-S07-001", "22", "BASELINE", "2026-02-02", "BILI", "Bilirubin Total", "0.8", "mg/dL", "S07"],
    ["042-S07-001", "23", "WEEK4", "2026-03-02", "ALT", "Alanine Aminotransferase", "0.85", "ukat/L", "S07"],
    ["042-S07-001", "24", "WEEK4", "2026-03-02", "BILI", "Bilirubin Total", "1.1", "mg/dL", "S07"],
    ["042-S07-001", "25", "WEEK8", "2026-03-30", "ALT", "Alanine Aminotransferase", "3.995", "ukat/L", "S07"],
    ["042-S07-001", "26", "WEEK8", "2026-03-30", "AST", "Aspartate Aminotransferase", "2.15", "ukat/L", "S07"],
    ["042-S07-001", "27", "WEEK8", "2026-03-30", "BILI", "Bilirubin Total", "5.38", "mg/dL", "S07"],
    ["042-S07-001", "28", "WEEK8", "2026-03-30", "ALP", "Alkaline Phosphatase", "88.0", "U/L", "S07"],

    # Subject 042-S08-014 WEEK8 (Hy's Law candidate 3)
    ["042-S08-014", "30", "BASELINE", "2026-02-20", "ALT", "Alanine Aminotransferase", "30.0", "U/L", "S08"],
    ["042-S08-014", "31", "WEEK8", "2026-05-02", "ALT", "Alanine Aminotransferase", "182.5", "U/L", "S08"],
    ["042-S08-014", "32", "WEEK8", "2026-05-06", "BILI", "Bilirubin Total", "2.85", "mg/dL", "S08"],
    ["042-S08-014", "33", "WEEK8", "2026-05-02", "ALP", "Alkaline Phosphatase", "110.0", "U/L", "S08"],
]

with open("data/labs.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(lb_rows)

# 4. Adverse Events
ae_rows = [
    ["USUBJID", "AESEQ", "AETERM", "AESTDAT", "AEENDAT", "AESEV", "AESER", "AEREL", "AEOUT"],
    ["042-S07-001", "1", "HEPATOTOXICITY", "2026-03-30", "", "SEVERE", "Y", "RELATED", "RECOVERING"],
    ["042-S07-004", "1", "RASH GENERALIZED", "2026-02-20", "2026-03-01", "MODERATE", "N", "RELATED", "RECOVERED"],
    ["042-S05-003", "4", "NAUSEA", "2026-04-14", "2026-04-16", "MILD", "N", "POSSIBLE", "RECOVERED"],
    ["042-S01-002", "1", "HEADACHE", "2026-02-10", "2026-02-12", "MILD", "N", "NOT RELATED", "RECOVERED"],
    ["042-S08-014", "2", "JAUNDICE", "2026-05-06", "", "SEVERE", "Y", "RELATED", "NOT RECOVERED"],
    ["042-S06-001", "1", "FATIGUE", "2026-03-01", "2026-03-05", "MILD", "N", "POSSIBLE", "RECOVERED"],
]

with open("data/adverse_events.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(ae_rows)

# 5. Dosing
ex_rows = [
    ["USUBJID", "EXSEQ", "VISIT", "EXDAT", "EXTRT", "EXDOSE", "EXDOSU", "EXDOSERR"],
    ["042-S01-001", "1", "BASELINE", "2026-01-10", "AT-042", "100", "mg", "NO"],
    ["042-S01-001", "2", "WEEK2", "2026-01-24", "AT-042", "100", "mg", "NO"],
    ["042-S01-001", "3", "WEEK4", "2026-02-07", "AT-042", "100", "mg", "NO"],
    ["042-S01-002", "1", "BASELINE", "2026-01-12", "Placebo", "0", "mg", "NO"],
    ["042-S01-002", "2", "WEEK2", "2026-01-26", "Placebo", "0", "mg", "NO"],
    ["042-S01-003", "1", "BASELINE", "2026-01-15", "AT-042", "100", "mg", "NO"],
    ["042-S01-003", "2", "WEEK2", "2026-01-29", "AT-042", "100", "mg", "NO"],
    ["042-S07-001", "1", "BASELINE", "2026-02-02", "AT-042", "100", "mg", "NO"],
    ["042-S07-001", "2", "WEEK2", "2026-02-16", "AT-042", "100", "mg", "NO"],
    ["042-S07-001", "3", "WEEK4", "2026-03-02", "AT-042", "100", "mg", "NO"],
    ["042-S06-002", "1", "BASELINE", "2026-02-18", "AT-042", "100", "mg", "NO"],
    ["042-S06-002", "2", "WEEK2", "2026-03-04", "AT-042", "100", "mg", "NO"],
    ["042-S06-002", "3", "WEEK4", "2026-03-18", "AT-042", "150", "mg", "YES"], # Wrong dose error at S06, NOT S01
]

with open("data/dosing.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(ex_rows)

# 6. Medications
cm_rows = [
    ["USUBJID", "CMSEQ", "CMTRT", "CMDECOD", "CMSTDAT", "CMENDAT", "CMDOSE", "CMROUTE"],
    ["042-S07-001", "1", "ACETAMINOPHEN", "PARACETAMOL", "2026-02-10", "2026-02-15", "500 mg", "ORAL"],
    ["042-S07-001", "2", "OMEPRAZOLE", "OMEPRAZOLE", "2026-02-20", "", "20 mg", "ORAL"],
    ["042-S05-003", "1", "ASPIRIN", "ACETYLSALICYLIC ACID", "2026-01-01", "", "81 mg", "ORAL"],
    ["042-S01-002", "1", "IBUPROFEN", "IBUPROFEN", "2026-02-10", "2026-02-12", "400 mg", "ORAL"],
]

with open("data/medications.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(cm_rows)

# 7. Medical History
mh_rows = [
    ["USUBJID", "MHSEQ", "MHTERM", "MHSTDAT"],
    ["042-S07-001", "1", "ESSENTIAL HYPERTENSION", "2018-05-12"],
    ["042-S07-001", "2", "NON-ALCOHOLIC FATTY LIVER DISEASE", "2022-09-01"],
    ["042-S05-003", "1", "TYPE 2 DIABETES MELLITUS", "2015-11-04"],
    ["042-S01-001", "1", "HYPERCHOLESTEROLEMIA", "2020-03-15"],
]

with open("data/medical_history.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(mh_rows)

# 8. Disposition
ds_rows = [
    ["USUBJID", "DSSEQ", "DSTERM", "DSDECOD", "DSEVENT", "DSSTDAT"],
    ["042-S01-001", "1", "COMPLETED TREATMENT PERIOD", "COMPLETED", "COMPLETION", "2026-04-04"],
    ["042-S01-002", "1", "COMPLETED TREATMENT PERIOD", "COMPLETED", "COMPLETION", "2026-04-06"],
    ["042-S01-003", "1", "COMPLETED TREATMENT PERIOD", "COMPLETED", "COMPLETION", "2026-04-09"],
    ["042-S07-001", "1", "DISCONTINUED DUE TO HEPATOTOXICITY", "ADVERSE EVENT", "DISCONTINUATION", "2026-03-31"],
    ["042-S07-004", "1", "DISCONTINUED DUE TO GENERALIZED RASH", "ADVERSE EVENT", "DISCONTINUATION", "2026-03-05"],
    ["042-S07-002", "1", "COMPLETED STUDY", "COMPLETED", "COMPLETION", "2026-04-29"],
    ["042-S07-003", "1", "COMPLETED STUDY", "COMPLETED", "COMPLETION", "2026-05-01"],
    ["042-S05-003", "1", "DISCONTINUED DUE TO HEPATIC ENZYME ELEVATION", "ADVERSE EVENT", "DISCONTINUATION", "2026-04-16"],
    ["042-S08-014", "1", "DISCONTINUED DUE TO JAUNDICE", "ADVERSE EVENT", "DISCONTINUATION", "2026-05-08"],
]

with open("data/disposition.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(ds_rows)

# 9. Vital Signs
vs_rows = [
    ["USUBJID", "VSSEQ", "VISIT", "VSDAT", "VSTESTCD", "VSORRES", "VSORRESU"],
    ["042-S07-001", "1", "BASELINE", "2026-02-02", "SYSBP", "128", "mmHg"],
    ["042-S07-001", "2", "BASELINE", "2026-02-02", "DIABP", "82", "mmHg"],
    ["042-S07-001", "3", "BASELINE", "2026-02-02", "PULSE", "72", "beats/min"],
    ["042-S07-001", "4", "WEEK8", "2026-03-30", "SYSBP", "130", "mmHg"],
    ["042-S07-001", "5", "WEEK8", "2026-03-30", "DIABP", "84", "mmHg"],
    ["042-S01-001", "1", "BASELINE", "2026-01-10", "SYSBP", "120", "mmHg"],
    ["042-S01-001", "2", "BASELINE", "2026-01-10", "DIABP", "78", "mmHg"],
]

with open("data/vital_signs.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerows(vs_rows)

print("Created all 9 study CSV tables successfully.")
