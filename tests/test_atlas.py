import unittest
import os
from starter.schemas import Question, Answer, RecordRef
from stage1.atlas import StudyGraph, Atlas
from stage1.normalization import parse_date, parse_lab_result, normalize_lab_unit

class TestAtlasSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.graph = StudyGraph("data")
        cls.stats = cls.graph.build()
        cls.atlas = Atlas(cls.graph)

    def test_01_build_statistics(self):
        """Verify StudyGraph build statistics and subject coverage."""
        self.assertTrue(self.stats["subjects"] > 0)
        self.assertTrue(self.stats["nodes"] > 0)
        self.assertTrue(self.stats["edges"] > 0)
        self.assertIn("build_time_seconds", self.stats)
        self.assertEqual(self.stats["subjects"], 23)

    def test_02_hys_law_worked_example(self):
        """Verify the exact official worked example for subject 042-S07-001."""
        q = Question(
            question_id="Q-HYS",
            question="Which subjects meet the Hy's law criteria?",
            category="FINDING"
        )
        ans = self.atlas.answer(q)
        self.assertEqual(ans.category, "FINDING")
        self.assertIn("042-S07-001", ans.answer)
        
        # Verify supporting laboratory records
        s07_evidence = [e for e in ans.evidence if e.usubjid == "042-S07-001"]
        self.assertTrue(len(s07_evidence) >= 2)
        
        seqs = [e.sequence for e in s07_evidence]
        self.assertIn(25, seqs)  # ALT record seq 25
        self.assertIn(27, seqs)  # BILI record seq 27

        alt_ref = next(e for e in s07_evidence if e.sequence == 25)
        self.assertEqual(alt_ref.test, "ALT")
        self.assertEqual(alt_ref.value, "3.995")
        self.assertEqual(alt_ref.unit, "ukat/L")
        self.assertEqual(alt_ref.normalized_value, "239.7")
        self.assertIn("239.7", alt_ref.calculation)

        bili_ref = next(e for e in s07_evidence if e.sequence == 27)
        self.assertEqual(bili_ref.test, "BILI")
        self.assertEqual(bili_ref.value, "5.38")
        self.assertIn("5.38", bili_ref.calculation)

    def test_03_trap_question_empty_result(self):
        """Verify trap question returns empty list [] without inventing evidence."""
        q = Question(
            question_id="Q-TRAP-1",
            question="Which subjects at site S01 received a wrong dose?",
            category="TRAP"
        )
        ans = self.atlas.answer(q)
        self.assertEqual(ans.category, "TRAP")
        self.assertEqual(ans.answer, [])
        self.assertEqual(ans.evidence, [])
        self.assertEqual(ans.confidence, 1.0)
        self.assertIn("No subjects at site S01 received a wrong dose", ans.explanation)

    def test_04_count_discontinuations_at_s07(self):
        """Verify count question for adverse event discontinuations at Site S07."""
        q = Question(
            question_id="Q-COUNT-1",
            question="How many subjects at site S07 discontinued due to an adverse event?",
            category="COUNT"
        )
        ans = self.atlas.answer(q)
        self.assertEqual(ans.category, "COUNT")
        self.assertEqual(ans.answer, 2)
        self.assertTrue(len(ans.evidence) >= 2)

    def test_05_lookup_date_window(self):
        """Verify lookup within 7 days of WEEK8 visit for 042-S05-003."""
        q = Question(
            question_id="Q-LOOKUP-1",
            question="List the laboratory and adverse-event records for 042-S05-003 within 7 days of the WEEK8 visit.",
            category="LOOKUP"
        )
        ans = self.atlas.answer(q)
        self.assertEqual(ans.category, "LOOKUP")
        self.assertTrue(len(ans.answer) > 0)
        self.assertTrue(len(ans.evidence) > 0)

    def test_06_non_numeric_lab_values(self):
        """Verify <5 and ND are not converted to 0."""
        val_lt5, raw_lt5, is_num_lt5 = parse_lab_result("<5")
        self.assertIsNone(val_lt5)
        self.assertFalse(is_num_lt5)
        self.assertEqual(raw_lt5, "<5")

        val_nd, raw_nd, is_num_nd = parse_lab_result("ND")
        self.assertIsNone(val_nd)
        self.assertFalse(is_num_nd)

        # Comma decimal
        val_comma, raw_comma, is_num_comma = parse_lab_result("12,4")
        self.assertEqual(val_comma, 12.4)
        self.assertTrue(is_num_comma)

    def test_07_unit_conversion(self):
        """Verify 1 µkat/L = 60 U/L conversion."""
        norm_val, norm_unit, note = normalize_lab_unit("ALT", 3.995, "ukat/L")
        self.assertEqual(norm_val, 239.7)
        self.assertEqual(norm_unit, "U/L")
        self.assertIn("× 60", note)

    def test_08_duplicate_subject_handling(self):
        """Verify duplicate subject rows in demographics do not inflate subject counts."""
        self.assertEqual(len(self.graph.subjects), 23)
        self.assertIn("042-S03-099", self.graph.subjects)

    def test_09_patient360(self):
        """Verify patient360 traceability."""
        p360 = self.graph.patient360("042-S07-001")
        self.assertTrue(p360["found"])
        self.assertEqual(p360["demographics"]["SITEID"], "S07")
        self.assertTrue(len(p360["labs"]) >= 8)
        self.assertTrue(len(p360["visits"]) >= 4)
        self.assertTrue(p360["connected_records_count"] >= 20)

    def test_10_rebuild_refresh(self):
        """Verify graph rebuilding clears previous state cleanly."""
        new_stats = self.graph.build(cut=10)
        self.assertEqual(new_stats["subjects"], 10)
        self.assertEqual(new_stats["cut"], 10)

        # Rebuild full
        full_stats = self.graph.build()
        self.assertEqual(full_stats["subjects"], 23)
        self.assertIsNone(full_stats["cut"])

if __name__ == "__main__":
    unittest.main()
