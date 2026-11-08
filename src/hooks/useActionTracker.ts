import { useCallback, useRef } from 'react';
import { protalkDb } from '@/integrations/protalk/client';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { getOrGenerateUID } from '@/lib/uidHelper';
import type { Json } from '@/integrations/protalk/types';

export function useActionTracker(flowType: 'calculator' | 'ai_seller') {
  const { profile } = useTelegramAuth();
  const sessionIdRef = useRef<string | null>(null);
  const actionsRef = useRef<Array<Record<string, string>>>([]);
  const userUid = getOrGenerateUID();
  const telegramId = profile?.telegram_id ? Number(profile.telegram_id) : Number(userUid) || 0;

  const trackAction = useCallback(async (
    action: string,
    details?: { page?: string; field?: string; value?: string; data?: Record<string, Json> }
  ) => {
    const entry: Record<string, string> = { action, timestamp: new Date().toISOString() };
    if (details?.page) entry.page = details.page;
    if (details?.field) entry.field = details.field;
    if (details?.value) entry.value = details.value;
    actionsRef.current = [...actionsRef.current, entry];

    // Persist actions to localStorage for offline / session resilience
    try {
      localStorage.setItem(`sav_actions_history_${flowType}`, JSON.stringify(actionsRef.current));
      localStorage.setItem('sav_last_action', JSON.stringify({ flowType, ...entry }));
    } catch {}

    const sessionData: Record<string, Json> = {
      ...(details?.data || {}),
      uid: userUid as unknown as Json,
      actions: actionsRef.current as unknown as Json,
      lastAction: action,
      lastUpdated: new Date().toISOString(),
    };

    try {
      if (sessionIdRef.current) {
        await protalkDb.from('sav_user_calculations').update({ data: sessionData as Json }).eq('id', sessionIdRef.current);
      } else {
        const insertData: Record<string, Json> = { ...sessionData, startedAt: new Date().toISOString() };
        const { data, error } = await protalkDb
          .from('sav_user_calculations')
          .insert([{ telegram_id: telegramId, calculation_type: flowType, data: insertData as Json }])
          .select('id')
          .single();
        if (!error && data) sessionIdRef.current = data.id;
      }
    } catch (err) {
      console.error('Error tracking action:', err);
    }
  }, [telegramId, userUid, flowType]);

  const saveSessionData = useCallback(async (formData: Record<string, Json>) => {
    const sessionData: Record<string, Json> = {
      ...formData,
      uid: userUid as unknown as Json,
      actions: actionsRef.current as unknown as Json,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`sav_session_data_${flowType}`, JSON.stringify(sessionData));
    } catch {}

    try {
      if (sessionIdRef.current) {
        await protalkDb.from('sav_user_calculations').update({ data: sessionData as Json }).eq('id', sessionIdRef.current);
      } else {
        const insertData: Record<string, Json> = { ...sessionData, startedAt: new Date().toISOString() };
        const { data, error } = await protalkDb
          .from('sav_user_calculations')
          .insert([{ telegram_id: telegramId, calculation_type: flowType, data: insertData as Json }])
          .select('id')
          .single();
        if (!error && data) sessionIdRef.current = data.id;
      }
    } catch (err) {
      console.error('Error saving session data:', err);
    }
  }, [telegramId, userUid, flowType]);

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    actionsRef.current = [];
  }, []);

  return { trackAction, saveSessionData, resetSession };
}
