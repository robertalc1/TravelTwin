import { createClient } from '@/lib/supabase/server';

export async function getCached(cacheKey: string): Promise<{ data: unknown; source: 'cached' } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('api_cache')
      .select('data, expires_at, hit_count')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    if (new Date(data.expires_at) < new Date()) {
      // Expired — delete it async, don't block
      supabase.from('api_cache').delete().eq('cache_key', cacheKey).then(() => {});
      return null;
    }

    // Increment hit count async
    supabase
      .from('api_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('cache_key', cacheKey)
      .then(() => {});

    return { data: data.data, source: 'cached' };
  } catch {
    return null;
  }
}

export async function setCache(cacheKey: string, data: unknown, ttlMinutes: number): Promise<void> {
  try {
    const supabase = await createClient();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    await supabase.from('api_cache').upsert(
      {
        cache_key: cacheKey,
        data,
        source: 'amadeus',
        expires_at: expiresAt,
        hit_count: 0,
      },
      { onConflict: 'cache_key' }
    );
  } catch {
    // Cache write failure is non-critical
  }
}

export async function clearExpired(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('api_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch {
    // Non-critical
  }
}
