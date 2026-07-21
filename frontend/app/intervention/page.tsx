'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FlaskConical, TrendingUp, BarChart3, Clock, Award, BookOpen,
  ChevronRight, Info, ArrowUpRight, Filter
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, Legend
} from 'recharts';
import { getInterventionEffectiveness } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const EFFECTIVENESS_LABELS: Record<string, { color: string; bg: string }> = {
  'Sangat Efektif': { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  'Efektif': { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  'Cukup Efektif': { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  'Terbatas': { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

const EVIDENCE_LABELS: Record<string, { color: string }> = {
  'Kuat': { color: '#10b981' },
  'Moderat': { color: '#f59e0b' },
  'Terbatas': { color: '#ef4444' },
};

const CustomBubbleTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    return (
      <div className="glass-card px-4 py-3 text-sm border border-slate-700/50 shadow-2xl max-w-xs">
        <p className="text-white font-bold mb-1">{d?.intervention}</p>
        <p className="text-slate-400">Kategori: <span className="text-slate-200">{d?.category}</span></p>
        <p className="text-slate-400">Gain Score: <span className="text-emerald-400 font-semibold">{(d?.avg_gain_score * 100).toFixed(0)}%</span></p>
        <p className="text-slate-400">Jumlah Studi: <span className="text-blue-400 font-semibold">{d?.study_count}</span></p>
        <p className="text-slate-400">Level Bukti: <span style={{ color: EVIDENCE_LABELS[d?.evidence_level]?.color }}>{d?.evidence_level}</span></p>
      </div>
    );
  }
  return null;
};

export default function InterventionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    getInterventionEffectiveness()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const interventions = data?.data || [];
  const filtered = selectedCategory
    ? interventions.filter((iv: any) => iv.category === selectedCategory)
    : interventions;

  const categories = data?.categories || [];
  const summary = data?.summary;

  // Bubble chart data
  const bubbleData = filtered.map((iv: any) => ({
    ...iv,
    x: iv.avg_gain_score * 100,
    y: iv.study_count,
    z: iv.study_count * 8,
  }));

  // Timeline data
  const timelineData = (data?.timeline_data || []).reduce((acc: any[], iv: any) => {
    const existing = acc.find(a => a.year === iv.first_reported);
    if (existing) {
      existing.count += 1;
      existing.items.push(iv.intervention);
    } else {
      acc.push({ year: iv.first_reported, count: 1, items: [iv.intervention] });
    }
    return acc;
  }, []).sort((a: any, b: any) => a.year - b.year);

  return (
    <div className="min-h-screen pt-20 px-4 pb-16">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Efektivitas <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Intervensi</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Analisis komparatif efektivitas berbagai intervensi pembelajaran miskonsepsi fisika
            berdasarkan Hake's Normalized Gain Score dari sintesis literatur 1996–2026.
          </p>
        </motion.div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVariants} initial="hidden" animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Total Intervensi', value: interventions.length, icon: FlaskConical, color: '#10b981' },
              { label: 'Rata-rata Gain Score', value: `${((summary?.avg_gain_score || 0) * 100).toFixed(0)}%`, icon: TrendingUp, color: '#3b82f6', raw: true },
              { label: 'Paling Efektif', value: summary?.best_effectiveness?.split(' ').slice(0, 2).join(' '), icon: Award, color: '#f59e0b', raw: true },
              { label: 'Studi Terbanyak', value: summary?.most_studied?.split(' ').slice(0, 2).join(' '), icon: BookOpen, color: '#8b5cf6', raw: true },
            ].map(({ label, value, icon: Icon, color, raw }) => (
              <motion.div key={label} variants={itemVariants} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={16} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-xl font-bold text-white truncate">{raw ? value : Number(value).toLocaleString('id-ID')}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Category Filter */}
        {!loading && categories.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 items-center">
            <Filter size={14} className="text-slate-400" />
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!selectedCategory ? 'bg-white/10 text-white border border-white/20' : 'text-slate-400 hover:text-white'}`}
            >
              Semua Kategori
            </button>
            {categories.map((cat: string) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200 border border-slate-700/50'}`}
              >
                {cat}
              </button>
            ))}
          </motion.div>
        )}

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bubble Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass-card p-6 lg:col-span-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Bubble Chart Efektivitas</h2>
                <p className="text-slate-400 text-sm mt-1">
                  X = Gain Score · Y = Jumlah Studi · Ukuran = Tingkat Bukti
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
                <Info size={12} />
                <span>Klik untuk detail</span>
              </div>
            </div>
            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      type="number" dataKey="x" name="Gain Score"
                      domain={[40, 80]} tickFormatter={v => `${v}%`}
                      tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                      label={{ value: 'Gain Score (%)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      type="number" dataKey="y" name="Jumlah Studi"
                      tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                      label={{ value: 'Jumlah Studi', angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 400]} />
                    <Tooltip content={<CustomBubbleTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter
                      data={bubbleData}
                      onClick={(d: any) => setSelectedItem(d)}
                    >
                      {bubbleData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.75} stroke={entry.color} strokeWidth={1} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Detail Panel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="glass-card p-6 lg:col-span-4 flex flex-col"
          >
            <h2 className="text-lg font-bold text-white mb-4">Detail Intervensi</h2>
            {selectedItem ? (
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{selectedItem.intervention}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: selectedItem.color + '20', color: selectedItem.color }}>
                    {selectedItem.category}
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Avg. Gain Score', value: `${(selectedItem.avg_gain_score * 100).toFixed(0)}%`, color: '#10b981' },
                    { label: 'Jumlah Studi', value: selectedItem.study_count, color: '#3b82f6' },
                    { label: 'Level Bukti', value: selectedItem.evidence_level, color: EVIDENCE_LABELS[selectedItem.evidence_level]?.color },
                    { label: 'Efektivitas', value: selectedItem.effectiveness_label, color: EFFECTIVENESS_LABELS[selectedItem.effectiveness_label]?.color },
                    { label: 'Pertama Dilaporkan', value: selectedItem.first_reported, color: '#8b5cf6' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center py-2 border-b border-slate-700/30">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className="font-semibold text-sm" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-2">Domain yang ditangani:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.domains?.map((d: string) => (
                      <span key={d} className="badge badge-blue text-xs">{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                  <FlaskConical size={28} className="text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">Klik bubble pada chart untuk melihat detail intervensi</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Intervention Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Clock size={20} className="text-purple-400" />
                Intervention Timeline
              </h2>
              <p className="text-slate-400 text-sm mt-1">Kapan intervensi pertama kali dilaporkan dalam literatur PER Indonesia</p>
            </div>
          </div>
          {loading ? (
            <div className="h-48 animate-pulse bg-slate-800/50 rounded-xl" />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="glass-card px-3 py-2 text-sm border border-slate-700/50">
                          <p className="text-white font-semibold mb-1">{label}</p>
                          <p className="text-blue-400">{d.count} intervensi baru</p>
                          {d.items?.map((it: string) => (
                            <p key={it} className="text-slate-400 text-xs">• {it}</p>
                          ))}
                        </div>
                      );
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="count" name="Intervensi Baru" radius={[4, 4, 0, 0]} barSize={28}>
                    {timelineData.map((_: any, i: number) => (
                      <Cell key={i} fill={`hsl(${220 + i * 20}, 70%, 60%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Ranked List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-bold text-white mb-6 tracking-tight">Ranking Efektivitas Intervensi</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-14 animate-pulse bg-slate-800/50 rounded-xl" />)}
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-3">
              {filtered.map((iv: any, i: number) => {
                const el = EFFECTIVENESS_LABELS[iv.effectiveness_label] || { color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
                return (
                  <motion.div
                    key={iv.intervention}
                    variants={itemVariants}
                    onClick={() => setSelectedItem(iv)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-700/30 hover:border-slate-600/50 cursor-pointer transition-all hover:-translate-y-0.5 hover:bg-slate-800/30"
                  >
                    <div className="text-2xl font-bold text-slate-600 w-8 text-right shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm truncate">{iv.intervention}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: el.bg, color: el.color }}>
                          {iv.effectiveness_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{iv.category}</span>
                        <span>·</span>
                        <span>{iv.study_count} studi</span>
                        <span>·</span>
                        <span>Sejak {iv.first_reported}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-bold" style={{ color: el.color }}>
                        {(iv.avg_gain_score * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-500">gain score</div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-20 shrink-0">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${iv.avg_gain_score * 100}%`, backgroundColor: el.color }}
                        />
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 shrink-0" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Methodology note */}
          <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/20">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500 leading-relaxed">
                {data?.methodology_note}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
