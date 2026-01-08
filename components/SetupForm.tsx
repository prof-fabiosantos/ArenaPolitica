import React, { useState } from 'react';
import { Candidate, VoterProfile } from '../types';
import { enrichCandidateProfile } from '../services/geminiService';

interface SetupFormProps {
  onStart: (cA: Candidate, cB: Candidate, voter: VoterProfile, topic: string) => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [topic, setTopic] = useState("Reforma Tributária");
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'Voter'>('A');
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [candA, setCandA] = useState<Candidate>({
    id: 'A',
    name: "Candidato Progressista",
    party: "Partido Azul",
    description: "Foca em justiça social, aumento de impostos para ricos e serviços públicos fortes.",
    color: "bg-blue-600",
    avatarUrl: "https://picsum.photos/id/64/150/150"
  });

  const [candB, setCandB] = useState<Candidate>({
    id: 'B',
    name: "Candidato Liberal",
    party: "Partido Laranja",
    description: "Defende livre mercado, estado mínimo, privatizações e redução de burocracia.",
    color: "bg-orange-500",
    avatarUrl: "https://picsum.photos/id/91/150/150"
  });

  const [voter, setVoter] = useState<VoterProfile>({
    name: "Eleitor Indeciso",
    interests: "Me preocupo com a inflação, mas não quero perder qualidade na saúde pública."
  });

  const handleAutoFill = async (candidateId: 'A' | 'B') => {
    const candidate = candidateId === 'A' ? candA : candB;
    if (!candidate.name) return;

    setLoadingSearch(true);
    const profile = await enrichCandidateProfile(candidate.name);
    
    if (candidateId === 'A') {
      setCandA(prev => ({ ...prev, description: profile }));
    } else {
      setCandB(prev => ({ ...prev, description: profile }));
    }
    setLoadingSearch(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-900 p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-2">Configuração do Debate</h1>
        <p className="text-slate-400 text-sm">Defina os participantes e o tópico para iniciar a simulação.</p>
      </div>

      <div className="p-6">
        {/* Topic Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">Tópico do Debate</label>
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Ex: Privatização da Água, Reforma da Previdência..."
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-slate-700">
          <button 
            onClick={() => setActiveTab('A')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'A' ? 'bg-slate-700 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Candidato A
          </button>
          <button 
            onClick={() => setActiveTab('B')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'B' ? 'bg-slate-700 text-orange-400 border-b-2 border-orange-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Candidato B
          </button>
          <button 
            onClick={() => setActiveTab('Voter')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'Voter' ? 'bg-slate-700 text-green-400 border-b-2 border-green-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Perfil do Eleitor
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {activeTab === 'A' && (
            <CandidateInput 
              candidate={candA} 
              onChange={setCandA} 
              onAutoFill={() => handleAutoFill('A')}
              loading={loadingSearch}
              colorClass="text-blue-400"
            />
          )}
          {activeTab === 'B' && (
            <CandidateInput 
              candidate={candB} 
              onChange={setCandB} 
              onAutoFill={() => handleAutoFill('B')}
              loading={loadingSearch}
              colorClass="text-orange-400"
            />
          )}
          {activeTab === 'Voter' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Eleitor (Você)</label>
                <input 
                  type="text" 
                  value={voter.name}
                  onChange={(e) => setVoter({...voter, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Seus Interesses e Valores</label>
                <textarea 
                  value={voter.interests}
                  onChange={(e) => setVoter({...voter, interests: e.target.value})}
                  className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                  placeholder="O que é importante para você? Ex: Meio ambiente, segurança pública, liberdade econômica..."
                />
                <p className="text-xs text-slate-500 mt-2">O agente "Avaliador" usará isso para decidir quem venceu para o seu caso específico.</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
          <button 
            onClick={() => onStart(candA, candB, voter, topic)}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
          >
            Iniciar Debate
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-component for Candidate inputs
const CandidateInput: React.FC<{
  candidate: Candidate;
  onChange: (c: Candidate) => void;
  onAutoFill: () => void;
  loading: boolean;
  colorClass: string;
}> = ({ candidate, onChange, onAutoFill, loading, colorClass }) => (
  <div className="space-y-4 animate-fadeIn">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className={`block text-sm font-medium ${colorClass} mb-1`}>Nome</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={candidate.name}
            onChange={(e) => onChange({...candidate, name: e.target.value})}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-slate-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className={`block text-sm font-medium ${colorClass} mb-1`}>Partido / Afiliação</label>
        <input 
          type="text" 
          value={candidate.party}
          onChange={(e) => onChange({...candidate, party: e.target.value})}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-slate-500 outline-none"
        />
      </div>
    </div>
    
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className={`block text-sm font-medium ${colorClass}`}>Perfil Político / Pautas</label>
        <button 
            onClick={onAutoFill}
            disabled={loading}
            className="text-xs flex items-center gap-1 text-slate-400 hover:text-white disabled:opacity-50"
          >
            {loading ? 'Buscando...' : '✨ Gerar via IA (Gemini)'}
        </button>
      </div>
      <textarea 
        value={candidate.description}
        onChange={(e) => onChange({...candidate, description: e.target.value})}
        className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-slate-500 outline-none resize-none"
        placeholder="Descreva as crenças e propostas do candidato..."
      />
    </div>
  </div>
);

export default SetupForm;