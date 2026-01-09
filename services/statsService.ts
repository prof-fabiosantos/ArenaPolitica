import { supabase } from './supabaseClient';

export interface PlatformStats {
  activeUsers: number;
  totalDebates: number;
}

const safeErrorMessage = (err: any): string => {
  if (typeof err === 'string') return err;
  if (err?.message) return err.message;
  return JSON.stringify(err);
};

export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const { data, error } = await supabase
      .from('global_stats')
      .select('visitors_count, debates_count')
      .single();

    if (error) {
      const msg = safeErrorMessage(error);
      const code = (error as any).code;

      // '42P01' is Postgres code for "undefined_table"
      if (msg !== 'Supabase not configured' && code !== '42P01' && code !== 'PGRST116') {
         console.warn(`Stats unavailable: ${msg} (${code || 'no-code'})`);
      }
      return { activeUsers: 0, totalDebates: 0 };
    }

    return {
      activeUsers: data?.visitors_count || 0,
      totalDebates: data?.debates_count || 0
    };
  } catch (err) {
    // console.warn('Stats service unavailable');
    return { activeUsers: 0, totalDebates: 0 };
  }
};

export const incrementVisitorCount = async () => {
  // Use session storage to ensure we only count the visitor once per session/tab open
  if (sessionStorage.getItem('visited_arena')) {
    return;
  }

  try {
    const { error } = await supabase.rpc('increment_visitors');
    if (!error) {
      sessionStorage.setItem('visited_arena', 'true');
    } else {
      const msg = safeErrorMessage(error);
      const code = (error as any).code;
      // '42883' is Postgres code for "undefined_function"
      if (msg !== 'Supabase not configured' && code !== '42883') {
        console.warn(`Failed to increment visitors: ${msg}`);
      }
    }
  } catch (err) {
    console.warn(`Visitor tracking skipped: ${safeErrorMessage(err)}`);
  }
};

export const incrementDebateCount = async () => {
  try {
    const { error } = await supabase.rpc('increment_debates');
    if (error) {
      const msg = safeErrorMessage(error);
      const code = (error as any).code;
      if (msg !== 'Supabase not configured' && code !== '42883') {
        console.warn(`Failed to increment debates: ${msg}`);
      }
    }
  } catch (err) {
    console.warn('Debate tracking skipped.');
  }
};