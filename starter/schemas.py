from dataclasses import dataclass, field, asdict
from typing import List, Optional, Union, Any, Dict

@dataclass
class RecordRef:
    """Exact reference to a source record in the clinical trial dataset."""
    domain: str
    usubjid: str
    sequence: int
    visit: Optional[str] = None
    test: Optional[str] = None
    date: Optional[str] = None
    value: Optional[str] = None
    normalized_value: Optional[str] = None
    unit: Optional[str] = None
    normalized_unit: Optional[str] = None
    reference_range: Optional[str] = None
    calculation: Optional[str] = None
    reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "RecordRef":
        return cls(
            domain=data["domain"],
            usubjid=data["usubjid"],
            sequence=int(data["sequence"]),
            visit=data.get("visit"),
            test=data.get("test"),
            date=data.get("date"),
            value=data.get("value"),
            normalized_value=data.get("normalized_value"),
            unit=data.get("unit"),
            normalized_unit=data.get("normalized_unit"),
            reference_range=data.get("reference_range"),
            calculation=data.get("calculation"),
            reason=data.get("reason"),
        )

@dataclass
class Question:
    """Query submitted to Atlas clinical intelligence."""
    question_id: str
    question: str
    category: str = ""  # COUNT, LOOKUP, FINDING, TRAP

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Question":
        return cls(
            question_id=data.get("question_id", ""),
            question=data.get("question", ""),
            category=data.get("category", "")
        )

@dataclass
class Answer:
    """Evidence-backed deterministic response from Atlas."""
    question_id: str
    question: str
    category: str
    answer: Union[int, List[str], List[Dict[str, Any]], List[RecordRef], str, None]
    evidence: List[RecordRef] = field(default_factory=list)
    confidence: float = 1.0
    explanation: Optional[str] = None
    reasoning: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        res = asdict(self)
        res["evidence"] = [e.to_dict() if isinstance(e, RecordRef) else e for e in self.evidence]
        return res
