import re

with open('frontend/app/page.tsx', 'r') as f:
    content = f.read()

new_nav = """const NAV_CARDS = [
  {
    href: '/misconceptions',
    icon: Map,
    title: 'Peta Miskonsepsi',
    desc: 'Jelajahi seluruh miskonsepsi terdokumentasi di berbagai domain fisika',
    color: '#3b82f6',
    gradient: 'from-blue-600/20 to-blue-800/5',
  },
  {
    href: '/explorer',
    icon: Database,
    title: 'Research Explorer',
    desc: 'Telusuri 10.720 artikel penelitian fisika konteks Indonesia dengan filter domain, tahun, dan bahasa',
    color: '#06b6d4',
    gradient: 'from-cyan-600/20 to-cyan-800/5',
  },
  {
    href: '/analytics',
    icon: Layers,
    title: 'Analitik Saintometrik',
    desc: 'Heatmap domain×tahun, citation impact, dan lanskap publikasi fisika',
    color: '#8b5cf6',
    gradient: 'from-purple-600/20 to-purple-800/5',
  },
  {
    href: '/topics',
    icon: TrendingUp,
    title: 'Evolusi Topik',
    desc: 'Temporal analysis BERTopic & Kleinberg Burst 1996–2026',
    color: '#8b5cf6',
    gradient: 'from-purple-600/20 to-purple-800/5',
  },
  {
    href: '/research-insights',
    icon: Search,
    title: 'Wawasan Penelitian',
    desc: 'Identifikasi area penelitian yang kurang tersentuh & efektivitas intervensi',
    color: '#f59e0b',
    gradient: 'from-amber-600/20 to-amber-800/5',
  },
  {
    href: '/tools',
    icon: Binary,
    title: 'NLP Tools',
    desc: 'Scientific Aspect Extractor & visualisasi 17-tahap NLP Pipeline',
    color: '#ec4899',
    gradient: 'from-pink-600/20 to-pink-800/5',
  },
  {
    href: '/knowledge-graph',
    icon: Network,
    title: 'Knowledge Graph',
    desc: 'Ontologi TBox/ABox dengan 80+ nodes dan 60+ relasi semantik',
    color: '#06b6d4',
    gradient: 'from-cyan-600/20 to-cyan-800/5',
  },
  {
    href: '/validation',
    icon: Shield,
    title: 'Validation Panel',
    desc: 'Metrik validitas ilmiah: Kappa, Precision/Recall, ECE, Audit bias',
    color: '#10b981',
    gradient: 'from-emerald-600/20 to-emerald-800/5',
  },
];"""

# Replace the block
content = re.sub(r'const NAV_CARDS = \[.*?\];', new_nav, content, flags=re.DOTALL)
with open('frontend/app/page.tsx', 'w') as f:
    f.write(content)
