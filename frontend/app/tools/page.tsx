'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Cpu, Binary } from 'lucide-react';
import { NlpPipelineView } from './NlpPipelineView';
import { ExtractionView } from './ExtractionView';

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'extraction'>('pipeline');

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Unified Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Settings size={18} className="text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">NLP & Extraction Tools</h1>
              <p className="text-sm text-slate-500">Alat pemrosesan bahasa alami (NLP) dan ekstraktor saintifik yang digunakan di balik layar Conceptra.</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 w-fit">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pipeline' 
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Cpu size={16} />
            NLP Pipeline Visualizer
          </button>
          <button
            onClick={() => setActiveTab('extraction')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'extraction' 
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Binary size={16} />
            Scientific Aspect Extractor
          </button>
        </div>

        {/* Views */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'pipeline' && <div className="-mx-6"><NlpPipelineView /></div>}
          {activeTab === 'extraction' && <div className="-mx-6"><ExtractionView /></div>}
        </motion.div>

      </div>
    </div>
  );
}
