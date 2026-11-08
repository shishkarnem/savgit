import { useCallback, useEffect, useRef, useState } from 'react';
import { protalkDb } from '@/integrations/protalk/client';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';

export interface LeadData {
  full_name?: string;
  project?: string;
  product?: string;
  city?: string;
  department?: string;
  employees_count?: string;
  employee_count?: number | string;
  employees?: number | string;
  avg_salary?: string;
  salary?: number | string;
  phone?: string;
  functionality?: string;
  service?: string;
  selected_expert?: string;
  promo?: string;
  user_biz?: string;
  segment?: string;
  category?: string;
  sphere?: string;
  tariff?: string;
  pay_model?: string;
  tariff_sum?: string;
  tariff_sale?: string;
  sale_percent?: number;
  uploaded_doc_url?: string;
  uploaded_doc_name?: string;
}

export function useLeadTracker() {
  const { profile, referralPromo } = useTelegramAuth();
  const [existingLead, setExistingLead] = useState<LeadData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const telegramId = profile?.telegram_id ? String(profile.telegram_id) : null;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load existing lead data on mount
  useEffect(() => {
    if (!telegramId) {
      setIsLoaded(true);
      return;
    }
    const load = async () => {
      try {
        const { data } = await protalkDb
          .from('sav_leads')
          .select('*')
          .eq('telegram_id', telegramId)
          .maybeSingle();
        if (data) {
          setExistingLead({
            full_name: data.full_name || undefined,
            project: data.project || undefined,
            product: data.product || undefined,
            city: data.city || undefined,
            department: data.department || undefined,
            employees_count: data.employees_count || undefined,
            avg_salary: data.avg_salary || undefined,
            functionality: data.functionality || undefined,
            service: data.service || undefined,
            selected_expert: data.selected_expert || undefined,
            promo: data.promo || undefined,
            uploaded_doc_url: data.uploaded_doc_url || undefined,
            uploaded_doc_name: data.uploaded_doc_name || undefined,
          });
        }
      } catch (err) {
        console.error('Error loading lead:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [telegramId]);

  // Resolve promo from referred_by
  const resolvePromo = useCallback(async (): Promise<string | null> => {
    if (referralPromo) return referralPromo;
    const referredBy = profile?.referred_by;
    if (!referredBy) return null;
    try {
      const { data } = await protalkDb
        .from('partners')
        .select('promo')
        .eq('partner_code', referredBy)
        .maybeSingle();
      if (data?.promo) return data.promo;
      // Also try by telegram_id
      const { data: data2 } = await protalkDb
        .from('partners')
        .select('promo')
        .eq('telegram_id', referredBy)
        .maybeSingle();
      return data2?.promo || null;
    } catch {
      return null;
    }
  }, [referralPromo, profile?.referred_by]);

  const updateLead = useCallback((fields: Partial<LeadData>) => {
    if (!telegramId || !profile) return;

    // Debounce to avoid too many writes
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const username = profile.username ? `@${profile.username}` : null;
        const telegramUrl = profile.username
          ? `https://t.me/${profile.username}`
          : `tg://user?id=${profile.telegram_id}`;

        const upsertData: Record<string, unknown> = {
          telegram_id: telegramId,
          first_name: profile.first_name,
          last_name: profile.last_name,
          username,
          telegram_url: telegramUrl,
          photo_url: profile.photo_url,
          referred_by: profile.referred_by,
          updated_at: new Date().toISOString(),
          ...fields,
        };

        if (fields.salary !== undefined && !fields.avg_salary) {
          upsertData.avg_salary = String(fields.salary);
        }
        if ((fields.employee_count !== undefined || fields.employees !== undefined) && !fields.employees_count) {
          upsertData.employees_count = String(fields.employee_count ?? fields.employees);
        }

        // If promo not provided in fields, try to resolve from referral
        if (!fields.promo && !existingLead?.promo) {
          const promo = await resolvePromo();
          if (promo) upsertData.promo = promo;
        }

        await protalkDb
          .from('sav_leads')
          .upsert(upsertData, { onConflict: 'telegram_id' });
      } catch (err) {
        console.error('Error updating lead:', err);
      }
    }, 500);
  }, [telegramId, profile, existingLead?.promo, resolvePromo]);

  return { updateLead, existingLead, isLoaded };
}
