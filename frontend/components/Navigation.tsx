'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Brain, Map, TrendingUp, Shield, Search, Zap,
  Database, Layers, Binary, BookOpen, Award
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();

  const NAV_LINKS = [
    { href: '/', icon: Zap, label: 'Overview' },
    { href: '/misconceptions', icon: Map, label: 'Peta Miskonsepsi' },
    { href: '/explorer', icon: Database, label: 'Explorer' },
    { href: '/analytics', icon: Layers, label: 'Analitik' },
    { href: '/topics', icon: TrendingUp, label: 'Evolusi Topik' },
    { href: '/research-insights', icon: Search, label: 'Wawasan' },
    { href: '/tools', icon: Binary, label: 'Tools' },
    { href: '/validation', icon: Shield, label: 'Validasi' },
    { href: '/docs', icon: BookOpen, label: 'Docs' }
  ];




  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/40 bg-[#0B1120]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group mr-4">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800/50 border border-slate-700/50 shadow-sm group-hover:bg-blue-900/20 group-hover:border-blue-500/30 transition-all duration-300">
                <Brain size={18} className="text-blue-400" />
              </div>
            </div>
            <div className="hidden lg:block">
              <span className="font-bold text-lg text-slate-100 group-hover:text-blue-400 transition-colors">Conceptra</span>
              <div className="text-[10px] text-slate-500 leading-none -mt-0.5 font-medium tracking-wide uppercase">Physics Observatory</div>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-edges">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-blue-500/10 border border-blue-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-blue-400' : 'text-slate-500'} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
