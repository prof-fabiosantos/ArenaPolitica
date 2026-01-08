import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Candidate, VoterProfile, Message, EvaluationResult } from "../types";

// Ensure API Key is available
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// 1. Helper to enrich candidate profile using Google Search (Grounding)
export const enrichCandidateProfile = async (name: string): Promise<string> => {
  if (!name) return "";
  
  try {
    const modelId = 'gemini-2.5-flash'; 
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Search for the political profile, party affiliation, and main stances of ${name}. Summarize it in 2-3 sentences suitable for a debate simulation. Focus on ideology and key policy proposals.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    return response.text || "Não foi possível encontrar informações.";
  } catch (error) {
    console.error("Error enriching profile:", error);
    return "Erro ao buscar informações automáticas.";
  }
};

// 2. Generate Moderator Turn
export const generateModeratorTurn = async (
  action: 'OPENING' | 'TRANSITION' | 'CLOSING',
  topic: string,
  candA: Candidate,
  candB: Candidate
): Promise<string> => {
  
  let specificInstruction = "";
  if (action === 'OPENING') {
    specificInstruction = `
      INSTRUÇÃO: Faça a ABERTURA do debate.
      1. Apresente o tema: <strong>${topic}</strong>.
      2. Apresente brevemente os candidatos: <strong>${candA.name}</strong> e <strong>${candB.name}</strong>.
      3. Explique as regras: "Cada candidato terá oportunidade de Pergunta, Réplica, Tréplica e Contra-argumento."
      4. Convide o candidato <strong>${candA.name}</strong> para iniciar com sua Pergunta Base.
    `;
  } else if (action === 'TRANSITION') {
    specificInstruction = `
      INSTRUÇÃO: Faça a TRANSIÇÃO para o segundo bloco.
      1. Agradeça brevemente a troca de ideias do primeiro bloco.
      2. Anuncie que agora o candidato <strong>${candB.name}</strong> iniciará a rodada de perguntas.
      3. Peça para manterem o foco em propostas concretas.
    `;
  } else if (action === 'CLOSING') {
    specificInstruction = `
      INSTRUÇÃO: Faça o ENCERRAMENTO do debate.
      1. Agradeça aos candidatos pela participação civilizada.
      2. Informe que o "Agente Avaliador" irá agora processar os resultados com base no perfil do eleitor.
      3. Seja breve e formal.
    `;
  }

  const systemInstruction = `
    Você é um AGENTE MODERADOR neutro, responsável por conduzir um debate político estruturado.
    
    OBJETIVO:
    Garantir equilíbrio, clareza e progressão temática no debate, sem favorecer nenhum lado.
    
    RESPONSABILIDADES:
    - Introduzir o tema.
    - Garantir igualdade de tempo.
    - Manter a ordem e o decoro.
    - Não avalie candidatos nem emita opiniões.
    
    FORMATO DE SAÍDA:
    - Use tags HTML para formatar o texto.
    - Use <strong>para ênfase</strong> em nomes e temas.
    - Use <br> para pular linhas.
    - NÃO use Markdown (como ** ou ##). Use apenas HTML.
    
    Seja formal, direto e autoritário quando necessário, mas educado.
    Fale em Português.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: specificInstruction,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5, // Lower temperature for more consistent/neutral tone
      }
    });

    return response.text || "Prosseguindo com o debate.";
  } catch (error) {
    console.error("Error generating moderator turn:", error);
    return "Vamos prosseguir com o debate.";
  }
};

// 3. Generate a single turn of the debate
export const generateDebateTurn = async (
  currentSpeaker: Candidate,
  opponent: Candidate,
  topic: string,
  history: Message[],
  phase: string // New parameter for the phase logic
): Promise<string> => {
  
  let phaseInstruction = "";
  switch(phase) {
    case 'Pergunta Base':
      phaseInstruction = `Esta é a FASE 1: PERGUNTA BASE. Você deve iniciar este bloco fazendo uma pergunta incisiva ou uma afirmação provocativa sobre o tema "${topic}" direcionada ao seu oponente.`;
      break;
    case 'Réplica':
      phaseInstruction = `Esta é a FASE 2: RÉPLICA. Você deve responder diretamente à pergunta ou ponto levantado pelo oponente na mensagem anterior. Defenda sua posição e refute o ataque.`;
      break;
    case 'Tréplica':
      phaseInstruction = `Esta é a FASE 3: TRÉPLICA. O oponente respondeu sua pergunta. Agora, aponte as falhas na resposta dele ou reforce seu ponto original. Mantenha a pressão.`;
      break;
    case 'Contra-argumento':
      phaseInstruction = `Esta é a FASE 4: CONTRA-ARGUMENTO. Encerre este ciclo de debate. Dê a palavra final sobre este ponto específico, rebatendo a tréplica do oponente e resumindo sua superioridade no tema.`;
      break;
    default:
      phaseInstruction = `Continue o debate sobre ${topic}.`;
  }

  const systemInstruction = `
    Você é um simulador de debate político. 
    Agora você está atuando como o candidato: ${currentSpeaker.name} (${currentSpeaker.party}).
    
    Perfil do Candidato: ${currentSpeaker.description}
    
    Seu oponente é: ${opponent.name} (${opponent.party}).
    O Tópico do debate é: "${topic}".
    
    INSTRUÇÃO ESPECÍFICA PARA ESTE TURNO (${phase}):
    ${phaseInstruction}
    
    Regras Gerais:
    1. Seja fiel ao seu perfil político.
    2. Seja incisivo mas mantenha o decoro político.
    3. Mantenha a resposta concisa (máximo 50 palavras).
    4. Fale em Português.
  `;

  // Filter history to exclude Moderator instructions for the prompt context, 
  // or keep them but label them clearly so the model knows context.
  // We'll keep them but format them.
  const historyText = history.map(h => {
    if (h.senderId === 'Moderator') return `[MODERADOR]: ${h.text}`;
    return `[${h.phase || 'Turno'}] ${h.senderId === currentSpeaker.id ? 'Você' : opponent.name}: ${h.text}`;
  }).join('\n');

  const prompt = history.length === 0 
    ? `Comece o debate com sua Pergunta Base sobre: ${topic}.`
    : `Aqui está o histórico do debate até agora:\n${historyText}\n\nSua vez de falar (${phase}).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || "...";
  } catch (error) {
    console.error("Error generating turn:", error);
    return "Desculpe, perdi o fio da meada.";
  }
};

// 4. Evaluate the debate based on Voter Profile
export const evaluateDebate = async (
  candidateA: Candidate,
  candidateB: Candidate,
  voter: VoterProfile,
  topic: string,
  history: Message[]
): Promise<EvaluationResult> => {

  const historyText = history.map(h => `${h.senderId === 'A' ? candidateA.name : h.senderId === 'B' ? candidateB.name : 'MODERADOR'} (${h.phase || 'Info'}): ${h.text}`).join('\n');

  const scoreObjSchema: Schema = {
    type: Type.OBJECT, 
    properties: { a: { type: Type.INTEGER }, b: { type: Type.INTEGER }, reason: { type: Type.STRING } },
    required: ["a", "b", "reason"]
  };

  const jsonSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      winnerId: { type: Type.STRING, enum: ["A", "B", "Tie"] },
      scores: {
        type: Type.OBJECT,
        properties: {
          candidateA: { type: Type.INTEGER },
          candidateB: { type: Type.INTEGER }
        },
        required: ["candidateA", "candidateB"]
      },
      reasoning: { type: Type.STRING },
      breakdown: {
        type: Type.OBJECT,
        properties: {
          coherence: scoreObjSchema,
          alignment: scoreObjSchema,
          viability: scoreObjSchema,
          consistency: scoreObjSchema,
          clarity: scoreObjSchema
        },
        required: ["coherence", "alignment", "viability", "consistency", "clarity"]
      }
    },
    required: ["winnerId", "scores", "reasoning", "breakdown"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Você é um agente avaliador imparcial responsável por analisar um debate político com base EXCLUSIVAMENTE no perfil do eleitor fornecido.

        OBJETIVO
        Avaliar o grau de alinhamento entre cada candidato e os interesses, valores e prioridades do eleitor.

        IMPORTANTE
        - NÃO recomende voto.
        - NÃO declare quem está certo ou errado.
        - Avalie apenas alinhamento, coerência e viabilidade.
        - Declare incertezas quando houver falta de informação.

        PERFIL DO ELEITOR
        Nome: ${voter.name}
        Descrição (Prioridades, Valores, Visão de Estado, Risco, Rejeições): "${voter.interests}"
        
        (Utilize a descrição acima para inferir: Prioridades com pesos, Valores sociais, Visão de Estado, Tolerância a risco e Rejeições explícitas).

        CRITÉRIOS DE AVALIAÇÃO
        Avalie cada candidato nos seguintes eixos (Escala 0-100 para compatibilidade com o sistema):
        1. Coerência interna (Peso: 20%): O candidato manteve-se fiel à sua ideologia?
        2. Alinhamento com prioridades do eleitor (Peso: 35%): As propostas atendem aos interesses do eleitor?
        3. Viabilidade prática das propostas (Peso: 15%): São aplicáveis no mundo real?
        4. Consistência institucional (Peso: 15%): Respeito às leis/estado.
        5. Clareza, honestidade e reconhecimento de limites (Peso: 15%)

        PROCESSO DE AVALIAÇÃO
        1. Analise o debate completo.
        2. Avalie cada critério separadamente.
        3. Aplique os pesos do eleitor e os pesos dos critérios.
        4. Gere score final ponderado.
        5. Explique os principais fatores que influenciaram o resultado.

        CONTEXTO DO DEBATE
        Tópico: ${topic}
        Candidato A: ${candidateA.name} (${candidateA.party}) - ${candidateA.description}
        Candidato B: ${candidateB.name} (${candidateB.party}) - ${candidateB.description}
        
        TRANSCRICÃO DO DEBATE:
        ${historyText}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema,
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as EvaluationResult;
  } catch (error) {
    console.error("Evaluation failed", error);
    // Return a dummy error result to prevent crash
    const dummyScore = { a: 0, b: 0, reason: "N/A" };
    return {
      winnerId: "Tie",
      scores: { candidateA: 0, candidateB: 0 },
      reasoning: "Falha na avaliação do debate.",
      breakdown: {
        coherence: dummyScore,
        alignment: dummyScore,
        viability: dummyScore,
        consistency: dummyScore,
        clarity: dummyScore
      }
    };
  }
};