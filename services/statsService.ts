import { supabase } from './supabaseClient';

export interface PlatformStats {
  activeUsers: number;
  totalDebates: number;
}

export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const { data, error } = await supabase
      .from('global_stats')
      .select('visitors_count, debates_count')
      .single();

    if (error) {
      console.error('Error fetching stats:', error);
      return { activeUsers: 0, totalDebates: 0 };
    }

    return {
      activeUsers: data.visitors_count || 0,
      totalDebates: data.debates_count || 0
    };
  } catch (err) {
    console.error('Unexpected error fetching stats:', err);
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
      console.error('Error incrementing visitors:', error);
    }
  } catch (err) {
    console.error('Unexpected error incrementing visitors:', err);
  }
};

export const incrementDebateCount = async () => {
  try {
    const { error } = await supabase.rpc('increment_debates');
    if (error) {
      console.error('Error incrementing debates:', error);
    }
  } catch (err) {
    console.error('Unexpected error incrementing debates:', err);
  }
};