'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Brain, Map, TrendingUp, Network, Shield, Binary, Search, Zap, Cpu, ChevronDown,
  FlaskConical, LineChart, Database, Layers
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const isRisetActive = ['/misconceptions', '/topics', '/knowledge-graph', '/gap-finder', '/intervention', '/scientometrics', '/explorer', '/domain-intel'].includes(pathname);
  const isEngineActive = ['/validation', '/extraction', '/nlp-pipeline'].includes(pathname);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/40 bg-[#0B1120]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/50 border border-slate-700/50 shadow-sm group-hover:bg-blue-900/20 group-hover:border-blue-500/30 transition-all duration-300">
                <Brain size={18} className="text-blue-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg text-slate-100 group-hover:text-blue-400 transition-colors">Conceptra</span>
              <div className="text-[10px] text-slate-500 leading-none -mt-0.5 font-medium tracking-wide uppercase">Physics Observatory</div>
            </div>
          </Link>

          {/* Minimal Nav Links */}
          <div className="flex items-center gap-2">
            
            {/* Overview Link */}
            <Link
              href="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                pathname === '/'
                  ? 'text-white bg-blue-500/10 border border-blue-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Zap size={14} className={pathname === '/' ? 'text-blue-400' : 'text-slate-500'} />
              <span>Overview</span>
            </Link>

            {/* Dropdown 1: Observatory Data */}
            <div className="relative group py-2">
              <button
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isRisetActive
                    ? 'text-white bg-blue-500/10 border border-blue-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span>Observatory Data</span>
                <ChevronDown size={14} className={`transition-transform duration-300 group-hover:rotate-180 ${isRisetActive ? 'text-blue-400' : 'text-slate-500'}`} />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl border border-slate-800/50 bg-[#0B1120]/95 backdrop-blur-xl shadow-xl shadow-black/20 p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 origin-top transform scale-95 group-hover:scale-100 z-50">
                <Link
                  href="/misconceptions"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/misconceptions' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Map size={16} className={pathname === '/misconceptions' ? 'text-blue-400' : 'text-blue-500'} />
                  <span>Peta Miskonsepsi</span>
                </Link>
                <Link
                  href="/topics"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/topics' ? 'bg-purple-500/10 text-purple-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp size={16} className={pathname === '/topics' ? 'text-purple-400' : 'text-purple-500'} />
                  <span>Evolusi Topik</span>
                </Link>
                <Link
                  href="/knowledge-graph"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/knowledge-graph' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Network size={16} className={pathname === '/knowledge-graph' ? 'text-cyan-400' : 'text-cyan-500'} />
                  <span>Knowledge Graph</span>
                </Link>
                <Link
                  href="/gap-finder"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/gap-finder' ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Search size={16} className={pathname === '/gap-finder' ? 'text-amber-400' : 'text-amber-500'} />
                  <span>Gap Finder</span>
                </Link>
                <Link
                  href="/intervention"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/intervention' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FlaskConical size={16} className={pathname === '/intervention' ? 'text-emerald-400' : 'text-emerald-500'} />
                  <span>Efektivitas Intervensi</span>
                </Link>
                <Link
                  href="/scientometrics"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/scientometrics' ? 'bg-pink-500/10 text-pink-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <LineChart size={16} className={pathname === '/scientometrics' ? 'text-pink-400' : 'text-pink-500'} />
                  <span>Scientometrics</span>
                </Link>
                <Link
                  href="/explorer"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/explorer' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Database size={16} className={pathname === '/explorer' ? 'text-blue-400' : 'text-blue-500'} />
                  <span>Research Explorer</span>
                </Link>
                <Link
                  href="/domain-intel"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/domain-intel' ? 'bg-purple-500/10 text-purple-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers size={16} className={pathname === '/domain-intel' ? 'text-purple-400' : 'text-purple-500'} />
                  <span>Domain Intelligence</span>
                </Link>
              </div>
            </div>

            {/* Dropdown 2: Scientific Engine */}
            <div className="relative group py-2">
              <button
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isEngineActive
                    ? 'text-white bg-blue-500/10 border border-blue-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <span>Scientific Engine</span>
                <ChevronDown size={14} className={`transition-transform duration-300 group-hover:rotate-180 ${isEngineActive ? 'text-blue-400' : 'text-slate-500'}`} />
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute top-full right-0 lg:left-0 mt-2 w-56 rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 origin-top transform scale-95 group-hover:scale-100 z-50">
                <Link
                  href="/validation"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/validation' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Shield size={16} className={pathname === '/validation' ? 'text-emerald-400' : 'text-emerald-500'} />
                  <span>Validation Panel</span>
                </Link>
                <Link
                  href="/extraction"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/extraction' ? 'bg-pink-500/10 text-pink-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Binary size={16} className={pathname === '/extraction' ? 'text-pink-400' : 'text-pink-500'} />
                  <span>Aspect Extractor</span>
                </Link>
                <Link
                  href="/nlp-pipeline"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === '/nlp-pipeline' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Cpu size={16} className={pathname === '/nlp-pipeline' ? 'text-blue-400' : 'text-blue-500'} />
                  <span>NLP Preprocessor</span>
                </Link>
              </div>
            </div>

          </div>

          {/* Year Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs text-slate-400 font-semibold shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>1996–2026</span>
          </div>

        </div>
      </div>
    </nav>
  );
}
