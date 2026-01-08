import React, { useState, useEffect, useCallback, useRef } from 'react';
import SetupForm from './components/SetupForm';
import DebateView from './components/DebateView';
import ScoreCard from './components/ScoreCard';
import LandingPage from './components/LandingPage';
import { generateDebateTurn, generateModeratorTurn, evaluateDebate } from './services/geminiService';
import { Candidate, VoterProfile, Message, AppStatus, EvaluationResult } from './types';

const TURNS_PER_ROUND = 4;
const TOTAL_ROUNDS = 2; 
const MAX_TURNS = TURNS_PER_ROUND * TOTAL_ROUNDS; // 8 Turns total

const PHASE_NAMES = ['Pergunta Base', 'Réplica', 'Tréplica', 'Contra-argumento'];

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.LANDING);
  const [candA, setCandA] = useState<Candidate | null>(null);
  const [candB, setCandB] = useState<Candidate | null>(null);
  const [voter, setVoter] = useState<VoterProfile | null>(null);
  const [topic, setTopic] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  
  const [isTyping, setIsTyping] = useState(false);
  const turnCountRef = useRef(0);

  // Transition from Landing to Setup
  const handleEnterArena = () => {
    setStatus(AppStatus.SETUP);
  };

  // Start the simulation
  const handleStart = (cA: Candidate, cB: Candidate, v: VoterProfile, t: string) => {
    setCandA(cA);
    setCandB(cB);
    setVoter(v);
    setTopic(t);
    setMessages([]);
    turnCountRef.current = 0;
    setStatus(AppStatus.DEBATE);
  };

  // Stop debate early and evaluate
  const handleStopDebate = () => {
    setStatus(AppStatus.EVALUATING);
  };

  // Debate Logic Loop
  const processTurn = useCallback(async () => {
    if (status !== AppStatus.DEBATE || !candA || !candB) return;
    
    // Check flow based on message history and turn counts
    
    // 1. Moderator OPENING (if no messages)
    if (messages.length === 0) {
      setIsTyping(true);
      const modText = await generateModeratorTurn('OPENING', topic, candA, candB);
      setMessages([{
        id: 'mod-opening',
        senderId: 'Moderator',
        text: modText,
        timestamp: Date.now(),
        phase: 'Abertura'
      }]);
      setIsTyping(false);
      return;
    }

    // 2. Moderator TRANSITION (After Round 1, before Round 2)
    // Round 1 ends when turnCount is 4.
    if (turnCountRef.current === TURNS_PER_ROUND && messages[messages.length - 1].senderId !== 'Moderator') {
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 600));
      const modText = await generateModeratorTurn('TRANSITION', topic, candA, candB);
      setMessages(prev => [...prev, {
        id: `mod-transition-${Date.now()}`,
        senderId: 'Moderator',
        text: modText,
        timestamp: Date.now(),
        phase: 'Transição'
      }]);
      setIsTyping(false);
      return;
    }

    // 3. Moderator CLOSING (After Round 2)
    if (turnCountRef.current >= MAX_TURNS && messages[messages.length - 1].senderId !== 'Moderator') {
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 600));
      const modText = await generateModeratorTurn('CLOSING', topic, candA, candB);
      setMessages(prev => [...prev, {
        id: `mod-closing-${Date.now()}`,
        senderId: 'Moderator',
        text: modText,
        timestamp: Date.now(),
        phase: 'Encerramento'
      }]);
      setIsTyping(false);
      // Logic continues in useEffect to switch status after this message
      return;
    }

    // 4. End Debate Trigger (After Moderator Closing)
    if (turnCountRef.current >= MAX_TURNS && messages[messages.length - 1].senderId === 'Moderator') {
       setStatus(AppStatus.EVALUATING);
       return;
    }

    // 5. Candidate Turns
    // If we are here, it's a candidate's turn
    setIsTyping(true);

    const currentTurn = turnCountRef.current;
    const currentRound = Math.floor(currentTurn / TURNS_PER_ROUND);
    const stepInRound = currentTurn % TURNS_PER_ROUND; 

    const roundStarter = currentRound % 2 === 0 ? candA : candB;
    const roundOpponent = currentRound % 2 === 0 ? candB : candA;

    let currentSpeaker: Candidate;
    let opponent: Candidate;

    if (stepInRound === 0 || stepInRound === 2) {
      currentSpeaker = roundStarter;
      opponent = roundOpponent;
    } else {
      currentSpeaker = roundOpponent;
      opponent = roundStarter;
    }

    const phaseName = PHASE_NAMES[stepInRound];

    // Delay slightly for realism
    await new Promise(r => setTimeout(r, 1200));

    const responseText = await generateDebateTurn(
      currentSpeaker,
      opponent,
      topic,
      messages,
      phaseName
    );

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentSpeaker.id,
      text: responseText,
      timestamp: Date.now(),
      phase: phaseName
    };

    setMessages(prev => [...prev, newMessage]);
    turnCountRef.current += 1;
    setIsTyping(false);

  }, [candA, candB, messages, status, topic]);

  // Effect to trigger next turn automatically
  useEffect(() => {
    if (status === AppStatus.DEBATE && !isTyping) {
      // Small debounce to prevent race conditions
      const timer = setTimeout(() => {
        processTurn();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages, status, isTyping, processTurn]);

  // Evaluation Effect
  useEffect(() => {
    const runEvaluation = async () => {
      if (status === AppStatus.EVALUATING && candA && candB && voter) {
        await new Promise(r => setTimeout(r, 1500));
        const result = await evaluateDebate(candA, candB, voter, topic, messages);
        setEvaluation(result);
        setStatus(AppStatus.FINISHED);
      }
    };

    runEvaluation();
  }, [status, candA, candB, voter, topic, messages]);


  const handleReset = () => {
    setStatus(AppStatus.SETUP);
    setMessages([]);
    setEvaluation(null);
    turnCountRef.current = 0;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-10 px-4 font-inter">
      
      {/* Show header only if NOT in landing page for cleaner look, or keep it small */}
      {status !== AppStatus.LANDING && (
        <header className="mb-8 text-center animate-fadeIn">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-1 cursor-pointer" onClick={() => setStatus(AppStatus.LANDING)}>
            Arena Política
          </h1>
          <p className="text-slate-500 text-xs">Simulação com Gemini 2.5 Flash</p>
        </header>
      )}

      {/* Main Content Area */}
      <main className="w-full max-w-5xl flex-1 flex flex-col justify-center">
        {status === AppStatus.LANDING && (
          <LandingPage onEnter={handleEnterArena} />
        )}

        {status === AppStatus.SETUP && (
          <SetupForm onStart={handleStart} />
        )}

        {(status === AppStatus.DEBATE || status === AppStatus.EVALUATING) && candA && candB && (
          <div className="space-y-4">
             <DebateView 
               messages={messages} 
               candA={candA} 
               candB={candB} 
               isTyping={isTyping}
               onStop={handleStopDebate}
               status={status}
             />
             {status === AppStatus.EVALUATING && (
                <div className="text-center p-8 animate-pulse">
                    <p className="text-xl text-indigo-400 font-semibold">O Avaliador está analisando o debate...</p>
                    <p className="text-sm text-slate-500 mt-2">Verificando alinhamento com seus interesses ({voter?.name})</p>
                </div>
             )}
          </div>
        )}

        {status === AppStatus.FINISHED && evaluation && candA && candB && voter && (
          <ScoreCard 
            result={evaluation} 
            candA={candA} 
            candB={candB} 
            voter={voter}
            onReset={handleReset}
          />
        )}
      </main>
      
      {status !== AppStatus.LANDING && (
        <footer className="mt-12 text-slate-700 text-xs text-center">
          Powered by Google Gemini 2.5 Flash
        </footer>
      )}
    </div>
  );
};

export default App;