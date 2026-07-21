'use client';

import { useEffect, useState, useRef } from 'react';
import { Network, Filter, Info, Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getGraphData, getGraphStats, filterGraph, type GraphData } from '@/lib/api';

const NODE_COLORS: Record<string, string> = {
  Physics_Domain: '#3b82f6',
  Concept: '#06b6d4',
  Misconception: '#f43f5e',
  Cause: '#f59e0b',
  Learning_Model: '#10b981',
  Learning_Media: '#a855f7',
  Assessment: '#6366f1',
  Research_Method: '#14b8a6',
  Educational_Level: '#f97316',
  Learning_Outcome: '#22c55e',
  Keyword: '#94a3b8',
};

const RELATION_COLORS: Record<string, string> = {
  DISTORTS: '#f43f5e',
  CAUSED_BY: '#f59e0b',
  REDUCES: '#10b981',
  MEASURES: '#6366f1',
  DELIVERS: '#a855f7',
  PART_OF: '#3b82f6',
  PREREQUISITE_OF: '#06b6d4',
  CONTRADICTS: '#ef4444',
  IMPROVES: '#22c55e',
};

const RELATION_LABELS: Record<string, string> = {
  DISTORTS: 'MENDISTORSI',
  CAUSED_BY: 'DISEBABKAN_OLEH',
  REDUCES: 'MENGURANGI',
  MEASURES: 'MENGUKUR',
  DELIVERS: 'MENYAMPAIKAN',
  PART_OF: 'BAGIAN_DARI',
  PREREQUISITE_OF: 'PRASYARAT_DARI',
  CONTRADICTS: 'BERTENTANGAN_DENGAN',
  IMPROVES: 'MENINGKATKAN',
};

const ENTITY_LABELS: Record<string, string> = {
  Physics_Domain: 'Domain Fisika',
  Concept: 'Konsep',
  Misconception: 'Miskonsepsi',
  Cause: 'Penyebab',
  Learning_Model: 'Model Pembelajaran',
  Learning_Media: 'Media Pembelajaran',
  Assessment: 'Asesmen',
  Research_Method: 'Metode Penelitian',
  Educational_Level: 'Jenjang Pendidikan',
  Learning_Outcome: 'Hasil Belajar',
  Keyword: 'Kata Kunci',
};

export default function KnowledgeGraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filterType, setFilterType] = useState('');
  const [filterRelation, setFilterRelation] = useState('');
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animRef = useRef<number>(0);
  const isDragging = useRef(false);
  const dragNode = useRef<string | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Zoom & Pan states
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    Promise.all([
      getGraphData(),
      getGraphStats(),
    ]).then(([gd, gs]) => {
      setGraphData(gd);
      setStats(gs);
      initPositions(gd);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (filterType || filterRelation) {
      filterGraph(filterType || undefined, filterRelation || undefined).then(gd => {
        setGraphData(gd);
        initPositions(gd);
      });
    } else {
      getGraphData().then(gd => {
        setGraphData(gd);
        initPositions(gd);
      });
    }
  }, [filterType, filterRelation]);

  const initPositions = (data: GraphData) => {
    const pos: Record<string, { x: number; y: number }> = {};
    const W = 800, H = 500;
    data.nodes.forEach((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const r = 180 + Math.random() * 80;
      pos[n.id] = {
        x: W / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 60,
        y: H / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 60,
      };
    });
    setPositions(pos);
    // Reset view offset
    setZoom(0.95);
    setPanOffset({ x: 10, y: 10 });
  };

  useEffect(() => {
    if (!graphData || !canvasRef.current || Object.keys(positions).length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, W, H);

      // Save context state for Zoom & Pan transformation
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoom, zoom);

      // Draw edges
      graphData.edges.forEach(edge => {
        const sp = positions[edge.source];
        const tp = positions[edge.target];
        if (!sp || !tp) return;

        const color = RELATION_COLORS[edge.relation] || '#2d4a6e';
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(tp.x, tp.y);
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = edge.weight || 1;
        ctx.stroke();

        // Arrow
        const angle = Math.atan2(tp.y - sp.y, tp.x - sp.x);
        const arrowX = tp.x - 14 * Math.cos(angle);
        const arrowY = tp.y - 14 * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - 8 * Math.cos(angle - 0.4), arrowY - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(arrowX - 8 * Math.cos(angle + 0.4), arrowY - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = `${color}80`;
        ctx.fill();

        // Edge label (if high zoom or selected/hovered)
        if (zoom > 1.2 || hoveredNode === edge.source || hoveredNode === edge.target) {
          const midX = (sp.x + tp.x) / 2;
          const midY = (sp.y + tp.y) / 2;
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 7px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(RELATION_LABELS[edge.relation] || edge.relation, 0, -4);
          ctx.restore();
        }
      });

      // Draw nodes
      graphData.nodes.forEach(node => {
        const pos = positions[node.id];
        if (!pos) return;

        const color = NODE_COLORS[node.type] || '#4a6fa5';
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode === node.id;
        const r = isSelected ? 12 : isHovered ? 10 : 7;

        // Glow
        if (isSelected || isHovered) {
          const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 3);
          glow.addColorStop(0, `${color}40`);
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r * 3, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? color : `${color}cc`;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : `${color}40`;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();

        // Label
        if (isSelected || isHovered || zoom > 0.8) {
          ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
          ctx.font = isSelected ? 'bold 11px Inter' : '10px Inter';
          ctx.textAlign = 'center';
          const label = node.label.length > 16 ? node.label.slice(0, 16) + '...' : node.label;
          ctx.fillText(label, pos.x, pos.y + r + 12);
        }
      });

      // Restore transform state
      ctx.restore();
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData, positions, selectedNode, hoveredNode, zoom, panOffset]);

  // Convert mouse screen coordinates to model coordinate system
  const getModelCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // Screen mouse position on canvas element size
    const screenX = (clientX - rect.left) * (canvas.width / rect.width);
    const screenY = (clientY - rect.top) * (canvas.height / rect.height);
    // Reverse zoom and pan transformation
    const modelX = (screenX - panOffset.x) / zoom;
    const modelY = (screenY - panOffset.y) / zoom;
    return { screenX, screenY, modelX, modelY };
  };

  const getNodeAt = (modelX: number, modelY: number) => {
    if (!graphData) return null;
    for (const node of graphData.nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const dist = Math.sqrt((pos.x - modelX) ** 2 + (pos.y - modelY) ** 2);
      // Touch/click target sensitivity increases slightly with lower zoom
      const hitRadius = Math.max(14, 14 / zoom);
      if (dist < hitRadius) return node;
    }
    return null;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const { screenX, screenY, modelX, modelY } = getModelCoords(e.clientX, e.clientY);

    if (isDragging.current) {
      if (dragNode.current) {
        // Dragging a node in model space
        setPositions(prev => ({
          ...prev,
          [dragNode.current!]: { x: modelX, y: modelY }
        }));
      } else {
        // Panning the canvas
        const dx = screenX - lastMouse.current.x;
        const dy = screenY - lastMouse.current.y;
        setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    } else {
      const node = getNodeAt(modelX, modelY);
      setHoveredNode(node?.id || null);
    }
    lastMouse.current = { x: screenX, y: screenY };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const { modelX, modelY } = getModelCoords(e.clientX, e.clientY);
    
    // Only register click if we didn't pan significantly
    const node = getNodeAt(modelX, modelY);
    setSelectedNode(node);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const { screenX, screenY, modelX, modelY } = getModelCoords(e.clientX, e.clientY);
    
    const node = getNodeAt(modelX, modelY);
    isDragging.current = true;
    lastMouse.current = { x: screenX, y: screenY };
    
    if (node) {
      dragNode.current = node.id;
    } else {
      dragNode.current = null;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    dragNode.current = null;
  };

  const entityTypes = [...new Set(graphData?.nodes.map(n => n.type) || [])];
  const relationTypes = [...new Set(graphData?.edges.map(e => e.relation) || [])];

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="badge badge-cyan mb-2">
            <Network size={11} className="mr-1" /> Knowledge Graph
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Ontologi Miskonsepsi Fisika</h1>
          <p className="text-[#4a6fa5]">
            Struktur ontologi representasi relasi konseptual, intervensi, asesmen, dan penyebab miskonsepsi fisika
          </p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Nodes', value: stats.total_nodes, color: '#3b82f6' },
              { label: 'Total Edges', value: stats.total_edges, color: '#8b5cf6' },
              { label: 'Domain Fisika', value: stats.domain_count, color: '#06b6d4' },
              { label: 'Miskonsepsi', value: stats.misconception_count, color: '#f43f5e' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-card p-4 text-center">
                <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
                <div className="text-xs text-[#4a6fa5]">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#1e3a5f] bg-[#0d1525] text-sm text-[#8fb3d8] focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Semua Entitas</option>
            {entityTypes.map(t => (
              <option key={t} value={t}>{ENTITY_LABELS[t] || t}</option>
            ))}
          </select>
          <select
            value={filterRelation}
            onChange={e => setFilterRelation(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#1e3a5f] bg-[#0d1525] text-sm text-[#8fb3d8] focus:outline-none focus:border-blue-500/50"
          >
            <option value="">Semua Relasi</option>
            {relationTypes.map(r => (
              <option key={r} value={r}>{RELATION_LABELS[r] || r}</option>
            ))}
          </select>
          {(filterType || filterRelation) && (
            <button onClick={() => { setFilterType(''); setFilterRelation(''); }}
                    className="px-3 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-3 glass-card overflow-hidden relative">
            {loading ? (
              <div className="flex items-center justify-center h-[500px]">
                <div className="flex gap-1">{[...Array(3)].map((_, i) => <div key={i} className="pulse-dot" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-[#1e3a5f] flex items-center justify-between">
                  <span className="text-sm text-[#8fb3d8]">
                    {graphData?.nodes.length} nodes · {graphData?.edges.length} edges
                  </span>
                  <span className="text-xs text-[#4a6fa5]">Klik node untuk detail · Drag untuk geser/pan · Scroll/Gunakan tombol zoom</span>
                </div>
                
                {/* Floating Zoom & Pan Controls */}
                <div className="absolute bottom-4 right-4 flex gap-1 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl backdrop-blur shadow-2xl z-10">
                  <button 
                    onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} 
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-[#1e3a5f]/40 text-[#8fb3d8] hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={15} />
                  </button>
                  <button 
                    onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} 
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-[#1e3a5f]/40 text-[#8fb3d8] hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button 
                    onClick={() => { setZoom(0.95); setPanOffset({ x: 10, y: 10 }); }} 
                    className="w-8 h-8 rounded-lg bg-slate-900 border border-[#1e3a5f]/40 text-[#8fb3d8] hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
                    title="Reset View"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  className="w-full cursor-grab active:cursor-grabbing"
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </>
            )}
          </div>

          {/* Legend + Detail Panel */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Layers size={14} className="text-blue-400" /> Legenda
              </h3>
              <div className="space-y-2">
                <div className="text-xs text-[#4a6fa5] font-medium uppercase mb-1">Entitas</div>
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs text-[#8fb3d8]">{ENTITY_LABELS[type] || type.replace('_', ' ')}</span>
                  </div>
                ))}
                <div className="text-xs text-[#4a6fa5] font-medium uppercase mb-1 mt-3">Relasi</div>
                {Object.entries(RELATION_COLORS).map(([rel, color]) => (
                  <div key={rel} className="flex items-center gap-2">
                    <div className="w-6 h-0.5" style={{ background: color }} />
                    <span className="text-xs text-[#8fb3d8]">{RELATION_LABELS[rel] || rel}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Node Detail */}
            {selectedNode && (
              <div className="glass-card p-4 animate-slide-in">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Info size={14} className="text-cyan-400" /> Detail Node
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-[#4a6fa5] mb-0.5">ID</div>
                    <div className="text-xs font-mono text-[#8fb3d8]">{selectedNode.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#4a6fa5] mb-0.5">Label</div>
                    <div className="text-sm font-medium text-white">{selectedNode.label}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#4a6fa5] mb-0.5">Tipe</div>
                    <div className="badge text-xs" style={{
                      background: `${NODE_COLORS[selectedNode.type]}20`,
                      color: NODE_COLORS[selectedNode.type] || '#94a3b8',
                      border: `1px solid ${NODE_COLORS[selectedNode.type]}30`,
                    }}>
                      {ENTITY_LABELS[selectedNode.type] || selectedNode.type}
                    </div>
                  </div>
                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                    <div>
                      <div className="text-[10px] text-[#4a6fa5] mb-1">Properties</div>
                      {Object.entries(selectedNode.properties).map(([k, v]) => (
                        <div key={k} className="text-xs text-[#8fb3d8] flex gap-1 mb-0.5">
                          <span className="text-[#4a6fa5]">{k}:</span>
                          <span>{String(v).slice(0, 40)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] text-[#4a6fa5] mb-1">Koneksi</div>
                    <div className="text-xs text-[#8fb3d8]">
                      → {graphData?.edges.filter(e => e.source === selectedNode.id).length || 0} outgoing
                    </div>
                    <div className="text-xs text-[#8fb3d8]">
                      ← {graphData?.edges.filter(e => e.target === selectedNode.id).length || 0} incoming
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

