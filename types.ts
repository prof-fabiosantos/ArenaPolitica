export interface Candidate {
  id: 'A' | 'B';
  name: string;
  party: string;
  description: string; // Stance, ideology, history
  color: string;
  avatarUrl?: string;
}

export interface VoterProfile {
  name: string;
  interests: string; // Key issues (e.g., "Health, Low Taxes")
}

export interface Message {
  id: string;
  senderId: 'A' | 'B' | 'Moderator';
  text: string;
  timestamp: number;
  phase?: string; // e.g., "Pergunta Base", "Réplica"
}

export interface EvaluationResult {
  winnerId: 'A' | 'B' | 'Tie';
  scores: {
    candidateA: number;
    candidateB: number;
  };
  reasoning: string;
  breakdown: {
    coherence: { a: number; b: number; reason: string };    // Coerência interna (20%)
    alignment: { a: number; b: number; reason: string };    // Alinhamento com eleitor (35%)
    viability: { a: number; b: number; reason: string };    // Viabilidade prática (15%)
    consistency: { a: number; b: number; reason: string };  // Consistência institucional (15%)
    clarity: { a: number; b: number; reason: string };      // Clareza e honestidade (15%)
  };
}

export enum AppStatus {
  LANDING = 'LANDING',
  SETUP = 'SETUP',
  DEBATE = 'DEBATE',
  EVALUATING = 'EVALUATING',
  FINISHED = 'FINISHED'
}