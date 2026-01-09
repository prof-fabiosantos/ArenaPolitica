// Simulating a backend service that would normally live in Vercel KV or a Database

const STORAGE_KEY_DEBATES = 'arena_politica_local_debates';
const BASE_DEBATES = 1240; // Starting number to make the app look used
const BASE_USERS = 15000;

export interface PlatformStats {
  activeUsers: number;
  totalDebates: number;
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // 1. Calculate "Fake" Global Users based on time (grows slowly over time)
  // This creates a realistic "growing" number without a real database
  const now = Date.now();
  const timeFactor = Math.floor(now / 3600000); // Changes every hour
  const variableUsers = Math.floor((now % 3600000) / 5000); // Fluctuation
  const activeUsers = BASE_USERS + timeFactor + variableUsers;

  // 2. Get Debates (Base + Local User Contribution)
  // In a real Vercel app, this would fetch from an API route connected to Vercel KV
  const localCount = parseInt(localStorage.getItem(STORAGE_KEY_DEBATES) || '0', 10);
  
  // We simulate "other users" adding debates by using a time factor as well
  const simulatedGlobalDebates = Math.floor(now / 7200000); 

  const totalDebates = BASE_DEBATES + localCount + simulatedGlobalDebates;

  return {
    activeUsers,
    totalDebates
  };
};

export const incrementDebateCount = () => {
  const current = parseInt(localStorage.getItem(STORAGE_KEY_DEBATES) || '0', 10);
  localStorage.setItem(STORAGE_KEY_DEBATES, (current + 1).toString());
};