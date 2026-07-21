'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, TrendingUp, BarChart3, Zap, ChevronRight,
  Activity, BookOpen, Target, Award, RefreshCw, Info
} from 'lucide-react';
import {
  getExplorerStats, getYearlyBreakdown, type DbStatsSummary
} from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// ─── Config ───────────────────────────────────────────────────────────────────
const DOMAIN_COLORS: Record<string, string> = {
  'Fisika Umum': '#64748b',
  'Mekanika': '#3b82f6',
  'IPA Terpadu': '#eab308',
  'Listrik': '#f97316',
  'Termodinamika': '#ef4444',
  'Optika': '#f59e0b',
  'Gelombang': '#8b5cf6',
  'Fluida': '#06b6d4',
  'Astronomi': '#a855f7',
  'Magnetisme': '#f43f5e',
  'Fisika Modern': '#10b981',
  'Sains Terapan (STEM)': '#ec4899',
};

const TOP_DOMAINS = ['Mekanika', 'Listrik', 'Termodinamika', 'Optika', 'Gelombang', 'Fluida', 'Astronomi', 'Fisika Modern'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm border border-slate-700/50 shadow-2xl max-w-xs">
      <p className="text-slate-300 font-semibold mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <p className="text-slate-300 text-xs">{entry.name}: <span className="font-bold text-white">{entry.value?.toLocaleString('id-ID')}</span></p>
        </div>
      ))}
    </div>
  );
};

// ─── Heatmap Component ────────────────────────────────────────────────────────
function DomainHeatmap({ yearlyData }: { yearlyData: any[] }) {
  const years = yearlyData.map(d => d.year).sort((a, b) => a - b);
  const domains = TOP_DOMAINS;

  const maxCount = Math.max(...yearlyData.flatMap(y => domains.map(d => y.domains[d]?.count || 0)));

  const getColor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.02)';
    const intensity = count / maxCount;
    if (intensity < 0.2) return 'rgba(59,130,246,0.15)';
    if (intensity < 0.4) return 'rgba(59,130,246,0.3)';
    if (intensity < 0.6) return 'rgba(99,102,241,0.5)';
    if (intensity < 0.8) return 'rgba(139,92,246,0.65)';
    return 'rgba(168,85,247,0.85)';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header */}
        <div className="flex mb-1">
          <div className="w-28 shrink-0" />
          <div className="flex gap-0.5 flex-1">
            {years.filter((_, i) => i % 5 === 0 || i === years.length - 1).map(y => (
              <div key={y} className="text-[9px] text-slate-600 flex-1 text-center">{y}</div>
            ))}
          </div>
        </div>

        {/* Domain rows */}
        {domains.map(domain => {
          const color = DOMAIN_COLORS[domain] || '#64748b';
          return (
            <div key={domain} className="flex items-center gap-1 mb-1">
              <div className="w-28 text-xs text-slate-400 shrink-0 text-right pr-2 truncate">{domain}</div>
              <div className="flex gap-0.5 flex-1">
                {years.map(year => {
                  const yd = yearlyData.find(d => d.year === year);
                  const count = yd?.domains?.[domain]?.count || 0;
                  return (
                    <div
                      key={year}
                      title={`${domain} ${year}: ${count} artikel`}
                      className="flex-1 h-5 rounded-[2px] transition-all duration-200 hover:opacity-100 cursor-pointer"
                      style={{
                        background: count > 0 ? `${color}${Math.round(20 + (count / maxCount) * 80).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.02)',
                        minWidth: '8px',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 justify-end">
          <span className="text-xs text-slate-600">Rendah</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map(intensity => (
            <div key={intensity} className="w-4 h-3 rounded-sm"
              style={{ background: `rgba(99,102,241,${intensity})` }} />
          ))}
          <span className="text-xs text-slate-600">Tinggi</span>
        </div>
      </div>
    </div>
  );
}

// ─── Radar Domain ─────────────────────────────────────────────────────────────
function DomainRadar({ stats }: { stats: DbStatsSummary }) {
  const radarData = stats.by_domain.slice(0, 8).map(d => {
    const maxCount = Math.max(...stats.by_domain.map(x => x.count));
    const maxCit = Math.max(...stats.by_domain.map(x => x.total_citations));
    return {
      domain: d.domain.length > 12 ? d.domain.slice(0, 12) : d.domain,
      penelitian: Math.round(d.count / maxCount * 100),
      sitasi: Math.round(d.total_citations / maxCit * 100),
      rataSitasi: Math.round(d.avg_citation / Math.max(...stats.by_domain.map(x => x.avg_citation)) * 100),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={radarData}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 9 }} />
        <Radar name="Volume Penelitian" dataKey="penelitian" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
        <Radar name="Total Sitasi" dataKey="sitasi" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
        <Radar name="Rata-rata Sitasi" dataKey="rataSitasi" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Timeline Multi-Line ──────────────────────────────────────────────────────
function DomainTimeline({ yearlyData }: { yearlyData: any[] }) {
  const [activeDomains, setActiveDomains] = useState<string[]>(['Mekanika', 'Listrik', 'Termodinamika', 'Gelombang']);

  const chartData = yearlyData.map(yd => {
    const row: any = { year: yd.year };
    TOP_DOMAINS.forEach(d => {
      row[d] = yd.domains?.[d]?.count || 0;
    });
    return row;
  });

  const toggleDomain = (d: string) => {
    setActiveDomains(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  return (
    <div>
      {/* Domain Toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TOP_DOMAINS.map(d => {
          const color = DOMAIN_COLORS[d] || '#64748b';
          const active = activeDomains.includes(d);
          return (
            <button key={d} onClick={() => toggleDomain(d)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-all"
              style={{
                borderColor: active ? `${color}60` : 'rgba(51,65,85,0.4)',
                background: active ? `${color}15` : 'transparent',
                color: active ? color : '#64748b',
              }}>
              <div className="w-2 h-2 rounded-full" style={{ background: active ? color : '#374151' }} />
              {d}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
          <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} interval={4} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          {activeDomains.map(d => (
            <Line key={d} type="monotone" dataKey={d} stroke={DOMAIN_COLORS[d] || '#64748b'}
              strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Citation Scatter Bar ─────────────────────────────────────────────────────
function CitationCompare({ stats }: { stats: DbStatsSummary }) {
  const data = stats.by_domain
    .filter(d => d.count > 100)
    .map(d => ({
      domain: d.domain.length > 12 ? d.domain.slice(0, 12) : d.domain,
      fullDomain: d.domain,
      count: d.count,
      avg_cit: d.avg_citation,
      total: d.total_citations,
    }))
    .sort((a, b) => b.avg_cit - a.avg_cit);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
        <XAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 9 }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="glass-card px-4 py-3 text-xs border border-slate-700/50">
                <p className="text-white font-semibold mb-1">{d.fullDomain}</p>
                <p className="text-slate-400">Volume: <strong className="text-blue-400">{d.count.toLocaleString('id-ID')} artikel</strong></p>
                <p className="text-slate-400">Rata-rata sitasi: <strong className="text-amber-400">{d.avg_cit.toFixed(1)}</strong></p>
                <p className="text-slate-400">Total sitasi: <strong className="text-emerald-400">{d.total.toLocaleString('id-ID')}</strong></p>
              </div>
            );
          }}
        />
        <Bar dataKey="avg_cit" name="Rata-rata Sitasi" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={DOMAIN_COLORS[d.fullDomain] || '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Decade Analysis ──────────────────────────────────────────────────────────
function DecadeAnalysis({ stats }: { stats: DbStatsSummary }) {
  const decadeData = stats.by_decade.map(d => ({
    ...d,
    label: d.decade,
  }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {decadeData.map((d, i) => {
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
        const pct = Math.round(d.count / stats.total_articles * 100);
        return (
          <motion.div key={d.decade} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
            className="glass-card p-4 border border-slate-800/40 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at center, ${colors[i]}, transparent 70%)` }} />
            <div className="text-xs text-slate-500 mb-1">{d.decade}</div>
            <div className="text-2xl font-black" style={{ color: colors[i] }}>{d.count.toLocaleString('id-ID')}</div>
            <div className="text-xs text-slate-500 mb-1">artikel</div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i] }} />
            </div>
            <div className="text-xs text-slate-600 mt-1">{pct}% total · avg {d.avg_citation.toFixed(1)} sitasi</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DomainIntelligencePage() {
  const [stats, setStats] = useState<DbStatsSummary | null>(null);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'timeline' | 'citation'>('overview');

  useEffect(() => {
    Promise.all([
      getExplorerStats(),
      getYearlyBreakdown(),
    ]).then(([s, yd]) => {
      setStats(s);
      setYearlyData(yd.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const TABS = [
    { id: 'overview', label: 'Overview Domain', icon: Layers },
    { id: 'heatmap', label: 'Heatmap Temporal', icon: BarChart3 },
    { id: 'timeline', label: 'Timeline Multi-Domain', icon: TrendingUp },
    { id: 'citation', label: 'Citation Impact', icon: Award },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Layers size={18} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Domain Intelligence</h1>
              <p className="text-sm text-slate-500">Analisis mendalam 12 domain fisika dari 17.755 artikel penelitian Indonesia</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-slate-500">
              <RefreshCw size={20} className="animate-spin" />
              <span>Memuat data domain...</span>
            </div>
          </div>
        ) : stats ? (
          <>
            {/* Decade breakdown */}
            <DecadeAnalysis stats={stats} />

            {/* Tab selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${activeTab === tab.id
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                    : 'border-slate-800/50 text-slate-500 hover:text-slate-300 hover:border-slate-700'}`}>
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Bar chart volume */}
                  <div className="glass-card p-6 border border-slate-800/40">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <BookOpen size={14} className="text-blue-400" /> Volume Penelitian per Domain
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.by_domain} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" horizontal={false} />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis type="category" dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} width={105} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="Artikel" radius={[0, 4, 4, 0]}>
                          {stats.by_domain.map((d, i) => (
                            <Cell key={i} fill={DOMAIN_COLORS[d.domain] || '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Radar */}
                  <div className="glass-card p-6 border border-slate-800/40">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <Activity size={14} className="text-emerald-400" /> Perbandingan Multi-Dimensi (8 Domain Utama)
                    </h3>
                    <DomainRadar stats={stats} />
                    <p className="text-xs text-slate-600 mt-2 text-center">Volume, total sitasi, dan rata-rata sitasi — dinormalisasi 0-100</p>
                  </div>

                  {/* Domain detail table */}
                  <div className="glass-card p-6 border border-slate-800/40 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <Target size={14} className="text-amber-400" /> Tabel Lengkap Domain Fisika
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800">
                            <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold">Domain</th>
                            <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold">Artikel</th>
                            <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold">Total Sitasi</th>
                            <th className="text-right py-2 px-3 text-xs text-slate-500 font-semibold">Avg Sitasi</th>
                            <th className="text-left py-2 px-3 text-xs text-slate-500 font-semibold">Porsi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.by_domain.map((d, i) => {
                            const color = DOMAIN_COLORS[d.domain] || '#64748b';
                            const pct = (d.count / stats.total_articles * 100).toFixed(1);
                            return (
                              <tr key={i} className="border-b border-slate-900/50 hover:bg-slate-800/20 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                                    <span className="text-slate-300">{d.domain}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-white">{d.count.toLocaleString('id-ID')}</td>
                                <td className="py-2.5 px-3 text-right text-amber-400 font-medium">{d.total_citations.toLocaleString('id-ID')}</td>
                                <td className="py-2.5 px-3 text-right text-emerald-400">{d.avg_citation.toFixed(1)}</td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 rounded-full bg-slate-800 flex-1">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                                    </div>
                                    <span className="text-xs text-slate-500 w-10">{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* HEATMAP */}
              {activeTab === 'heatmap' && (
                <motion.div key="heatmap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="glass-card p-6 border border-slate-800/40">
                    <h3 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <BarChart3 size={14} className="text-purple-400" /> Heatmap Aktivitas Penelitian Domain × Tahun
                    </h3>
                    <p className="text-xs text-slate-600 mb-5">Intensitas warna menunjukkan volume publikasi per domain per tahun</p>
                    {yearlyData.length > 0 ? (
                      <DomainHeatmap yearlyData={yearlyData} />
                    ) : (
                      <div className="text-center py-10 text-slate-600">Data tahunan tidak tersedia</div>
                    )}
                  </div>

                  {/* Year trend all domains stacked */}
                  <div className="glass-card p-6 border border-slate-800/40 mt-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <TrendingUp size={14} className="text-blue-400" /> Area Chart Kumulatif (Top 8 Domain)
                    </h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart
                        data={yearlyData.map(yd => {
                          const row: any = { year: yd.year };
                          TOP_DOMAINS.slice(0, 8).forEach(d => { row[d] = yd.domains?.[d]?.count || 0; });
                          return row;
                        })}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                        <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 10 }} interval={4} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                        {TOP_DOMAINS.slice(0, 8).map(d => (
                          <Area key={d} type="monotone" dataKey={d} stackId="1"
                            stroke={DOMAIN_COLORS[d] || '#64748b'} fill={DOMAIN_COLORS[d] || '#64748b'}
                            fillOpacity={0.7} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* TIMELINE */}
              {activeTab === 'timeline' && (
                <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="glass-card p-6 border border-slate-800/40">
                    <h3 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <TrendingUp size={14} className="text-blue-400" /> Timeline Publikasi per Domain (1996–2026)
                    </h3>
                    <p className="text-xs text-slate-600 mb-5">Klik domain untuk toggle visibility · Klik-klik kombinasi berbeda untuk eksplorasi tren</p>

                    {yearlyData.length > 0 ? (
                      <DomainTimeline yearlyData={yearlyData} />
                    ) : (
                      <div className="text-center py-10 text-slate-600">Data tahunan tidak tersedia</div>
                    )}
                  </div>

                  {/* Key insight cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {[
                      {
                        title: 'Pre-Pandemi (1996–2019)',
                        insight: 'Mekanika dan Listrik mendominasi secara konsisten. Pertumbuhan stabil ~50 artikel/tahun per domain besar.',
                        color: '#3b82f6',
                        icon: TrendingUp
                      },
                      {
                        title: 'Pandemi COVID-19 (2020–2021)',
                        insight: 'Terjadi shift signifikan ke penelitian pembelajaran daring. Domain IPA Terpadu meningkat karena kurikulum terintegrasi.',
                        color: '#f97316',
                        icon: Activity
                      },
                      {
                        title: 'Post-Pandemi (2022–2026)',
                        insight: 'Peningkatan penelitian berbasis teknologi. Domain Sains Terapan (STEM) mulai muncul signifikan.',
                        color: '#10b981',
                        icon: Zap
                      },
                    ].map((item, i) => (
                      <div key={i} className="glass-card p-5 border border-slate-800/40">
                        <div className="flex items-center gap-2 mb-2">
                          <item.icon size={14} style={{ color: item.color }} />
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{item.insight}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* CITATION */}
              {activeTab === 'citation' && (
                <motion.div key="citation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="glass-card p-6 border border-slate-800/40 mb-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <Award size={14} className="text-amber-400" /> Rata-rata Sitasi per Domain
                    </h3>
                    <p className="text-xs text-slate-600 mb-4">Domain dengan rata-rata sitasi tertinggi mengindikasikan penelitian yang lebih berdampak internasional</p>
                    <CitationCompare stats={stats} />
                  </div>

                  {/* Top cited */}
                  <div className="glass-card p-6 border border-slate-800/40">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <TrendingUp size={14} className="text-blue-400" /> Top 10 Artikel Paling Berpengaruh
                    </h3>
                    <div className="space-y-3">
                      {stats.top_cited.map((a, i) => {
                        const color = DOMAIN_COLORS[a.domain] || '#64748b';
                        return (
                          <div key={i} className="flex gap-4 items-start p-3 rounded-xl bg-slate-900/30 hover:bg-slate-800/30 transition-colors">
                            <div className="text-2xl font-black text-slate-700 leading-none w-6 shrink-0 text-right">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">{a.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-slate-500">{a.journal}</span>
                                <span className="text-xs text-slate-600">·</span>
                                <span className="text-xs text-slate-500">{a.year}</span>
                                <span className="badge text-xs" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>{a.domain}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-lg font-bold text-amber-400">{a.citation_count.toLocaleString('id-ID')}</div>
                              <div className="text-xs text-slate-600">sitasi</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="text-center py-20 text-slate-600">Gagal memuat data. Pastikan server backend berjalan.</div>
        )}
      </div>
    </div>
  );
}
