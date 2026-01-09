import React, { useEffect, useState } from 'react';
import { getPlatformStats, incrementVisitorCount, PlatformStats } from '../services/statsService';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    // Increment visitor count (only once per session handled by service)
    incrementVisitorCount();

    // Fetch current stats
    const fetchStats = async () => {
      const data = await getPlatformStats();
      setStats(data);
    };
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center animate-fadeIn w-full">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto px-6 mb-12">
        <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-500/10 border border-indigo-500/30">
          <span className="text-indigo-300 text-xs font-semibold tracking-wider uppercase">
            Powered by Gemini 2.5 Flash & Supabase
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 mb-6 leading-tight">
          Arena Política <br/>
          <span className="text-3xl md:text-5xl text-slate-400 font-semibold">Debate AI Simulator</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Não vote no escuro. Simule debates entre perfis políticos reais ou fictícios e descubra qual candidato realmente se alinha aos <strong>seus valores</strong>.
        </p>

        <button 
          onClick={onEnter}
          className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold rounded-xl shadow-2xl transition-all transform hover:scale-105 overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          <span className="flex items-center gap-3">
            Entrar na Arena
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="w-full max-w-3xl px-4 mb-16">
        <div className="grid grid-cols-2 gap-4 bg-slate-900/80 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
          
          <div className="flex flex-col items-center justify-center border-r border-slate-700">
             <span className="text-slate-400 text-xs uppercase tracking-widest mb-1">Debates Realizados</span>
             {stats ? (
               <span className="text-3xl font-mono font-bold text-white animate-fadeIn">{stats.totalDebates.toLocaleString()}</span>
             ) : (
               <div className="h-9 w-24 bg-slate-800 rounded animate-pulse"></div>
             )}
          </div>

          <div className="flex flex-col items-center justify-center">
             <div className="flex items-center gap-2 mb-1">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
               <span className="text-slate-400 text-xs uppercase tracking-widest">Visitantes Reais</span>
             </div>
             {stats ? (
               <span className="text-3xl font-mono font-bold text-white animate-fadeIn">{stats.activeUsers.toLocaleString()}</span>
             ) : (
               <div className="h-9 w-24 bg-slate-800 rounded animate-pulse"></div>
             )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
        {/* Card 1 */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-colors">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Agentes Inteligentes</h3>
          <p className="text-slate-400 text-sm">Crie candidatos baseados em dados reais ou arquétipos ideológicos. A IA assume a persona e debate fielmente.</p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 hover:border-amber-500/30 transition-colors">
          <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Moderação Neutra</h3>
          <p className="text-slate-400 text-sm">Um mediador de IA garante que os tópicos sejam discutidos com profundidade, réplicas e tréplicas organizadas.</p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700/50 hover:border-green-500/30 transition-colors">
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Avaliação Pessoal</h3>
          <p className="text-slate-400 text-sm">Defina seus próprios interesses. Nosso algoritmo avalia quem venceu o debate <strong>para você</strong>.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;