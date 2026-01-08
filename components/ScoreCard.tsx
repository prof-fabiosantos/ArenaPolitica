import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { EvaluationResult, Candidate, VoterProfile } from '../types';

interface ScoreCardProps {
  result: EvaluationResult;
  candA: Candidate;
  candB: Candidate;
  voter: VoterProfile;
  onReset: () => void;
}

const ScoreCard: React.FC<ScoreCardProps> = ({ result, candA, candB, voter, onReset }) => {
  
  const barData = [
    {
      metric: 'Alinhamento (35%)',
      [candA.name]: result.breakdown.alignment.a,
      [candB.name]: result.breakdown.alignment.b,
    },
    {
      metric: 'Coerência (20%)',
      [candA.name]: result.breakdown.coherence.a,
      [candB.name]: result.breakdown.coherence.b,
    },
    {
      metric: 'Viabilidade (15%)',
      [candA.name]: result.breakdown.viability.a,
      [candB.name]: result.breakdown.viability.b,
    },
    {
      metric: 'Institucional (15%)',
      [candA.name]: result.breakdown.consistency.a,
      [candB.name]: result.breakdown.consistency.b,
    },
    {
      metric: 'Clareza (15%)',
      [candA.name]: result.breakdown.clarity.a,
      [candB.name]: result.breakdown.clarity.b,
    },
  ];

  const winner = result.winnerId === 'A' ? candA : result.winnerId === 'B' ? candB : null;
  const isTie = result.winnerId === 'Tie';

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-8 animate-fadeIn">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Resultado da Análise</h2>
        <p className="text-slate-400">Baseado no perfil do eleitor: <span className="text-green-400 font-semibold">{voter.name}</span></p>
      </div>

      {/* Winner Banner */}
      <div className="mb-10 p-6 rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 text-center relative overflow-hidden">
        {isTie ? (
             <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-200">Empate Técnico</h3>
                <p className="text-slate-400">Ambos atenderam aos critérios de forma similar.</p>
             </div>
        ) : winner ? (
            <div className="relative z-10">
                <p className="text-sm text-slate-500 uppercase tracking-widest mb-2">Candidato Vencedor</p>
                <h3 className={`text-4xl font-extrabold mb-2 ${winner.id === 'A' ? 'text-blue-400' : 'text-orange-400'}`}>
                    {winner.name}
                </h3>
                <div className="inline-block px-3 py-1 rounded bg-slate-700 text-xs text-white">
                    {winner.party}
                </div>
            </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Chart */}
        <div className="h-80 w-full bg-slate-900/50 p-4 rounded-lg border border-slate-700">
           <p className="text-center text-slate-400 text-xs mb-4 uppercase tracking-wider">Detalhamento dos Critérios</p>
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
               <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
               <YAxis dataKey="metric" type="category" stroke="#94a3b8" width={110} fontSize={11} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} 
                 itemStyle={{ color: '#f8fafc' }}
               />
               <Legend wrapperStyle={{ paddingTop: '10px' }} />
               <Bar dataKey={candA.name} fill="#2563eb" radius={[0, 4, 4, 0]} barSize={15} />
               <Bar dataKey={candB.name} fill="#f97316" radius={[0, 4, 4, 0]} barSize={15} />
             </BarChart>
           </ResponsiveContainer>
        </div>

        {/* Scores Summary */}
        <div className="space-y-4 flex flex-col justify-center">
             <div className="bg-slate-900/50 p-6 rounded-lg border-l-4 border-blue-500 relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-200 text-lg">{candA.name}</span>
                        <span className="text-4xl font-extrabold text-blue-500">{result.scores.candidateA}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${result.scores.candidateA}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Score Final Ponderado</p>
                </div>
             </div>

             <div className="bg-slate-900/50 p-6 rounded-lg border-l-4 border-orange-500 relative overflow-hidden group">
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-200 text-lg">{candB.name}</span>
                        <span className="text-4xl font-extrabold text-orange-500">{result.scores.candidateB}</span>
                    </div>
                    <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
                        <div className="bg-orange-600 h-full transition-all duration-1000" style={{ width: `${result.scores.candidateB}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Score Final Ponderado</p>
                </div>
             </div>
        </div>
      </div>

      {/* Analysis Text */}
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 mb-8">
        <h4 className="text-lg font-bold text-white mb-3">Análise Detalhada do Avaliador</h4>
        <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
            {result.reasoning}
        </p>
      </div>

      <div className="flex justify-center">
        <button 
            onClick={onReset}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600 font-semibold shadow-lg"
        >
            Nova Simulação
        </button>
      </div>
    </div>
  );
};

export default ScoreCard;