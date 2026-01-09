import React, { useEffect, useRef } from 'react';
import { Candidate, Message } from '../types';

interface DebateViewProps {
  messages: Message[];
  candA: Candidate;
  candB: Candidate;
  isTyping: boolean;
  onStop: () => void;
  status: string;
  isAudioEnabled?: boolean;
  onToggleAudio?: () => void;
}

const DebateView: React.FC<DebateViewProps> = ({ messages, candA, candB, isTyping, onStop, status, isAudioEnabled, onToggleAudio }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status === 'DEBATE' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
            <span className="font-bold text-white tracking-widest uppercase text-sm">
              {status === 'DEBATE' ? 'Ao Vivo' : 'Finalizado'}
            </span>
        </div>
        
        <div className="flex items-center gap-8">
            <div className="text-center">
                <p className="text-xs text-blue-400 font-bold">{candA.name}</p>
                <div className="h-1 w-16 bg-blue-500 rounded mt-1"></div>
            </div>
            <div className="text-slate-500 text-xs">VS</div>
             <div className="text-center">
                <p className="text-xs text-orange-400 font-bold">{candB.name}</p>
                <div className="h-1 w-16 bg-orange-500 rounded mt-1"></div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            {onToggleAudio && (
                <button 
                  onClick={onToggleAudio}
                  className={`p-2 rounded hover:bg-slate-700 transition-colors ${isAudioEnabled ? 'text-green-400' : 'text-slate-500'}`}
                  title={isAudioEnabled ? "Mutar" : "Desmutar"}
                >
                   {isAudioEnabled ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                   ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                   )}
                </button>
            )}

            {status === 'DEBATE' && (
                <button 
                onClick={onStop}
                className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/50 rounded hover:bg-red-600/30 text-xs transition-colors"
              >
                Encerrar
              </button>
            )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-gradient-to-b from-slate-900 to-slate-800">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                <p>O debate está prestes a começar...</p>
            </div>
        )}

        {messages.map((msg) => {
          if (msg.senderId === 'Moderator') {
            return (
              <div key={msg.id} className="flex justify-center my-4 animate-fadeIn">
                <div className="bg-amber-900/30 border border-amber-600/30 text-amber-100 px-6 py-3 rounded-lg max-w-[80%] text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" /><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" /></svg>
                    <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">Moderador</span>
                  </div>
                  <div 
                    className="text-sm italic"
                    dangerouslySetInnerHTML={{ __html: msg.text }}
                  />
                </div>
              </div>
            );
          }

          const isA = msg.senderId === 'A';
          const candidate = isA ? candA : candB;
          
          return (
            <div key={msg.id} className={`flex ${isA ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex max-w-[85%] gap-3 ${isA ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${isA ? 'bg-blue-600' : 'bg-orange-500'}`}>
                    {candidate.name.charAt(0)}
                  </div>
                </div>

                {/* Bubble */}
                <div className={`relative p-4 rounded-2xl shadow-md text-sm leading-relaxed ${
                    isA 
                    ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700' 
                    : 'bg-slate-700 text-white rounded-tr-none border border-slate-600'
                }`}>
                    <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="font-bold text-xs opacity-70 uppercase tracking-wide">{candidate.party}</p>
                        {msg.phase && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/50 text-slate-300 border border-slate-600">
                                {msg.phase}
                            </span>
                        )}
                    </div>
                    {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
             <div className="flex justify-center items-center py-4">
                <div className="bg-slate-800/50 px-4 py-2 rounded-full flex gap-2 items-center border border-slate-700">
                    <span className="text-xs text-slate-400">Digitando</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
             </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default DebateView;