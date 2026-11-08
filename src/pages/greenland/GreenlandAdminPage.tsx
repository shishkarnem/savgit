import React, { useState, useEffect } from 'react';
import { Admin } from '@/components/greenland/Admin';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CityNode } from '@/types';
import { CITIES, IMAGES, SHEET_DATA } from '@/greenlandConstants';
import { protalkDb } from '@/integrations/protalk/client';

interface Props {
  mapImage?: string;
  cities?: CityNode[];
  onUpdateMapImage?: (url: string) => void;
  onUpdateCities?: (cities: CityNode[]) => void;
  appData?: any;
  setAppData?: (data: any) => void;
}

const AdminPage: React.FC<Props> = ({
  mapImage: propMapImage,
  cities: propCities,
  onUpdateMapImage: propOnUpdateMapImage,
  onUpdateCities: propOnUpdateCities,
  appData: propAppData,
  setAppData: propSetAppData
}) => {
  const [internalCities, setInternalCities] = useState<CityNode[]>(() => {
    const saved = localStorage.getItem('gl_cities');
    return saved ? JSON.parse(saved) : CITIES.map((c, i) => ({ ...c, id: `city-${i}` }));
  });

  const [internalMapImage, setInternalMapImage] = useState<string>(() => {
    const saved = localStorage.getItem('gl_map_image');
    if (!saved || saved.includes('ibb.co') || saved.includes('Map-GL2.png') || saved.includes('/file/30/map.jpg')) {
      return '/file/34/map.jpg';
    }
    return saved || '/file/34/map.jpg';
  });

  const [internalAppData, setInternalAppData] = useState<any>(SHEET_DATA);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    if (propCities) return;
    const loadCities = async () => {
      try {
        const { data } = await protalkDb.from('map_cities').select('*');
        if (data && data.length > 0) {
          const mapped: CityNode[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            top: c.top,
            left: c.left,
            logo: c.logo || undefined,
            description: c.description || undefined,
            link: c.link || undefined,
            linkText: c.link_text || undefined,
          }));
          setInternalCities(mapped);
        }
      } catch (e) {
        console.error('Failed to load cities for admin:', e);
      }
    };
    loadCities();
  }, [propCities]);

  useEffect(() => {
    if (propAppData) return;
    const loadSiteContent = async () => {
      try {
        const [siteTextRes, lawsRes, crmRes, leadsRes, partnersRes, logsRes, contractsRes, statusConfigRes, promptsRes, remindersRes, contractUrlsRes] = await Promise.all([
          protalkDb.from('site_text').select('*'),
          protalkDb.from('laws').select('*'),
          protalkDb.from('crm').select('*').limit(500),
          protalkDb.from('leads').select('*').limit(500),
          protalkDb.from('partners').select('*').limit(500),
          protalkDb.from('protalk_logs').select('*').limit(500),
          protalkDb.from('contracts').select('*').limit(500),
          protalkDb.from('status_config').select('*').limit(500),
          protalkDb.from('protalk_prompts').select('*').limit(500),
          protalkDb.from('reminders').select('*').limit(500),
          protalkDb.from('contract_urls').select('*').limit(500),
        ]);

        setInternalAppData((prev: any) => {
          const merged = { ...prev };
          if (siteTextRes.data) merged.SITE_TEXT = siteTextRes.data;
          if (lawsRes.data) merged.LAWS = lawsRes.data;
          if (crmRes.data) merged.CRM = crmRes.data;

          // Unify partner CRM list: all Telegram bot partners from crm table (registered & pending)
          // AND registered users from partners table, merging duplicates
          const crmList = Array.isArray(crmRes.data) ? crmRes.data : [];
          const partnerList = Array.isArray(partnersRes.data) ? partnersRes.data : [];
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

          merged.PARTNERS = Array.from(partnerMap.values());
          if (leadsRes.data) merged.LEADS = leadsRes.data;
          if (logsRes.data) merged.LOGS = logsRes.data;
          if (contractsRes.data) merged.CONTRACTS_DATA = contractsRes.data;
          if (statusConfigRes.data) merged.STATUS_CONFIG = statusConfigRes.data;
          if (promptsRes.data) merged.KNOWLEDGE = promptsRes.data;
          if (remindersRes.data) merged.REMINDERS = remindersRes.data;
          if (contractUrlsRes.data) merged.CONTRACTS = contractUrlsRes.data;
          return merged;
        });
      } catch (err) {
        console.error('Failed to load site content for admin:', err);
      }
    };
    loadSiteContent();
  }, [propAppData]);

  const activeCities = propCities || internalCities;
  const activeMapImage = propMapImage || internalMapImage;
  const activeAppData = propAppData || internalAppData;

  const handleUpdateCities = propOnUpdateCities || ((newCities: CityNode[]) => {
    setInternalCities(newCities);
    localStorage.setItem('gl_cities', JSON.stringify(newCities));
  });

  const handleUpdateMapImage = propOnUpdateMapImage || ((url: string) => {
    setInternalMapImage(url);
    localStorage.setItem('gl_map_image', url);
  });

  const handleSetAppData = propSetAppData || setInternalAppData;

  return (
    <div className="w-full">
      <ErrorBoundary>
        <Admin
          cities={activeCities}
          mapImage={activeMapImage}
          onUpdateCities={handleUpdateCities}
          onUpdateMapImage={handleUpdateMapImage}
          appData={activeAppData}
          setAppData={handleSetAppData}
        />
      </ErrorBoundary>
    </div>
  );
};

export default AdminPage;
