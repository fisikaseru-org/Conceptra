'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Target, Search } from 'lucide-react';
import { GapFinderView } from './GapFinderView';
import { InterventionView } from './InterventionView';

export default function ResearchInsightsPage() {
  const [activeTab, setActiveTab] = useState<'gap' | 'intervention'>('gap');

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Unified Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Lightbulb size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Wawasan Penelitian</h1>
              <p className="text-sm text-slate-500">Analisis gap penelitian (area yang belum tersentuh) dan efektivitas strategi intervensi miskonsepsi.</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 w-fit">
          <button
            onClick={() => setActiveTab('gap')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'gap' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Search size={16} />
            Gap Penelitian
          </button>
          <button
            onClick={() => setActiveTab('intervention')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'intervention' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Target size={16} />
            Efektivitas Intervensi
          </button>
        </div>

        {/* Views */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'gap' && <div className="-mx-6"><GapFinderView /></div>}
          {activeTab === 'intervention' && <div className="-mx-6"><InterventionView /></div>}
        </motion.div>

      </div>
    </div>
  );
}
