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

export interface KGNode {
  id: string;
  label: string;
  category: "STUDY" | "SITE" | "ARM" | "SUBJECT" | "VISIT" | "LAB" | "AE" | "MED" | "DISP" | "CRITERION" | "EX" | string;
  subCategory?: string;
  val: number;
  color: string;
  details?: Record<string, any>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface KGEdge {
  id: string;
  source: string | KGNode;
  target: string | KGNode;
  relationship: string;
  isCausal: boolean;
  severity: "NORMAL" | "WARNING" | "CRITICAL" | string;
  label?: string;
}

export interface KGCausalChain {
  subjectId: string;
  title: string;
  hops: string[];
  summary: string;
  evidence?: RecordRef[];
  calculations?: {
    trans?: string;
    bili?: string;
    window?: string;
  };
}

export interface KnowledgeGraphData {
  status: string;
  scope: string;
  nodes: KGNode[];
  edges: KGEdge[];
  causalChains: KGCausalChain[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    subjectsCovered: number;
    hysLawCandidates: string[];
    hysLawCandidatesCount: number;
    causalChainsCount: number;
  };
}
