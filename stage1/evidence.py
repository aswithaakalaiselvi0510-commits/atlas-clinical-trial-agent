from typing import Optional, Dict, Any
from starter.schemas import RecordRef

class EvidenceValidator:
    def __init__(self, graph: Any):
        self.graph = graph

    def validate_record_ref(self, ref: RecordRef, expected_usubjid: Optional[str] = None, expected_domain: Optional[str] = None) -> bool:
        """
        Validates that a RecordRef:
        1. Exists in the study graph by (domain, usubjid, sequence)
        2. Belongs to the expected subject
        3. Belongs to the expected domain
        """
        if not ref or not ref.usubjid or not ref.domain or ref.sequence is None:
            return False

        if expected_usubjid and ref.usubjid != expected_usubjid:
            return False

        if expected_domain and ref.domain.upper() != expected_domain.upper():
            return False

        key = (ref.domain.upper(), ref.usubjid, int(ref.sequence))
        record = self.graph.records_by_key.get(key)
        return record is not None

    def validate_all(self, refs: list, expected_usubjid: Optional[str] = None) -> bool:
        """Validates that all RecordRefs in a collection are valid and verified."""
        if not refs:
            return True
        for ref in refs:
            if not self.validate_record_ref(ref, expected_usubjid):
                return False
        return True
