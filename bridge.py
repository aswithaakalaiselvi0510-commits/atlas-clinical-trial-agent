import sys
import json
from stage1.atlas import StudyGraph, Atlas, Question

# Global persistent study graph instance
graph = StudyGraph("data")
graph.build()
atlas = Atlas(graph)

def handle_request(req):
    action = req.get("action", "")
    
    if action == "stats":
        if not graph.is_built:
            graph.build()
        return {"status": "ok", "stats": graph.build_stats}

    elif action == "build" or action == "refresh":
        cut = req.get("cut")
        stats = graph.build(cut=cut)
        global atlas
        atlas = Atlas(graph)
        return {"status": "ok", "stats": stats}

    elif action == "patient360":
        usubjid = req.get("usubjid", "")
        p360 = graph.patient360(usubjid)
        return {"status": "ok", "patient": p360}

    elif action == "all_subjects":
        subjects_list = []
        for uid, s in graph.subjects.items():
            dm = s["demographics"]
            subjects_list.append({
                "usubjid": uid,
                "site": dm.get("SITEID"),
                "arm": dm.get("ARM"),
                "age": dm.get("AGE"),
                "sex": dm.get("SEX"),
                "records_count": len(s["labs"]) + len(s["visits"]) + len(s["adverse_events"]) + len(s["disposition"])
            })
        return {"status": "ok", "subjects": subjects_list}

    elif action == "ask":
        q_data = req.get("question", {})
        q = Question(
            question_id=q_data.get("question_id", "Q-USER"),
            question=q_data.get("question", ""),
            category=q_data.get("category", "")
        )
        ans = atlas.answer(q)
        return {"status": "ok", "answer": ans.to_dict()}

    elif action == "health":
        return {
            "status": "ok",
            "study_loaded": graph.is_built,
            "subjects_count": len(graph.subjects),
            "nodes_count": graph.nodes_count,
            "edges_count": graph.edges_count,
            "last_build_time": graph.build_stats.get("build_time_seconds")
        }

    else:
        return {"status": "error", "error": f"Unknown action: {action}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # CLI invocation with JSON argument
        try:
            req_str = sys.argv[1]
            req_json = json.loads(req_str)
            res = handle_request(req_json)
            print(json.dumps(res, default=str))
        except Exception as e:
            print(json.dumps({"status": "error", "error": str(e)}, default=str))
    else:
        # Interactive stdin line mode
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                req_json = json.loads(line)
                res = handle_request(req_json)
                print(json.dumps(res, default=str), flush=True)
            except Exception as e:
                print(json.dumps({"status": "error", "error": str(e)}, default=str), flush=True)
