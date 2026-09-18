export interface RecordRef {
  domain: string;
  usubjid: string;
  sequence: number;
  visit?: string;
  test?: string;
  date?: string;
  value?: string;
  normalized_value?: string;
  unit?: string;
  normalized_unit?: string;
  reference_range?: string;
  calculation?: string;
  reason?: string;
}

export interface Question {
  question_id: string;
  question: string;
  category?: "COUNT" | "LOOKUP" | "FINDING" | "TRAP" | string;
}

export interface Answer {
  question_id: string;
  question: string;
  category: "COUNT" | "LOOKUP" | "FINDING" | "TRAP" | string;
  answer: number | string[] | Record<string, any>[] | Record<string, any> | string | null;
  evidence: RecordRef[];
  confidence: number;
  explanation?: string;
  reasoning?: string;
  execution_time_seconds?: number;
}

export interface BuildStats {
  nodes: number;
  edges: number;
  subjects: number;
  subjects_covered?: number;
  build_time: number;
  build_time_seconds: number;
  cut: number | null;
  domains: {
    demographics: number;
    visits: number;
    labs: number;
    adverse_events: number;
    dosing: number;
    medications: number;
    medical_history: number;
    disposition: number;
    vital_signs: number;
  };
}

export interface SubjectSummary {
  usubjid: string;
  site?: string;
  arm?: string;
  age?: string;
  sex?: string;
  records_count?: number;
}

export interface Patient360 {
  found: boolean;
  usubjid: string;
  demographics?: Record<string, any>;
  visits?: Record<string, any>[];
  labs?: Record<string, any>[];
  adverse_events?: Record<string, any>[];
  dosing?: Record<string, any>[];
  medications?: Record<string, any>[];
  medical_history?: Record<string, any>[];
  disposition?: Record<string, any>[];
  vital_signs?: Record<string, any>[];
  connected_records_count?: number;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
  groundingSources?: Array<{ title?: string; uri?: string }>;
}
