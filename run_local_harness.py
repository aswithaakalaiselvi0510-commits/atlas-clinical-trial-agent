import json
import time
import sys
from stage1.atlas import StudyGraph, Atlas, Question

def run_harness():
    print("=" * 60)
    print("ATLAS LOCAL EVALUATION HARNESS — STAGE 1")
    print("=" * 60)

    # 1. StudyGraph Build
    t0 = time.perf_counter()
    graph = StudyGraph("data")
    build_stats = graph.build()
    t_build = time.perf_counter() - t0
    print(f"[BUILD] Completed in {t_build:.4f}s")
    print(f"        Subjects: {build_stats['subjects']}")
    print(f"        Nodes:    {build_stats['nodes']}")
    print(f"        Edges:    {build_stats['edges']}")

    # Save graph_stats.json
    with open("graph_stats.json", "w", encoding="utf-8") as f:
        json.dump(build_stats, f, indent=2)
    print("[EXPORT] Saved graph_stats.json")

    # 2. Public Benchmark Questions
    public_questions = [
        Question(
            question_id="Q01",
            question="Which subjects meet the potential Hy's law criteria?",
            category="FINDING"
        ),
        Question(
            question_id="Q02",
            question="How many subjects at site S07 discontinued due to an adverse event?",
            category="COUNT"
        ),
        Question(
            question_id="Q03",
            question="List the laboratory and adverse-event records for 042-S05-003 within 7 days of the WEEK8 visit.",
            category="LOOKUP"
        ),
        Question(
            question_id="Q04",
            question="Which subjects at site S01 received a wrong dose?",
            category="TRAP"
        ),
        Question(
            question_id="Q05",
            question="How many subjects were enrolled across all sites?",
            category="COUNT"
        ),
        Question(
            question_id="Q06",
            question="Which subjects had a severe adverse event (GRADE 3 or higher) during the treatment period?",
            category="FINDING"
        ),
        Question(
            question_id="Q07",
            question="List all concomitant medications for subject 042-S07-001 started after baseline.",
            category="LOOKUP"
        ),
        Question(
            question_id="Q08",
            question="Which subjects at site S03 had an ALT elevation greater than 3x ULN?",
            category="FINDING"
        ),
        Question(
            question_id="Q09",
            question="How many subjects completed the study through the WEEK12 visit?",
            category="COUNT"
        ),
        Question(
            question_id="Q10",
            question="Which subjects at site S02 had a protocol violation for taking prohibited medication?",
            category="TRAP"
        ),
    ]

    atlas = Atlas(graph)
    results = []
    print("\n[EVAL] Executing 10 Public Benchmark Questions...")

    valid_evidence_count = 0
    total_evidence_count = 0
    traps_handled_count = 0
    total_traps = 2

    for q in public_questions:
        t_start = time.perf_counter()
        ans = atlas.answer(q)
        duration = round(time.perf_counter() - t_start, 5)

        ans_dict = ans.to_dict()
        ans_dict["execution_time_seconds"] = duration
        results.append(ans_dict)

        # Check evidence validity
        for ev in ans.evidence:
            total_evidence_count += 1
            key = (ev.domain.upper(), ev.usubjid, int(ev.sequence))
            if key in graph.records_by_key:
                valid_evidence_count += 1

        # Check traps
        if q.category == "TRAP":
            if ans.answer == [] and len(ans.evidence) == 0:
                traps_handled_count += 1

        print(f"  ✓ [{q.question_id}] {q.category:7} | Ans: {str(ans.answer)[:35]}... ({duration:.4f}s)")

    # Save stage1_public.json
    with open("stage1_public.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print("\n[EXPORT] Saved stage1_public.json")

    evidence_rate = (valid_evidence_count / total_evidence_count * 100) if total_evidence_count > 0 else 100.0
    print("-" * 60)
    print(f"EVIDENCE VALIDITY RATE: {evidence_rate:.1f}% ({valid_evidence_count}/{total_evidence_count})")
    print(f"TRAP HANDLING:         {traps_handled_count}/{total_traps} traps correctly returned []")
    print(f"AVERAGE QUESTION TIME: {sum(r['execution_time_seconds'] for r in results) / len(results):.5f}s (Limit: 120s)")
    print("=" * 60)

if __name__ == "__main__":
    run_harness()
