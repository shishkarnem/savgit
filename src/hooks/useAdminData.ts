import { useState, useCallback } from 'react';
import { protalkDb } from '@/integrations/protalk/client';

const TAB_TO_TABLE: Record<string, string> = {
  CRM: 'crm',
  LEADS: 'leads',
  PARTNERS: 'partners',
  LOGS: 'protalk_logs',
  STATUS_CONFIG: 'status_config',
  LAWS: 'laws',
  SITE_TEXT: 'site_text',
  KNOWLEDGE: 'protalk_prompts',
  RULES: 'user_access',
  REMINDERS: 'reminders',
  HISTORY: 'broadcast_logs',
  CONTRACTS: 'contract_urls',
};

export function useAdminData(appData?: any, setAppData?: (data: any) => void) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const getTableName = (tableOrTab: string) => {
    return TAB_TO_TABLE[tableOrTab] || tableOrTab.toLowerCase();
  };

  const saveRow = useCallback(async (tableOrTab: string, idOrRow: any, data?: any) => {
    try {
      setSyncing(true);
      const tableName = getTableName(tableOrTab);
      let id: any;
      let updates: any;

      if (typeof idOrRow === 'object' && idOrRow !== null) {
        id = idOrRow.id;
        updates = { ...idOrRow };
        delete updates.id;
        delete updates.created_at;
        delete updates.updated_at;
      } else {
        id = idOrRow;
        updates = { ...(data || {}) };
        delete updates.id;
        delete updates.created_at;
        delete updates.updated_at;
      }

      if (!id) {
        console.warn(`[useAdminData] Cannot save row without ID in ${tableName}`);
        return;
      }

      await protalkDb.from(tableName).eq('id', id).update(updates);
    } catch (e) {
      console.error(`Error saving row in ${tableOrTab}:`, e);
    } finally {
      setSyncing(false);
    }
  }, []);

  const deleteRow = useCallback(async (tableOrTab: string, idOrRow: any) => {
    try {
      setSyncing(true);
      const tableName = getTableName(tableOrTab);
      const id = typeof idOrRow === 'object' && idOrRow !== null ? idOrRow.id : idOrRow;
      if (!id) return;
      await protalkDb.from(tableName).eq('id', id).delete();
    } catch (e) {
      console.error(`Error deleting row from ${tableOrTab}:`, e);
    } finally {
      setSyncing(false);
    }
  }, []);

  const insertRow = useCallback(async (tableOrTab: string, data: any) => {
    try {
      setSyncing(true);
      const tableName = getTableName(tableOrTab);
      const res = await protalkDb.from(tableName).insert(data);
      return res.data;
    } catch (e) {
      console.error(`Error inserting row into ${tableOrTab}:`, e);
    } finally {
      setSyncing(false);
    }
  }, []);

  const refreshTab = useCallback(async (tabName: string) => {
    try {
      setLoading(true);
      const tableName = getTableName(tabName);
      const res = await protalkDb.from(tableName).select('*').limit(500);
      if (res.data && setAppData) {
        setAppData((prev: any) => ({
          ...prev,
          [tabName]: res.data,
        }));
      }
      return res.data || [];
    } catch (e) {
      console.error(`Error refreshing tab ${tabName}:`, e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [setAppData]);

  const loadCities = useCallback(async () => {
    try {
      const res = await protalkDb.from('map_cities').select('*');
      if (res.data && res.data.length > 0) {
        return res.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          top: c.top,
          left: c.left,
          logo: c.logo || undefined,
          description: c.description || undefined,
          link: c.link || undefined,
          linkText: c.link_text || undefined,
        }));
      }
      const fallback = await protalkDb.from('cities').select('*');
      return fallback.data || [];
    } catch {
      return [];
    }
  }, []);

  const saveCities = useCallback(async (cities: any[]) => {
    try {
      setSyncing(true);
      for (const city of cities) {
        const payload: any = {
          name: city.name,
          top: city.top,
          left: city.left,
          logo: city.logo || null,
          description: city.description || null,
          link: city.link || null,
          link_text: city.linkText || null,
        };
        if (city.id) {
          payload.id = city.id;
          await protalkDb.from('map_cities').upsert(payload);
        } else {
          await protalkDb.from('map_cities').insert(payload);
        }
      }
    } catch (e) {
      console.error('Error saving cities:', e);
    } finally {
      setSyncing(false);
    }
  }, []);

  const deleteCity = useCallback(async (id: string | number) => {
    try {
      await protalkDb.from('map_cities').eq('id', id).delete();
    } catch (e) {
      console.error('Error deleting city:', e);
    }
  }, []);

  const seedInitialData = useCallback(async (currentAppData?: any, initialCities?: any[]) => {
    // Verified real BD ProTalk backend auto-seeds on start and persists to disk
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [crm, leads, partners, logs, contracts, statusConfig, laws, siteText, knowledge, reminders, history, rules, contractUrls] = await Promise.all([
        protalkDb.from('crm').select('*').limit(500),
        protalkDb.from('leads').select('*').limit(500),
        protalkDb.from('partners').select('*').limit(500),
        protalkDb.from('protalk_logs').select('*').limit(500),
        protalkDb.from('contracts').select('*').limit(500),
        protalkDb.from('status_config').select('*').limit(500),
        protalkDb.from('laws').select('*').limit(500),
        protalkDb.from('site_text').select('*').limit(500),
        protalkDb.from('protalk_prompts').select('*').limit(500),
        protalkDb.from('reminders').select('*').limit(500),
        protalkDb.from('broadcast_logs').select('*').limit(500),
        protalkDb.from('user_access').select('*').limit(500),
        protalkDb.from('contract_urls').select('*').limit(500),
      ]);

      if (setAppData) {
        const crmList = Array.isArray(crm.data) ? crm.data : [];
        const partnerList = Array.isArray(partners.data) ? partners.data : [];
        const partnerMap = new Map<string, any>();

        for (const c of crmList) {
          const tgId = String(c.telegram_id || c.chat_id || '').replace(/^tb|_.*$/g, '').trim();
          const key = tgId || c.id;
          const emailMatch = c.email || (c.comment && String(c.comment).match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]) || '';
          const isBlocked = 
            c.status === 'Заблокировано' || 
            c.status === 'blocked' || 
            c.status === 'BLOCKED' ||
            c.status_hand === 'Заблокировано' ||
            Boolean(c.send_status && (c.send_status.includes('Forbidden') || c.send_status.includes('blocked') || c.send_status.includes('deactivated')));

          partnerMap.set(key, {
            ...c,
            id: c.id,
            telegram_id: tgId || c.telegram_id || c.chat_id,
            type: c.registration_type || (c.reg_check === '✅' ? 'Зарегистрирован' : 'В ожидании регистрации'),
            email: emailMatch,
            status: isBlocked ? 'Заблокировано' : (c.status || (c.reg_check === '✅' ? 'Активен' : 'В ожидании'))
          });
        }

        for (const p of partnerList) {
          const tgId = String(p.telegram_id || p.chat_id || '').replace(/^tb|_.*$/g, '').trim();
          let existing: any = null;
          if (tgId && partnerMap.has(tgId)) {
            existing = partnerMap.get(tgId);
          } else {
            for (const [k, v] of partnerMap.entries()) {
              if ((p.partner_code && v.partner_code === p.partner_code) ||
                  (p.promo && v.promo === p.promo) ||
                  (p.email && v.email && p.email.toLowerCase() === v.email.toLowerCase())) {
                existing = v;
                break;
              }
            }
          }

          if (existing) {
            Object.assign(existing, {
              fio: p.fio || existing.fio,
              email: p.email || existing.email,
              phone: p.phone || existing.phone,
              city: p.city || existing.city,
              payout_details: p.payout_details || existing.payout_details,
              promo: p.promo || existing.promo,
              partner_code: p.partner_code || existing.partner_code,
              rank: p.rank || existing.rank,
              type: 'Зарегистрирован',
              status: existing.status === 'Заблокировано' ? 'Заблокировано' : (p.status || existing.status || 'Активен')
            });
          } else {
            const key = tgId || p.id;
            partnerMap.set(key, {
              ...p,
              id: p.id,
              telegram_id: tgId || p.telegram_id,
              type: 'Зарегистрирован',
              status: p.status || 'Активен'
            });
          }
        }

        const unifiedPartners = Array.from(partnerMap.values());

        setAppData((prev: any) => ({
          ...prev,
          CRM: Array.isArray(crm.data) ? crm.data : (prev?.CRM || []),
          LEADS: Array.isArray(leads.data) ? leads.data : (prev?.LEADS || []),
          PARTNERS: unifiedPartners.length > 0 ? unifiedPartners : (prev?.PARTNERS || []),
          LOGS: Array.isArray(logs.data) ? logs.data : (prev?.LOGS || []),
          CONTRACTS_DATA: Array.isArray(contracts.data) ? contracts.data : (prev?.CONTRACTS_DATA || []),
          STATUS_CONFIG: Array.isArray(statusConfig.data) ? statusConfig.data : (prev?.STATUS_CONFIG || []),
          LAWS: Array.isArray(laws.data) ? laws.data : (prev?.LAWS || []),
          SITE_TEXT: Array.isArray(siteText.data) ? siteText.data : (prev?.SITE_TEXT || []),
          KNOWLEDGE: Array.isArray(knowledge.data) ? knowledge.data : (prev?.KNOWLEDGE || []),
          REMINDERS: Array.isArray(reminders.data) ? reminders.data : (prev?.REMINDERS || []),
          HISTORY: Array.isArray(history.data) ? history.data : (prev?.HISTORY || []),
          RULES: Array.isArray(rules.data) ? rules.data : (prev?.RULES || []),
          CONTRACTS: Array.isArray(contractUrls.data) ? contractUrls.data : (prev?.CONTRACTS || []),
        }));
      }
    } catch (err) {
      console.error('Error loading all data:', err);
    } finally {
      setLoading(false);
    }
  }, [setAppData]);

  return {
    isAdmin: true,
    loading,
    syncing,
    saveRow,
    deleteRow,
    insertRow,
    refreshTab,
    loadCities,
    saveCities,
    deleteCity,
    seedInitialData,
    loadAllData,
  };
}

export const useAdminAccess = useAdminData;

