import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Conceptra — Physics Misconception Observatory",
  description: "Peta Pengetahuan Miskonsepsi Fisika Indonesia 1996–2026. Dashboard AI berbasis NLP, Knowledge Graph, dan RAG System.",
  keywords: "miskonsepsi fisika, pendidikan fisika, knowledge graph, RAG, NLP, Indonesia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen text-slate-50 antialiased`} suppressHydrationWarning>
        <div className="fixed inset-0 z-[-1] bg-[var(--bg-primary)]">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] opacity-40" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>
        </div>
        <Navigation />
        <main className="pt-20 min-h-screen pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
