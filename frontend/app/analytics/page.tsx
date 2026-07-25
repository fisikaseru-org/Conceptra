'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Layers, PieChart } from 'lucide-react';
import { DomainIntelView } from './DomainIntelView';
import { ScientometricsView } from './ScientometricsView';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'scientometrics' | 'domain'>('scientometrics');

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Unified Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <PieChart size={18} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Analitik Saintometrik & Domain</h1>
              <p className="text-sm text-slate-500">Analisis bibliometrik, tren publikasi, struktur intelektual, dan lanskap domain fisika di Indonesia.</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 w-fit">
          <button
            onClick={() => setActiveTab('scientometrics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'scientometrics' 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <BarChart3 size={16} />
            Saintometrik & Publikasi
          </button>
          <button
            onClick={() => setActiveTab('domain')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'domain' 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Layers size={16} />
            Domain Intelligence
          </button>
        </div>

        {/* Views */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'scientometrics' && <div className="-mx-6"><ScientometricsView /></div>}
          {activeTab === 'domain' && <div className="-mx-6"><DomainIntelView /></div>}
        </motion.div>

      </div>
    </div>
  );
}
