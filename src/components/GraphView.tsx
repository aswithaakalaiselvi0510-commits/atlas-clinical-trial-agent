import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { 
  GitBranch, 
  Layers, 
  Users, 
  Filter, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Play, 
  FileText, 
  Bookmark, 
  BookmarkCheck, 
  Sliders, 
  Info,
  ChevronRight,
  ExternalLink,
  Activity,
  Check
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { SubjectSummary, KnowledgeGraphData, KGNode, KGEdge, KGCausalChain } from "../types";
import { WhatIfSimulator } from "./WhatIfSimulator";
import { db, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "../lib/firebase";

interface GraphViewProps {
  subjects: SubjectSummary[];
  onSelectSubject?: (usubjid: string) => void;
  user?: FirebaseUser | null;
}

export const GraphView: React.FC<GraphViewProps> = ({
  subjects,
  onSelectSubject,
  user,
}) => {
  const [scope, setScope] = useState<"study" | "hys_law_cascade" | "patient">("hys_law_cascade");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("042-S07-001");
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Interactive Selection
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [activeCausalChain, setActiveCausalChain] = useState<KGCausalChain | null>(null);
  const [isTracingPath, setIsTracingPath] = useState<boolean>(false);
  
  // What-If Counterfactual Simulation
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [simulatedState, setSimulatedState] = useState<{
    altRatio: number;
    biliRatio: number;
    alpRatio: number;
    dayWindow: number;
    isHysLawTriggered: boolean;
  } | null>(null);

  // AI Causal Narrative
  const [generatingNarrative, setGeneratingNarrative] = useState<boolean>(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [showNarrativeModal, setShowNarrativeModal] = useState<boolean>(false);

  // Firestore Graph Bookmarks
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedBookmarks, setSavedBookmarks] = useState<any[]>([]);
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const simulationRef = useRef<d3.Simulation<KGNode, KGEdge> | null>(null);

  // Load Graph Data
  useEffect(() => {
    fetchGraph();
  }, [scope, selectedSubjectId]);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const url = `/api/knowledge-graph?scope=${scope}&usubjid=${encodeURIComponent(selectedSubjectId)}`;
      const res = await fetch(url);
      const data: KnowledgeGraphData = await res.json();
      if (data.status === "ok") {
        setGraphData(data);
        if (data.causalChains && data.causalChains.length > 0) {
          setActiveCausalChain(data.causalChains[0]);
        } else {
          setActiveCausalChain(null);
        }
      }
    } catch (err) {
      console.error("Failed to load Knowledge Graph:", err);
    } finally {
      setLoading(false);
    }
  };

  // Listen to Firestore Bookmarks for current user
  useEffect(() => {
    if (!user) {
      setSavedBookmarks([]);
      return;
    }
    const bRef = collection(db, "users", user.uid, "graph_bookmarks");
    const q = query(bRef, orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      setSavedBookmarks(items);
    });
    return () => unsubscribe();
  }, [user]);

  // Render D3 Force-Directed Simulation
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const width = 900;
    const height = 580;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Defs: markers & glow filters
    const defs = svg.append("defs");
    
    // Arrow marker normal
    defs.append("marker")
      .attr("id", "arrow-normal")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b");

    // Arrow marker causal / alert
    defs.append("marker")
      .attr("id", "arrow-critical")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#e11d48");

    // Glow filter for causal cascade highlights
    const filter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const container = svg.append("g").attr("class", "zoom-container");
    gRef.current = container;

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });
    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Deep clone data for d3 mutation
    const nodes: KGNode[] = graphData.nodes.map((d) => ({ ...d }));
    const edges: KGEdge[] = graphData.edges.map((d) => ({ ...d }));

    // Force simulation
    const simulation = d3.forceSimulation<KGNode>(nodes)
      .force("link", d3.forceLink<KGNode, KGEdge>(edges).id((d) => d.id).distance((d) => (d.isCausal ? 90 : 120)))
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.val * 1.6 + 10));

    simulationRef.current = simulation;

    // Render Edges
    const link = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        if (simulatedState && !simulatedState.isHysLawTriggered && d.relationship === "EVALUATED_AGAINST") {
          return "#475569";
        }
        return d.severity === "CRITICAL" ? "#e11d48" : d.isCausal ? "#f59e0b" : "#334155";
      })
      .attr("stroke-width", (d) => (d.isCausal ? 2.5 : 1.2))
      .attr("stroke-dasharray", (d) => {
        if (simulatedState && !simulatedState.isHysLawTriggered && d.relationship === "EVALUATED_AGAINST") {
          return "4,4";
        }
        return d.isCausal ? "6,3" : "none";
      })
      .attr("marker-end", (d) => (d.severity === "CRITICAL" ? "url(#arrow-critical)" : "url(#arrow-normal)"))
      .attr("opacity", 0.75);

    // Render Nodes
    const node = container.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, KGNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        if (d.category === "SUBJECT" && onSelectSubject) {
          onSelectSubject(d.label);
        }
      });

    // Node Outer Pulsing Ring for Causal Hops
    node.append("circle")
      .attr("class", "pulse-ring")
      .attr("r", (d) => d.val + 6)
      .attr("fill", "none")
      .attr("stroke", (d) => (d.subCategory === "CRITICAL_ALERT" ? "#e11d48" : "#38bdf8"))
      .attr("stroke-width", 2)
      .attr("opacity", (d) => {
        if (activeCausalChain && activeCausalChain.hops.includes(d.id)) return 0.8;
        return 0;
      });

    // Node Circle
    node.append("circle")
      .attr("r", (d) => d.val)
      .attr("fill", (d) => {
        // Apply simulation overrides dynamically
        if (simulatedState && d.category === "LAB" && d.label.includes("ALT")) {
          return simulatedState.altRatio >= 3.0 ? "#e11d48" : "#10b981";
        }
        if (simulatedState && d.category === "CRITERION") {
          return simulatedState.isHysLawTriggered ? "#e11d48" : "#475569";
        }
        return d.color;
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .attr("filter", (d) => (activeCausalChain && activeCausalChain.hops.includes(d.id) ? "url(#glow)" : "none"));

    // Node Category Glyph/Icon
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", (d) => (d.val >= 18 ? "11px" : "9px"))
      .attr("font-weight", "bold")
      .attr("fill", "#ffffff")
      .attr("pointer-events", "none")
      .text((d) => {
        if (d.category === "STUDY") return "ATLAS";
        if (d.category === "SITE") return "SITE";
        if (d.category === "ARM") return "ARM";
        if (d.category === "CRITERION") return "RULE";
        if (d.category === "LAB") return "LB";
        if (d.category === "AE") return "AE";
        if (d.category === "VISIT") return "SV";
        if (d.category === "DISP") return "DS";
        return d.label.slice(0, 3);
      });

    // Node Label
    node.append("text")
      .attr("dx", (d) => d.val + 6)
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("fill", "#cbd5e1")
      .attr("pointer-events", "none")
      .text((d) => d.label);

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Causal Path Highlighter effect
    if (isTracingPath && activeCausalChain) {
      const hopSet = new Set(activeCausalChain.hops);
      node.transition().duration(400).attr("opacity", (d) => (hopSet.has(d.id) ? 1.0 : 0.15));
      link.transition().duration(400).attr("opacity", (d: any) => {
        const sId = typeof d.source === "object" ? d.source.id : d.source;
        const tId = typeof d.target === "object" ? d.target.id : d.target;
        return hopSet.has(sId) && hopSet.has(tId) ? 1.0 : 0.08;
      });
    } else {
      node.transition().duration(300).attr("opacity", 1.0);
      link.transition().duration(300).attr("opacity", 0.75);
    }

    return () => {
      simulation.stop();
    };
  }, [graphData, isTracingPath, activeCausalChain, simulatedState]);

  // Zoom Controls
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  // Trace Causal Cascade Path
  const handleTraceCausalPath = () => {
    setIsTracingPath((prev) => !prev);
  };

  // AI Narrative Synthesis
  const handleSynthesizeNarrative = async () => {
    setGeneratingNarrative(true);
    try {
      const res = await fetch("/api/knowledge-graph/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: activeCausalChain?.subjectId || selectedSubjectId,
          causalChain: activeCausalChain,
          graphMetrics: graphData?.metrics,
        }),
      });
      const data = await res.json();
      if (data.narrative) {
        setAiNarrative(data.narrative);
        setShowNarrativeModal(true);
      }
    } catch (err) {
      console.error("Narrative synthesis failed:", err);
    } finally {
      setGeneratingNarrative(false);
    }
  };

  // Save Graph Bookmark to Firestore
  const handleSaveBookmark = async () => {
    if (!user || savingBookmark) return;
    setSavingBookmark(true);
    try {
      const bRef = collection(db, "users", user.uid, "graph_bookmarks");
      await addDoc(bRef, {
        title: bookmarkTitle || `Graph Cascade: ${selectedSubjectId}`,
        note: bookmarkNote,
        scope,
        subjectId: selectedSubjectId,
        activeHops: activeCausalChain?.hops || [],
        simulatedState: simulatedState || null,
        timestamp: serverTimestamp(),
      });
      setSavedSuccess(true);
      setBookmarkTitle("");
      setBookmarkNote("");
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save graph bookmark:", err);
    } finally {
      setSavingBookmark(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-semibold mb-1">
              <GitBranch className="w-5 h-5 text-teal-600" />
              <h2>Interactive Clinical Knowledge Graph & Causal Cascade Engine</h2>
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-0.5 rounded border border-teal-200">
                Stage 1 Verified
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Multi-relational graph connecting clinical visits, biomarkers, regulatory criteria (FDA Hy's Law), adverse events, and counterfactual simulation.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Selector */}
            <div className="flex items-center space-x-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg p-1">
              <button
                onClick={() => setScope("hys_law_cascade")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  scope === "hys_law_cascade"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Causal Cascades
              </button>
              <button
                onClick={() => setScope("study")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  scope === "study"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Global Topology
              </button>
              <button
                onClick={() => setScope("patient")}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  scope === "patient"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Patient Subgraph
              </button>
            </div>

            {/* Subject Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  if (onSelectSubject) onSelectSubject(e.target.value);
                }}
                className="bg-slate-50 border border-slate-200 text-xs font-mono font-bold rounded-lg px-2.5 py-1.5 text-slate-900 focus:outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.usubjid} value={s.usubjid}>
                    {s.usubjid} ({s.site || "S07"})
                  </option>
                ))}
              </select>
            </div>

            {/* What-If Simulator Toggle */}
            <button
              onClick={() => setShowSimulator((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                showSimulator
                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>What-If Simulator</span>
            </button>

            {/* AI Narrative Button */}
            <button
              onClick={handleSynthesizeNarrative}
              disabled={generatingNarrative}
              className="px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{generatingNarrative ? "Synthesizing..." : "AI Safety Narrative"}</span>
            </button>

            {/* Bookmarks Drawer Toggle */}
            {user && (
              <button
                onClick={() => setShowBookmarksDrawer((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                <span>Bookmarks ({savedBookmarks.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas & Tools Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Knowledge Graph D3 Canvas */}
        <div className={`${showSimulator ? "lg:col-span-8" : "lg:col-span-9"} bg-slate-950 rounded-xl border border-slate-800 p-0 shadow-lg relative overflow-hidden flex flex-col`}>
          {/* Canvas Floating Overlay Controls */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            {/* Causal Path Tracer Button */}
            <button
              onClick={handleTraceCausalPath}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md backdrop-blur transition-all ${
                isTracingPath
                  ? "bg-amber-500 text-slate-950 border border-amber-400"
                  : "bg-slate-900/80 text-amber-300 border border-amber-500/40 hover:bg-slate-800"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isTracingPath ? "Tracing Active (Isolate)" : "Trace Causal Cascade"}</span>
            </button>

            {/* Active Chain Badge */}
            {activeCausalChain && (
              <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300 backdrop-blur flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-mono text-white font-bold">{activeCausalChain.subjectId}</span>
                <span className="text-slate-400">• DILI Cascade</span>
              </div>
            )}
          </div>

          {/* Canvas Floating Zoom & Pan Controls */}
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800 p-1 rounded-lg backdrop-blur text-slate-300">
            <button
              onClick={() => handleZoom(1.2)}
              title="Zoom In"
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(0.8)}
              title="Zoom Out"
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset View"
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* SVG Canvas */}
          <div className="w-full h-[580px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center space-y-3 text-slate-400 text-xs">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span>Assembling multi-relational Knowledge Graph topology...</span>
              </div>
            ) : (
              <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}
          </div>

          {/* Legend Footer */}
          <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">Legend:</span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <span>Study</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>Site</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Arm</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>Subject</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Visit</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Hy's Law Rule / Peak Lab</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Adverse Event</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Disposition</span>
              </span>
            </div>

            <div className="flex items-center space-x-2 text-slate-500 font-mono text-[10px]">
              <span>Nodes: {graphData?.metrics?.totalNodes || 0}</span>
              <span>•</span>
              <span>Edges: {graphData?.metrics?.totalEdges || 0}</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Details & What-If Simulator */}
        <div className={`${showSimulator ? "lg:col-span-4" : "lg:col-span-3"} space-y-4`}>
          {/* Selected Node Inspector */}
          {selectedNode ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedNode.category}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                    {selectedNode.label}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              {/* Node Details Table */}
              <div className="space-y-2 text-xs">
                {Object.entries(selectedNode.details || {}).map(([key, val]) => {
                  if (typeof val === "object" && val !== null) return null;
                  return (
                    <div key={key} className="flex justify-between py-1 border-b border-slate-50 font-mono">
                      <span className="text-slate-500">{key}:</span>
                      <span className="font-semibold text-slate-800 text-right">{String(val)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Hy's Law Proof if Available */}
              {selectedNode.details?.hysLawDetails && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Regulatory Proof Confirmed</span>
                  </div>
                  <p className="text-[11px] font-mono">
                    {selectedNode.details.hysLawDetails.trans_calc}
                  </p>
                  <p className="text-[11px] font-mono">
                    {selectedNode.details.hysLawDetails.bili_calc}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm text-center py-8">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-700">Interactive Node Inspector</h4>
              <p className="text-xs text-slate-500 mt-1">
                Click any node on the graph canvas to inspect its clinical metadata, CDISC domain, and arithmetic proof.
              </p>
            </div>
          )}

          {/* Counterfactual Anomaly Propagation Engine (What-If Simulator) */}
          {showSimulator && (
            <WhatIfSimulator
              activeSubjectId={selectedSubjectId}
              onSimulateChange={(sim) => {
                setSimulatedState(sim);
              }}
            />
          )}

          {/* Bookmark Current State (Firestore) */}
          {user && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 text-xs font-semibold">
                <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                <span>Save Graph Observation to Firestore</span>
              </div>
              <input
                type="text"
                placeholder="Observation title (e.g., Week 8 Transaminase Spike)..."
                value={bookmarkTitle}
                onChange={(e) => setBookmarkTitle(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <textarea
                rows={2}
                placeholder="Investigator hypothesis or adjudication note..."
                value={bookmarkNote}
                onChange={(e) => setBookmarkNote(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                onClick={handleSaveBookmark}
                disabled={savingBookmark}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  savedSuccess
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Firestore!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{savingBookmark ? "Saving..." : "Save Bookmark"}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step-by-Step Causal Cascade Trajectory Timeline */}
      {activeCausalChain && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">{activeCausalChain.title}</h3>
                <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                  Isolated Cascade
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{activeCausalChain.summary}</p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleSynthesizeNarrative}
                disabled={generatingNarrative}
                className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Adjudication Narrative</span>
              </button>
            </div>
          </div>

          {/* Sequential Hops */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {activeCausalChain.hops.map((hopId, idx) => {
              const matchingNode = graphData?.nodes.find((n) => n.id === hopId);
              return (
                <div
                  key={hopId}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="font-mono font-bold">Step 0{idx + 1}</span>
                    <span className="text-teal-600 font-bold">{matchingNode?.category || "HOP"}</span>
                  </div>
                  <div className="font-semibold text-slate-900 truncate" title={matchingNode?.label || hopId}>
                    {matchingNode?.label || hopId}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {matchingNode?.subCategory || "Verified Link"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Narrative Modal */}
      {showNarrativeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-semibold text-slate-900">
                  AI Regulatory Safety Adjudication Narrative
                </h3>
              </div>
              <button
                onClick={() => setShowNarrativeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
              <div className="whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px]">
                {aiNarrative}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">Grounded in CDISC SDTM Knowledge Graph Topology</span>
              <button
                onClick={() => setShowNarrativeModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firestore Saved Bookmarks Drawer */}
      {showBookmarksDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Bookmark className="w-5 h-5 text-teal-600" />
                  <h3 className="font-semibold text-slate-900 text-sm">Saved Graph Observations</h3>
                </div>
                <button
                  onClick={() => setShowBookmarksDrawer(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[70vh]">
                {savedBookmarks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">No saved observations yet.</p>
                ) : (
                  savedBookmarks.map((b) => (
                    <div key={b.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>{b.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{b.subjectId}</span>
                      </div>
                      {b.note && <p className="text-slate-600 text-[11px]">{b.note}</p>}
                      <div className="text-[10px] text-teal-600 font-mono">Scope: {b.scope}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowBookmarksDrawer(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
