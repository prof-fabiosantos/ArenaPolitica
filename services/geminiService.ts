import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
import { Candidate, VoterProfile, Message, EvaluationResult } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-3-flash-preview as it is the recommended model for basic text tasks
// and has better availability/quota management than specific preview builds.
const TEXT_MODEL = "gemini-3-flash-preview";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// --- AUDIO CONTEXT MANAGEMENT ---
let audioContext: AudioContext | null = null;

export const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

// Helper to decode Base64 string to byte array
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM data from Gemini into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playGeneratedAudio = async (text: string, voiceName: string): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      console.warn("No audio data received from Gemini TTS.");
      return;
    }

    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, ctx);

    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      // Smooth start/end to avoid clicks
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(1, ctx.currentTime + audioBuffer.duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + audioBuffer.duration);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.onended = () => {
        resolve();
      };
      source.start();
    });

  } catch (err) {
    console.error("Error playing audio:", err);
    // Resolve anyway so the debate doesn't freeze if audio fails
    return Promise.resolve();
  }
};

// --- END AUDIO HELPERS ---

// Helper to clean JSON string if model adds markdown blocks
const cleanJSON = (text: string) => {
  return text.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic retry wrapper with Exponential Backoff
async function withRetry<T>(fn: () => Promise<T>, retries = 3, fallbackValue: T): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Handle 429 Too Many Requests specifically
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota');
      
      if (isRateLimit) {
        console.warn(`Quota exceeded (Attempt ${i + 1}/${retries}). Waiting 15s...`);
        // Force a long wait for rate limits (30s suggested by error, but lets try 15s to be responsive-ish)
        await delay(15000); 
      } else {
        console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
        // Standard exponential backoff
        const delayTime = Math.pow(2, i) * 1000 + Math.random() * 500;
        await delay(delayTime); 
      }
    }
  }
  return fallbackValue;
}

// 1. Helper to enrich candidate profile using Google Search (Grounding)
export const enrichCandidateProfile = async (name: string): Promise<string> => {
  if (!name) return "";
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Search for the political profile, party affiliation, and main stances of ${name}. Summarize it in 2-3 sentences suitable for a debate simulation. Focus on ideology and key policy proposals.`,
      config: {
        tools: [{ googleSearch: {} }],
        safetySettings: SAFETY_SETTINGS,
      },
    });
    
    let text = response.text || "Não foi possível encontrar informações.";

    // Must extract URLs from groundingChunks
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks;
      const links = chunks
        .map((chunk: any) => chunk.web?.uri)
        .filter((uri: string) => uri);

      if (links.length > 0) {
        text += "\n\nFontes:\n" + [...new Set(links)].join("\n");
      }
    }

    return text;
  }, 3, "Erro ao buscar informações automáticas.");
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

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: specificInstruction,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
        safetySettings: SAFETY_SETTINGS,
      }
    });

    return response.text || "Prosseguindo com o debate.";
  }, 3, "Vamos prosseguir com o debate.");
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
  const historyText = history.map(h => {
    if (h.senderId === 'Moderator') return `[MODERADOR]: ${h.text}`;
    return `[${h.phase || 'Turno'}] ${h.senderId === currentSpeaker.id ? 'Você' : opponent.name}: ${h.text}`;
  }).join('\n');

  const prompt = history.length === 0 
    ? `Comece o debate com sua Pergunta Base sobre: ${topic}.`
    : `Aqui está o histórico do debate até agora:\n${historyText}\n\nSua vez de falar (${phase}).`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        safetySettings: SAFETY_SETTINGS,
      }
    });

    return response.text || "...";
  }, 3, "Peço desculpas, houve uma falha técnica, mas mantenho minha posição.");
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

  // Using Type from @google/genai
  const scoreObjSchema = {
    type: Type.OBJECT, 
    properties: { a: { type: Type.INTEGER }, b: { type: Type.INTEGER }, reason: { type: Type.STRING } },
    required: ["a", "b", "reason"]
  };

  const jsonSchema = {
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

  const dummyScore = { a: 0, b: 0, reason: "N/A" };
  const fallbackResult: EvaluationResult = {
      winnerId: "Tie",
      scores: { candidateA: 0, candidateB: 0 },
      reasoning: "Não foi possível processar a avaliação devido a instabilidade no serviço.",
      breakdown: {
        coherence: dummyScore,
        alignment: dummyScore,
        viability: dummyScore,
        consistency: dummyScore,
        clarity: dummyScore
      }
    };

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
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
        
        CRITÉRIOS DE AVALIAÇÃO
        Avalie cada candidato nos seguintes eixos (Escala 0-100 para compatibilidade com o sistema):
        1. Coerência interna (Peso: 20%): O candidato manteve-se fiel à sua ideologia?
        2. Alinhamento com prioridades do eleitor (Peso: 35%): As propostas atendem aos interesses do eleitor?
        3. Viabilidade prática das propostas (Peso: 15%): São aplicáveis no mundo real?
        4. Consistência institucional (Peso: 15%): Respeito às leis/estado.
        5. Clareza, honestidade e reconhecimento de limites (Peso: 15%)

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
        safetySettings: SAFETY_SETTINGS, // Disable safety blocks for political content analysis
      }
    });

    const text = cleanJSON(response.text || "{}");
    const result = JSON.parse(text);
    return result as EvaluationResult;
  }, 3, fallbackResult);
};