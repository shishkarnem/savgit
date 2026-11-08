import { useCallback, useEffect, useState } from 'react';
import { protalkDb } from '@/integrations/protalk/client';

const STORAGE_KEY = 'sav-viewed-experts';

interface ViewedExpert {
  id: string;
  direction: 'left' | 'right' | 'down';
  timestamp: number;
}

interface UseViewedExpertsOptions {
  selectorKey: string;
  selectorTelegramId?: string | null;
  selectorUsername?: string | null;
  selectorFullName?: string | null;
  source?: string;
}

export const useViewedExperts = ({
  selectorKey,
  selectorTelegramId,
  selectorUsername,
  selectorFullName,
  source = 'web',
}: UseViewedExpertsOptions) => {
  const [viewedExperts, setViewedExperts] = useState<Map<string, ViewedExpert>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  const saveToStorage = useCallback((map: Map<string, ViewedExpert>) => {
    try {
      const arr = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.error('Error saving viewed experts:', e);
    }
  }, []);

  const upsertToDb = useCallback(async (expertId: string, direction: 'left' | 'right' | 'down', timestamp: number) => {
    const { error } = await (protalkDb
      .from('sav_expert_selections' as any)
      .upsert(
        {
          expert_id: expertId,
          direction,
          selector_key: selectorKey,
          selector_telegram_id: selectorTelegramId ?? null,
          selector_username: selectorUsername ?? null,
          selector_full_name: selectorFullName ?? null,
          source,
          created_at: new Date(timestamp).toISOString(),
        },
        { onConflict: 'expert_id,selector_key' }
      ));

    if (error) {
      console.error('Error syncing viewed expert to DB:', error);
    }
  }, [selectorKey, selectorTelegramId, selectorUsername, selectorFullName, source]);

  useEffect(() => {
    let active = true;

    const loadViewedExperts = async () => {
      setIsLoaded(false);
      try {
        const { data, error } = await (protalkDb
          .from('sav_expert_selections' as any)
          .select('expert_id, direction, created_at')
          .eq('selector_key', selectorKey));

        if (error) throw error;

        const map = new Map<string, ViewedExpert>();
        (data || []).forEach((item: any) => {
          map.set(item.expert_id, {
            id: item.expert_id,
            direction: item.direction,
            timestamp: new Date(item.created_at).getTime(),
          });
        });

        if (active) {
          setViewedExperts(map);
          saveToStorage(map);
        }
      } catch (e) {
        console.error('Error loading viewed experts from DB:', e);
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored && active) {
            const parsed: ViewedExpert[] = JSON.parse(stored);
            const map = new Map<string, ViewedExpert>();
            parsed.forEach(item => map.set(item.id, item));
            setViewedExperts(map);
          }
        } catch (storageError) {
          console.error('Error loading viewed experts from localStorage:', storageError);
        }
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void loadViewedExperts();

    return () => {
      active = false;
    };
  }, [selectorKey, saveToStorage]);

  const markAsViewed = useCallback((expertId: string, direction: 'left' | 'right' | 'down') => {
    const timestamp = Date.now();
    setViewedExperts(prev => {
      const next = new Map(prev);
      next.set(expertId, { id: expertId, direction, timestamp });
      saveToStorage(next);
      return next;
    });
    void upsertToDb(expertId, direction, timestamp);
  }, [saveToStorage, upsertToDb]);

  const updateDirection = useCallback((expertId: string, direction: 'left' | 'right' | 'down') => {
    const timestamp = Date.now();
    setViewedExperts(prev => {
      const existing = prev.get(expertId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(expertId, { ...existing, direction, timestamp });
      saveToStorage(next);
      return next;
    });
    void upsertToDb(expertId, direction, timestamp);
  }, [saveToStorage, upsertToDb]);

  const clearViewed = useCallback(async () => {
    setViewedExperts(new Map());
    localStorage.removeItem(STORAGE_KEY);

    const { error } = await (protalkDb
      .from('sav_expert_selections' as any)
      .delete()
      .eq('selector_key', selectorKey));

    if (error) {
      console.error('Error clearing viewed experts in DB:', error);
    }
  }, [selectorKey]);

  const isViewed = useCallback((expertId: string): boolean => viewedExperts.has(expertId), [viewedExperts]);
  const getViewedDirection = useCallback((expertId: string): 'left' | 'right' | 'down' | null => viewedExperts.get(expertId)?.direction ?? null, [viewedExperts]);
  const getAllViewed = useCallback(() => Array.from(viewedExperts.values()), [viewedExperts]);

  return {
    viewedExperts,
    isLoaded,
    markAsViewed,
    updateDirection,
    isViewed,
    getViewedDirection,
    clearViewed,
    getAllViewed,
  };
};
