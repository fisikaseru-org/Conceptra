'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Activity, AlertTriangle, Calendar, Layers } from 'lucide-react';
import { getTopicOverview, getHeatmap, getTrends, getCovidImpact, getTopicRiver, getKeywordBurst } from '@/lib/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
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

  const covidChangeData = (covidImpact?.domain_changes || []).slice(0, 8).map((d: any) => ({
    domain: d.domain?.length > 10 ? d.domain.slice(0, 10) : d.domain,
    fullDomain: d.domain,
    change: d.change_percent,
    pre: d.pre_covid_freq,
    post: d.post_covid_freq,
  }));

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
                <div className="glass-card p-6 border-rose-500/20 bg-rose-500/5">
                  <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-400" />
                    Dampak COVID-19 pada Penelitian Miskonsepsi Fisika
                  </h2>
                  <p className="text-[#8fb3d8] text-sm">{covidImpact.summary}</p>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-semibold text-white mb-6">Perbandingan Pre & Post COVID Per Domain (%)</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={covidChangeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                      <XAxis dataKey="domain" tick={{ fill: '#4a6fa5', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#4a6fa5', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="change" name="Perubahan (%)" radius={[4, 4, 0, 0]}>
                        {covidChangeData.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.change > 0 ? '#ef4444' : '#10b981'} opacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-[#4a6fa5] mt-2 text-center">Merah = meningkat · Hijau = menurun pasca-COVID</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <div className="text-xs text-[#4a6fa5] mb-1">Pre-COVID</div>
                    <div className="text-2xl font-bold text-blue-400">1996–2019</div>
                    <div className="text-xs text-[#4a6fa5]">Fokus: Instrumen diagnostik</div>
                  </div>
                  <div className="glass-card p-4 text-center border-rose-500/30">
                    <div className="text-xs text-rose-400 mb-1">🦠 PANDEMI</div>
                    <div className="text-2xl font-bold text-rose-400">2020–2022</div>
                    <div className="text-xs text-[#4a6fa5]">Shift ke pembelajaran digital</div>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <div className="text-xs text-[#4a6fa5] mb-1">Post-COVID</div>
                    <div className="text-2xl font-bold text-emerald-400">2023–2026</div>
                    <div className="text-xs text-[#4a6fa5]">AI + Hybrid Learning</div>
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
