'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Network, TrendingUp, Users, BookOpen, Map, Zap,
  ChevronDown, Info, BarChart3, Globe
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import {
  getPublicationTrends, getAuthorNetwork, getKeywordBurst,
  getCitationImpact, getGeographicDistribution, getDomainHeatmap,
  getCoWordAnalysis
} from '@/lib/api';

const TABS = [
  { id: 'publication', label: 'Tren Publikasi', icon: TrendingUp, color: '#3b82f6' },
  { id: 'author', label: 'Jaringan Penulis', icon: Users, color: '#8b5cf6' },
  { id: 'keyword', label: 'Keyword Burst', icon: Zap, color: '#f59e0b' },
  { id: 'citation', label: 'Citation Impact', icon: BarChart3, color: '#10b981' },
  { id: 'geographic', label: 'Geographic', icon: Map, color: '#06b6d4' },
  { id: 'coword', label: 'Co-word Analysis', icon: Network, color: '#ec4899' },
];

const COVERAGE_COLORS: Record<string, string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#f97316',
  gap: '#ef4444',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm border border-slate-700/50 shadow-2xl">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <p className="text-slate-200">{entry.name}: <span className="font-semibold text-white">{entry.value?.toLocaleString('id-ID')}</span></p>
        </div>
      ))}
    </div>
  );
};

// Simple canvas-based author network
function AuthorNetworkCanvas({ networkData }: { networkData: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<any[]>([]);
  const isDragging = useRef(false);
  const dragNode = useRef<any>(null);
  const [hovered, setHovered] = useState<any>(null);

  useEffect(() => {
    if (!networkData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    // Init node positions
    const nodes = networkData.nodes.map((n: any, i: number) => ({
      ...n,
      x: W / 2 + (Math.cos((i / networkData.nodes.length) * Math.PI * 2) * W * 0.35),
      y: H / 2 + (Math.sin((i / networkData.nodes.length) * Math.PI * 2) * H * 0.35),
      vx: 0, vy: 0,
      r: Math.max(10, Math.min(28, n.h_index * 2)),
    }));
    nodesRef.current = nodes;

    const edges = networkData.edges;

    // Force simulation
    let tick = 0;
    const simulate = () => {
      tick++;

      nodes.forEach((n: any) => {
        // Repulsion
        nodes.forEach((m: any) => {
          if (n.id === m.id) return;
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2000 / (dist * dist);
          n.vx += (dx / dist) * force;
          n.vy += (dy / dist) * force;
        });

        // Center attraction
        n.vx += (W / 2 - n.x) * 0.005;
        n.vy += (H / 2 - n.y) * 0.005;

        // Edge spring
        edges.forEach((e: any) => {
          if (e.source !== n.id && e.target !== n.id) return;
          const other = nodes.find((m: any) => m.id === (e.source === n.id ? e.target : e.source));
          if (!other) return;
          const dx = other.x - n.x;
          const dy = other.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const target = 100 + (e.weight || 1) * 10;
          const spring = (dist - target) * 0.02;
          n.vx += (dx / dist) * spring;
          n.vy += (dy / dist) * spring;
        });

        // Damping
        if (!isDragging.current || dragNode.current?.id !== n.id) {
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
        }

        // Bounds
        n.x = Math.max(n.r + 5, Math.min(W - n.r - 5, n.x));
        n.y = Math.max(n.r + 5, Math.min(H - n.r - 5, n.y));
      });

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Edges
      edges.forEach((e: any) => {
        const src = nodes.find((n: any) => n.id === e.source);
        const tgt = nodes.find((n: any) => n.id === e.target);
        if (!src || !tgt) return;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = e.strength === 'strong' ? 'rgba(139,92,246,0.5)' : e.strength === 'medium' ? 'rgba(59,130,246,0.3)' : 'rgba(100,116,139,0.2)';
        ctx.lineWidth = e.strength === 'strong' ? 2.5 : e.strength === 'medium' ? 1.5 : 1;
        ctx.stroke();
      });

      // Nodes
      nodes.forEach((n: any) => {
        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 1.5);
        grad.addColorStop(0, 'rgba(59,130,246,0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,0.8)`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(147,197,253,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(9, Math.min(12, n.r - 2))}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const name = n.label.split(' ')[0];
        ctx.fillText(name, n.x, n.y);
      });

      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [networkData]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={700}
        height={420}
        className="w-full rounded-xl"
        style={{ background: 'transparent' }}
        onMouseMove={(e) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const scaleX = canvasRef.current.width / rect.width;
          const scaleY = canvasRef.current.height / rect.height;
          const mx = (e.clientX - rect.left) * scaleX;
          const my = (e.clientY - rect.top) * scaleY;
          const found = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) < n.r + 4);
          setHovered(found || null);
          if (isDragging.current && dragNode.current) {
            dragNode.current.x = mx;
            dragNode.current.y = my;
          }
        }}
        onMouseDown={(e) => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const scaleX = canvasRef.current.width / rect.width;
          const scaleY = canvasRef.current.height / rect.height;
          const mx = (e.clientX - rect.left) * scaleX;
          const my = (e.clientY - rect.top) * scaleY;
          const found = nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) < n.r + 4);
          if (found) { isDragging.current = true; dragNode.current = found; }
        }}
        onMouseUp={() => { isDragging.current = false; dragNode.current = null; }}
        onMouseLeave={() => { isDragging.current = false; dragNode.current = null; setHovered(null); }}
      />
      {hovered && (
        <div className="absolute top-3 left-3 glass-card px-3 py-2 text-xs border border-slate-700/50 pointer-events-none">
          <p className="text-white font-bold">{hovered.label}</p>
          <p className="text-slate-400">{hovered.institution}</p>
          <p className="text-blue-400">h-index: {hovered.h_index} · {hovered.total_papers} papers</p>
        </div>
      )}
    </div>
  );
}

export function ScientometricsView() {
  const [activeTab, setActiveTab] = useState('publication');
  const [pubData, setPubData] = useState<any>(null);
  const [networkData, setNetworkData] = useState<any>(null);
  const [burstData, setBurstData] = useState<any>(null);
  const [citationData, setCitationData] = useState<any>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [coWordData, setCoWordData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPublicationTrends().catch(() => null),
      getAuthorNetwork().catch(() => null),
      getKeywordBurst().catch(() => null),
      getCitationImpact().catch(() => null),
      getGeographicDistribution().catch(() => null),
      getCoWordAnalysis().catch(() => null),
    ]).then(([pub, net, burst, cit, geo, coword]) => {
      if (pub) setPubData(pub);
      if (net) setNetworkData(net);
      if (burst) setBurstData(burst);
      if (cit) setCitationData(cit);
      if (geo) setGeoData(geo);
      if (coword) setCoWordData(coword);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pink-500/20 bg-pink-500/10 text-pink-300 text-sm font-medium mb-6">
            <Network size={14} />
            <span>Scientometrics & Bibliometrics</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Scientometrics <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">Analytics</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Analisis ilmu pengetahuan tentang ilmu pengetahuan — pola produksi, kolaborasi,
            dan evolusi komunitas riset miskonsepsi fisika Indonesia 1996–2026.
          </p>
        </motion.div>

        {/* KPI Banner */}
        {!loading && pubData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Total Publikasi', value: pubData.summary.total_publications.toLocaleString('id-ID'), icon: BookOpen, color: '#3b82f6' },
              { label: 'Rata-rata Pertumbuhan', value: `${pubData.summary.avg_annual_growth_rate}%/thn`, icon: TrendingUp, color: '#10b981' },
              { label: 'Peak Year', value: pubData.summary.peak_year, icon: BarChart3, color: '#f59e0b' },
              { label: 'Total Peneliti', value: networkData?.stats?.total_researchers || '-', icon: Users, color: '#8b5cf6' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={15} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-700/50 pb-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-white border'
                  : 'text-slate-400 hover:text-white'
              }`}
              style={activeTab === tab.id ? { backgroundColor: `${tab.color}15`, borderColor: `${tab.color}30`, color: tab.color } : {}}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="glass-card h-96 animate-pulse" />
        ) : (
          <>
            {/* Publication Trends */}
            {activeTab === 'publication' && pubData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold text-white mb-1">Annual Publication Count (APC) 1996–2026</h2>
                  <p className="text-slate-400 text-sm mb-6">Jumlah publikasi per tahun dengan breakdown sumber</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pubData.data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          {[
                            { key: 'sinta_count', color: '#3b82f6' },
                            { key: 'conference_count', color: '#8b5cf6' },
                            { key: 'scopus_count', color: '#10b981' },
                          ].map(({ key, color }) => (
                            <linearGradient key={key} id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend formatter={v => <span className="text-slate-300 text-sm">{v}</span>} />
                        <Area type="monotone" dataKey="sinta_count" name="SINTA" stroke="#3b82f6" fill="url(#grad_sinta_count)" strokeWidth={2} />
                        <Area type="monotone" dataKey="conference_count" name="Prosiding" stroke="#8b5cf6" fill="url(#grad_conference_count)" strokeWidth={2} />
                        <Area type="monotone" dataKey="scopus_count" name="Scopus" stroke="#10b981" fill="url(#grad_scopus_count)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Key Events */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pubData.key_events?.map((ev: any) => (
                    <div key={ev.year} className={`glass-card p-4 flex items-start gap-3 border-l-2 ${ev.type === 'disruption' ? 'border-l-red-500' : ev.type === 'policy' ? 'border-l-amber-500' : ev.type === 'technology' ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
                      <div className="text-xl font-bold text-slate-500 shrink-0">{ev.year}</div>
                      <p className="text-slate-300 text-sm">{ev.event}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Author Network */}
            {activeTab === 'author' && networkData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Author Collaboration Network</h2>
                      <p className="text-slate-400 text-sm mt-1">Node size ∝ h-index · Edge weight ∝ jumlah makalah bersama · Drag untuk eksplorasi</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-purple-400 opacity-70" /><span>Kuat</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-400 opacity-50" /><span>Sedang</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-slate-500 opacity-40" /><span>Lemah</span></div>
                    </div>
                  </div>
                  <AuthorNetworkCanvas networkData={networkData} />
                </div>
                {/* Clusters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {networkData.clusters?.map((cl: any) => (
                    <div key={cl.name} className="glass-card p-4">
                      <h3 className="text-white font-semibold text-sm mb-2">{cl.name}</h3>
                      <p className="text-xs text-slate-400 mb-2">Hub: <span className="text-blue-400">{networkData.nodes.find((n: any) => n.id === cl.hub)?.label}</span></p>
                      <div className="flex flex-wrap gap-1">
                        {cl.members.map((m: string) => {
                          const author = networkData.nodes.find((n: any) => n.id === m);
                          return author ? (
                            <span key={m} className="badge badge-blue text-xs">{author.label.split(' ')[0]}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Keyword Burst */}
            {activeTab === 'keyword' && burstData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold text-white mb-1">Keyword Burst Analysis</h2>
                  <p className="text-slate-400 text-sm mb-6">Kata kunci yang mengalami lonjakan frekuensi signifikan (Kleinberg-inspired)</p>

                  {/* Burst Timeline */}
                  <div className="space-y-3">
                    {burstData.bursts?.map((kw: any, i: number) => {
                      const startPct = ((kw.burst_start - 1996) / 9) * 100;
                      const widthPct = ((kw.burst_end - kw.burst_start + 1) / 9) * 100;
                      const intensity = kw.burst_strength / 9;
                      return (
                        <div key={kw.keyword} className="flex items-center gap-4">
                          <div className="w-44 text-right text-xs text-slate-300 font-medium shrink-0 truncate">{kw.keyword}</div>
                          <div className="flex-1 h-5 bg-slate-800 rounded-full relative overflow-hidden">
                            <div
                              className="absolute top-0 h-full rounded-full flex items-center justify-center"
                              style={{
                                left: `${startPct}%`,
                                width: `${Math.max(8, widthPct)}%`,
                                backgroundColor: `hsl(${220 + i * 18}, 80%, 60%)`,
                                opacity: 0.6 + intensity * 0.4,
                              }}
                            />
                          </div>
                          <div className="w-10 text-right text-xs font-bold text-amber-400 shrink-0">{kw.burst_strength.toFixed(1)}</div>
                          {kw.trigger && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">{kw.trigger}</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Year ruler */}
                    <div className="flex items-center gap-4 pt-2">
                      <div className="w-44 shrink-0" />
                      <div className="flex-1 flex justify-between text-xs text-slate-600">
                        {[1996,2018,2020,2022,2024,2026].map(y => <span key={y}>{y}</span>)}
                      </div>
                      <div className="w-10 shrink-0" />
                    </div>
                  </div>
                </div>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-card p-4">
                    <h3 className="text-white font-semibold text-sm mb-3">COVID-Triggered Bursts</h3>
                    {burstData.summary?.covid_triggered?.map((kw: any) => (
                      <div key={kw.keyword} className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <span className="text-slate-300 text-sm">{kw.keyword}</span>
                        <span className="text-red-400 font-bold text-sm">{kw.burst_strength.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="glass-card p-4">
                    <h3 className="text-white font-semibold text-sm mb-3">Currently Active (≥2024)</h3>
                    {burstData.summary?.currently_active?.map((kw: any) => (
                      <div key={kw.keyword} className="flex justify-between items-center py-2 border-b border-slate-700/30">
                        <span className="text-slate-300 text-sm">{kw.keyword}</span>
                        <span className="text-emerald-400 font-bold text-sm">aktif</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Citation Impact */}
            {activeTab === 'citation' && citationData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold text-white mb-1">Domain Citation Impact</h2>
                  <p className="text-slate-400 text-sm mb-6">h-index proxy per domain berdasarkan frekuensi miskonsepsi teridentifikasi</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={citationData.data} layout="vertical" margin={{ top: 0, right: 30, left: 90, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} width={85} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="h_index_proxy" name="h-index proxy" radius={[0, 4, 4, 0]} barSize={14}>
                          {citationData.data?.map((_: any, i: number) => (
                            <Cell key={i} fill={`hsl(${200 + i * 15}, 70%, 55%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/20 flex items-start gap-2">
                  <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-500">{citationData.methodology_note}</p>
                </div>
              </motion.div>
            )}

            {/* Geographic */}
            {activeTab === 'geographic' && geoData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold text-white mb-1">Distribusi Geografis Penelitian</h2>
                  <p className="text-slate-400 text-sm mb-4">Jumlah studi miskonsepsi fisika per provinsi — identifikasi research gaps geografis</p>
                  {/* Coverage summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Cakupan Tinggi', count: geoData.summary?.high_coverage?.length, color: '#10b981', prov: geoData.summary?.high_coverage },
                      { label: 'Cakupan Sedang', count: geoData.data?.filter((p: any) => p.coverage === 'medium').length, color: '#f59e0b', prov: [] },
                      { label: 'Cakupan Rendah', count: geoData.summary?.low_coverage?.length, color: '#f97316', prov: geoData.summary?.low_coverage },
                      { label: 'GAP Kritis', count: geoData.summary?.critical_gaps?.length, color: '#ef4444', prov: geoData.summary?.critical_gaps },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="p-3 rounded-xl" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}30` }}>
                        <div className="text-2xl font-bold" style={{ color }}>{count}</div>
                        <div className="text-xs text-slate-400">{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Province bars */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={geoData.data?.slice(0, 15)} layout="vertical" margin={{ top: 0, right: 30, left: 130, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="province" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={125} />
                        <Tooltip content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          return (
                            <div className="glass-card px-3 py-2 text-xs border border-slate-700/50">
                              <p className="text-white font-bold">{label}</p>
                              <p className="text-blue-400">{d.study_count} studi · {d.institution_count} institusi</p>
                              <p className="text-slate-400">Top domain: {d.top_domain}</p>
                              <p style={{ color: COVERAGE_COLORS[d.coverage] }}>Coverage: {d.coverage}</p>
                            </div>
                          );
                        }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="study_count" name="Jumlah Studi" radius={[0, 4, 4, 0]} barSize={12}>
                          {geoData.data?.slice(0, 15).map((d: any, i: number) => (
                            <Cell key={i} fill={COVERAGE_COLORS[d.coverage] || '#64748b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Gap provinces */}
                {geoData.summary?.critical_gaps?.length > 0 && (
                  <div className="glass-card p-5 border-l-2 border-l-red-500">
                    <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2"><Globe size={16} />Provinsi GAP Kritis — Tidak Ada Studi Tercatat</h3>
                    <div className="flex flex-wrap gap-2">
                      {geoData.summary.critical_gaps.map((p: string) => (
                        <span key={p} className="badge badge-rose">{p}</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">Penelitian di provinsi-provinsi ini sangat dibutuhkan untuk memastikan pemerataan pengetahuan pendidikan fisika.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Co-word Analysis */}
            {activeTab === 'coword' && coWordData && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-bold text-white mb-1">Intellectual Structure Map</h2>
                  <p className="text-slate-400 text-sm mb-6">Kluster kata kunci yang membentuk struktur intelektual penelitian miskonsepsi fisika Indonesia</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coWordData.clusters?.map((cl: any) => (
                      <div
                        key={cl.cluster_id}
                        className="p-4 rounded-xl border"
                        style={{ backgroundColor: `${cl.color}08`, borderColor: `${cl.color}20` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-white text-sm">{cl.name}</h3>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cl.color}20`, color: cl.color }}>
                            {cl.size} studi
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cl.keywords.map((kw: string) => (
                            <span key={kw} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">{kw}</span>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Sentralitas:</span>
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                              <div className="h-full rounded-full" style={{ width: `${cl.centrality * 100}%`, backgroundColor: cl.color }} />
                            </div>
                            <span className="text-xs font-mono" style={{ color: cl.color }}>{(cl.centrality * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Links between clusters */}
                <div className="glass-card p-5">
                  <h3 className="text-white font-semibold mb-4">Hubungan Antar Kluster</h3>
                  <div className="space-y-2">
                    {coWordData.links?.map((link: any) => {
                      const srcCluster = coWordData.clusters?.find((c: any) => c.cluster_id === link.source);
                      const tgtCluster = coWordData.clusters?.find((c: any) => c.cluster_id === link.target);
                      return (
                        <div key={`${link.source}-${link.target}`} className="flex items-center gap-3 py-2 border-b border-slate-700/30">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: srcCluster?.color + '20', color: srcCluster?.color }}>
                            {srcCluster?.name?.split(' ')[0]}
                          </span>
                          <div className="flex-1 h-0.5 bg-slate-700 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-2 text-xs text-slate-400 whitespace-nowrap">
                              {(link.weight * 100).toFixed(0)}%
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: tgtCluster?.color + '20', color: tgtCluster?.color }}>
                            {tgtCluster?.name?.split(' ')[0]}
                          </span>
                          <span className="text-xs text-slate-500 hidden md:block">{link.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
