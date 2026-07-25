'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Activity, AlertTriangle, Calendar, Layers } from 'lucide-react';
import { getTopicOverview, getHeatmap, getTrends, getCovidImpact, getTopicRiver, getKeywordBurst } from '@/lib/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LabelList
} from 'recharts';

const DOMAIN_COLORS: Record<string, string> = {
  'Mekanika': '#3b82f6', 'Fluida': '#06b6d4', 'Gelombang': '#8b5cf6',
  'Optik': '#f59e0b', 'Listrik': '#f97316', 'Magnet': '#f43f5e',
  'Elektromagnetik': '#ec4899', 'Termodinamika': '#ef4444',
  'Fisika Modern': '#10b981', 'Kuantum': '#14b8a6',
  'Relativitas': '#6366f1', 'Nuklir': '#dc2626',
  'Astronomi': '#a855f7', 'Fisika Digital': '#22c55e',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-4 py-3 text-sm max-w-xs">
        <p className="text-[#8fb3d8] font-medium mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-[#8fb3d8] text-xs">{entry.name}:</span>
            <span style={{ color: entry.color }} className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function TopicsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [burstEvents, setBurstEvents] = useState<any[]>([]);
  const [covidImpact, setCovidImpact] = useState<any>(null);
  const [topicRiver, setTopicRiver] = useState<any>(null);
  const [keywordBurst, setKeywordBurst] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'river' | 'trends' | 'covid' | 'topics'>('timeline');

  useEffect(() => {
    Promise.all([
      getTopicOverview(),
      getTrends(),
      getCovidImpact(),
      getTopicRiver().catch(() => null),
      getKeywordBurst().catch(() => null),
    ]).then(([ov, tr, cv, river, burst]) => {
      setOverview(ov);
      setTrends(tr.trends as any[]);
      setBurstEvents(tr.burst_events as any[]);
      setCovidImpact(cv);
      if (river) setTopicRiver(river);
      if (burst) setKeywordBurst(burst);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const yearlyData = (overview?.yearly_summary as any[]) || [];
  const topicsLDA = (overview?.lda_topics as any[]) || [];

  const lineData = yearlyData.map((d: any) => ({
    year: d.year,
    active: d.total_active,
    covid: d.post_covid,
  }));

  const trendChartData = trends.map(t => ({
    name: t.domain?.length > 10 ? t.domain.slice(0, 10) + '...' : t.domain,
    fullName: t.domain,
    total: t.total,
    slope: parseFloat((t.trend_slope * 10 + 5).toFixed(1)),
    trend: t.trend,
    peak: t.peak_year,
  }));

  const covidChangeData = (covidImpact?.domain_changes || [])
    .slice(0, 8)
    .map((d: any) => {
      const pre = parseFloat(d.pre_covid_freq?.toFixed(1) || '0');
      const post = parseFloat(d.post_covid_freq?.toFixed(1) || '0');
      const total = pre + post;
      const prePct = total > 0 ? (pre / total) * 100 : 0;
      const postPct = total > 0 ? (post / total) * 100 : 0;

      return {
        domain: d.domain?.length > 15 ? d.domain.slice(0, 15) + '...' : d.domain,
        fullDomain: d.domain,
        change: parseFloat(d.change_percent?.toFixed(1) || '0'),
        pre,
        post,
        prePct: parseFloat(prePct.toFixed(1)),
        postPct: parseFloat(postPct.toFixed(1)),
      };
    })
    .sort((a: any, b: any) => b.postPct - a.postPct); // Sort by highest Post-COVID shift

  const CovidTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      const isPositive = data.change >= 0;
      return (
        <div className="glass-card p-4 text-sm max-w-sm border border-slate-700/50 shadow-2xl backdrop-blur-xl bg-[#0d1525]/95">
          <p className="text-white font-bold mb-3 text-base border-b border-slate-700/50 pb-2">{data.fullDomain}</p>
          
          <div className="space-y-3">
            {/* Proportions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Proporsi Riset (Rerata/Thn)</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 flex overflow-hidden shadow-inner">
                <div style={{ width: `${data.prePct}%` }} className="bg-gradient-to-r from-blue-600 to-blue-400 h-full" />
                <div style={{ width: `${data.postPct}%` }} className="bg-gradient-to-r from-rose-500 to-rose-400 h-full" />
              </div>
              <div className="flex justify-between text-[11px] font-bold mt-1">
                <span className="text-blue-400">Pre: {data.prePct}%</span>
                <span className="text-rose-400">Post: {data.postPct}%</span>
              </div>
            </div>
            
            {/* Raw Values Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
              <div className="bg-blue-900/20 p-2.5 rounded-lg border border-blue-500/20">
                <div className="text-[10px] text-blue-300/70 uppercase font-semibold mb-1 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Pre-COVID
                </div>
                <div className="font-bold text-blue-100 text-lg leading-none">{data.pre} <span className="text-[10px] font-normal text-blue-300/50">/ thn</span></div>
              </div>
              <div className="bg-rose-900/20 p-2.5 rounded-lg border border-rose-500/20">
                <div className="text-[10px] text-rose-300/70 uppercase font-semibold mb-1 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Post-COVID
                </div>
                <div className="font-bold text-rose-100 text-lg leading-none">{data.post} <span className="text-[10px] font-normal text-rose-300/50">/ thn</span></div>
              </div>
            </div>
            
            {/* Growth Badge */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-400 text-xs">Pertumbuhan Pasca-COVID:</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isPositive ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                {isPositive ? '↑ +' : '↓ '}{data.change}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen grid-pattern">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="badge badge-purple mb-2">
            <TrendingUp size={11} className="mr-1" /> Evolusi Topik
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Analisis Topik Temporal 1996–2026</h1>
          <p className="text-[#4a6fa5]">
            Dynamic Topic Modeling berbasis BERTopic, UMAP, HDBSCAN + Kleinberg Burst Detection
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#0d1525] border border-[#1e3a5f] rounded-xl p-1 mb-6 w-fit">
          {[
            { id: 'timeline', label: 'Timeline', icon: Calendar },
            { id: 'river', label: 'Topic River', icon: Layers },
            { id: 'trends', label: 'Tren Domain', icon: TrendingUp },
            { id: 'covid', label: 'Dampak COVID', icon: AlertTriangle },
            { id: 'topics', label: 'LDA Topics', icon: Activity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id ? 'bg-purple-600 text-white' : 'text-[#4a6fa5] hover:text-white'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-64 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Topic River Tab — Streamgraph (GMD §8.2 Halaman 2) */}
            {activeTab === 'river' && topicRiver && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h2 className="font-semibold text-white text-xl mb-1">Topic River — Evolusi Proporsi Domain 1996–2026</h2>
                      <p className="text-slate-400 text-sm">
                        Lebar aliran setiap topik merepresentasikan proporsi penelitian. Stackerd Area Chart sebagai pendekatan Streamgraph.
                      </p>
                    </div>
                  </div>

                  {/* Annotations */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {topicRiver.annotations?.map((ann: any) => (
                      <div key={ann.year} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: ann.color + '20', color: ann.color, border: `1px solid ${ann.color}40` }}>
                        <span className="font-bold">{ann.year}:</span>
                        <span>{ann.label}</span>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={380}>
                    <AreaChart data={topicRiver.data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={v => <span className="text-slate-300 text-xs">{v}</span>} />
                      {Object.entries(topicRiver.topic_colors || {}).map(([topic, color]: [string, any]) => (
                        <Area
                          key={topic}
                          type="monotone"
                          dataKey={topic}
                          stackId="1"
                          stroke={color}
                          fill={color}
                          fillOpacity={0.75}
                          strokeWidth={0}
                          name={topic}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Findings */}
                <div className="glass-card p-5">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Layers size={16} className="text-purple-400" />Temuan Kunci Topic River</h3>
                  <div className="space-y-3">
                    {topicRiver.key_findings?.map((finding: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">{i + 1}</div>
                        <p className="text-slate-300 text-sm">{finding}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-white mb-2">Jumlah Miskonsepsi Aktif per Tahun</h2>
                  <p className="text-[#4a6fa5] text-sm mb-6">Garis merah menandai periode pandemi COVID-19</p>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={lineData}>
                      <defs>
                        <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="year" tick={{ fill: '#4a6fa5', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#4a6fa5', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* COVID reference shading */}
                      {lineData.filter((d: any) => d.covid).map((d: any) => (
                        <line key={d.year} x={d.year} stroke="#ef4444" strokeOpacity={0.2} />
                      ))}
                      <Area
                        type="monotone"
                        dataKey="active"
                        name="Miskonsepsi Aktif"
                        stroke="#8b5cf6"
                        fill="url(#gradActive)"
                        strokeWidth={2.5}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                        activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#c4b5fd', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Burst Events */}
                {burstEvents.length > 0 && (
                  <div className="glass-card p-6">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap size={16} className="text-amber-400" />
                      Kleinberg Burst Events — Lonjakan Topik Terdeteksi
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {burstEvents.map((evt: any, i) => (
                        <div key={i} className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white text-sm">{evt.domain}</span>
                            <span className={`badge ${evt.burst_type === 'pandemic' ? 'badge-rose' : 'badge-amber'}`}>
                              {evt.burst_type === 'pandemic' ? '🦠 Pandemi' : '📈 Organik'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {evt.burst_years?.map((y: number) => (
                              <span key={y} className="badge badge-amber text-xs">{y}</span>
                            ))}
                          </div>
                          <div className="text-xs text-[#4a6fa5]">
                            Intensitas: <strong className="text-amber-300">{evt.burst_intensity}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'trends' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-white mb-2">Total Frekuensi per Domain (1996-2026)</h2>
                  <p className="text-[#4a6fa5] text-sm mb-6">Mekanika & Termodinamika mendominasi penelitian</p>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={trendChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#4a6fa5', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fill: '#8fb3d8', fontSize: 11 }} width={90} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Total Frekuensi" radius={[0, 6, 6, 0]}>
                        {trendChartData.map((entry, i) => (
                          <Cell key={i} fill={DOMAIN_COLORS[entry.fullName] || '#8b5cf6'} opacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trends.map((t: any, i: number) => (
                    <div key={i} className="glass-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{t.domain}</span>
                        <span className={`badge ${t.trend === 'rising' ? 'badge-emerald' : t.trend === 'falling' ? 'badge-rose' : 'badge-blue'}`}>
                          {t.trend === 'rising' ? '↑ Naik' : t.trend === 'falling' ? '↓ Turun' : '→ Stabil'}
                        </span>
                      </div>
                      <div className="text-2xl font-bold mb-1" style={{ color: DOMAIN_COLORS[t.domain] || '#8b5cf6' }}>
                        {t.total}
                      </div>
                      <div className="text-xs text-[#4a6fa5]">
                        Puncak: <strong className="text-[#8fb3d8]">{t.peak_year}</strong> · Slope: {t.trend_slope?.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COVID Impact Tab */}
            {activeTab === 'covid' && covidImpact && (
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className="glass-card p-6 border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-purple-500/5 to-transparent">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-lg">Dampak COVID-19 pada Penelitian Miskonsepsi Fisika</h2>
                      <p className="text-xs text-rose-300">Analisis Pergeseran Perilaku & Tren Topik Sebelum vs Sesudah Pandemi</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mt-3 leading-relaxed">{covidImpact.summary}</p>
                </div>

                {/* Main Visual: Grouped Dual Bar Chart (Horizontal layout so domain names are clear) */}
                <div className="glass-card p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-white text-lg flex items-center gap-2 mb-1">
                        <Activity size={18} className="text-rose-400" />
                        Intensitas Fokus Riset (Pre vs Post COVID)
                      </h3>
                      <p className="text-xs text-slate-400 max-w-2xl">
                        Visualisasi proporsi publikasi tahunan. Bar yang didominasi warna merah (Post-COVID) menandakan topik tersebut mengalami lonjakan popularitas yang signifikan selama dan setelah pandemi.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                        <span className="text-slate-200 font-medium">Pre-COVID</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        <span className="text-slate-200 font-medium">Post-COVID</span>
                      </div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={covidChangeData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }} barSize={32}>
                      <defs>
                        <linearGradient id="gradPre" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={1} />
                        </linearGradient>
                        <linearGradient id="gradPost" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
                          <stop offset="100%" stopColor="#e11d48" stopOpacity={0.9} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                      <XAxis type="number" hide domain={[0, 100]} />
                      <YAxis type="category" dataKey="domain" width={120} tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CovidTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      
                      <Bar dataKey="prePct" name="Pre-COVID" stackId="a" fill="url(#gradPre)" radius={[4, 0, 0, 4]}>
                        <LabelList dataKey="prePct" position="inside" formatter={(v: any) => v > 12 ? `${v}%` : ''} fill="rgba(255,255,255,0.95)" fontSize={11} fontWeight={700} />
                      </Bar>
                      <Bar dataKey="postPct" name="Post-COVID" stackId="a" fill="url(#gradPost)" radius={[0, 4, 4, 0]}>
                        <LabelList dataKey="postPct" position="inside" formatter={(v: any) => v > 12 ? `${v}%` : ''} fill="rgba(255,255,255,0.95)" fontSize={11} fontWeight={700} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Domain Change Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {covidChangeData.map((d: any, idx: number) => {
                    const isPositive = d.change > 0;
                    return (
                      <div key={idx} className="glass-card p-4 flex flex-col justify-between border-slate-800/60 hover:border-slate-700 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-white text-sm">{d.domain}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPositive 
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                : d.change < 0 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                            }`}>
                              {isPositive ? `+${d.change}%` : `${d.change}%`}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-400 mt-3">
                            <div className="flex justify-between">
                              <span>Pre-COVID:</span>
                              <span className="text-slate-200 font-medium">{d.pre} kasus/thn</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Post-COVID:</span>
                              <span className="text-slate-200 font-medium">{d.post} kasus/thn</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress indicator */}
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isPositive ? 'bg-rose-500' : 'bg-emerald-400'}`} 
                            style={{ width: `${Math.min(100, Math.abs(d.change))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 3 Era Timeline Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="glass-card p-5 border-blue-500/30 bg-blue-500/5 relative overflow-hidden">
                    <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">ERA PRE-COVID</div>
                    <div className="text-2xl font-black text-white mb-2">1996–2019</div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Fokus utama pada pengembangan instrumen diagnostik konvensional dan pemetaan konsepsi dasar di kelas tatap muka.
                    </p>
                    <span className="badge badge-blue text-[10px]">Fokus: Diagnostik Kelas Tatap Muka</span>
                  </div>

                  <div className="glass-card p-5 border-rose-500/40 bg-rose-500/10 relative overflow-hidden">
                    <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">🦠 ERA PANDEMI</div>
                    <div className="text-2xl font-black text-white mb-2">2020–2022</div>
                    <p className="text-xs text-rose-200 leading-relaxed mb-3">
                      Terjadi lonjakan miskonsepsi pada topik abstrak akibat transisi mendadak ke Pembelajaran Jarak Jauh (PJJ).
                    </p>
                    <span className="badge border-rose-500/30 bg-rose-500/20 text-rose-300 text-[10px]">Shift: PJJ & Simulasi Digital</span>
                  </div>

                  <div className="glass-card p-5 border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">ERA POST-COVID</div>
                    <div className="text-2xl font-black text-white mb-2">2023–2026</div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Pengintegrasian AI, media remedi berbasis WebAR/VR, dan model pembelajaran *Hybrid / Blended Learning*.
                    </p>
                    <span className="badge badge-emerald text-[10px]">Fokus: AI & Remediasi Hybrid</span>
                  </div>
                </div>
              </div>
            )}

            {/* LDA Topics Tab */}
            {activeTab === 'topics' && (
              <div className="space-y-4">
                <div className="glass-card p-6">
                  <h2 className="font-semibold text-white mb-1">Pseudo-LDA Topics dari Corpus</h2>
                  <p className="text-[#4a6fa5] text-sm mb-6">
                    Topik yang diekstrak berdasarkan distribusi keyword per domain (proxy BERTopic)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topicsLDA.map((topic: any, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-[#0a0f1e] border border-[#1e3a5f]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-white text-sm">{topic.name}</span>
                          <span className="text-xs text-[#4a6fa5]">p={topic.probability?.toFixed(3)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {topic.keywords?.slice(0, 5).map(([kw, score]: [string, number]) => (
                            <span key={kw} className="badge badge-blue text-xs">
                              {kw} ({score})
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-[#4a6fa5]">
                          Coherence: <strong style={{ color: DOMAIN_COLORS[topic.domain] || '#8b5cf6' }}>
                            {topic.coherence_score}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
