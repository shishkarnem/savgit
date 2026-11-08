import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Navigation } from '@/components/greenland/Navigation';
import { ChatWidget } from '@/components/greenland/ChatWidget';
import { BrowserWarningModal } from '@/components/greenland/BrowserWarningModal';
import { AccessDenied } from '@/components/greenland/AccessDenied';
import { LoadingScreen } from '@/components/greenland/LoadingScreen';
import { Language, CityNode, Theme } from '@/types';
import { CITIES, IMAGES, SHEET_DATA } from '@/greenlandConstants';
import { useTelegramUser } from '@/hooks/useTelegramUser';
import { protalkDb } from '@/integrations/protalk/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { ExternalLink, Send, Shield } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

import GreenlandHomePage from './GreenlandHomePage';
import GreenlandImmigrationPage from './GreenlandImmigrationPage';
import GreenlandConstitutionPage from './GreenlandConstitutionPage';
import GreenlandProfilePage from './GreenlandProfilePage';
import GreenlandAdminPage from './GreenlandAdminPage';

export default function GreenlandApp() {
  const navigate = useNavigate();
  const { profile: tgProfile, loading: tgLoading, isTelegram } = useTelegramUser();
  const { hasAccess, loading: accessLoading, context } = useAccessControl(tgProfile?.telegram_id || null);
  
  const [cities, setCities] = useState<CityNode[]>(() => {
    const saved = localStorage.getItem('gl_cities');
    return saved ? JSON.parse(saved) : CITIES.map((c, i) => ({ ...c, id: `city-${i}` }));
  });

  const [mapImage, setMapImage] = useState<string>(() => {
    const saved = localStorage.getItem('gl_map_image');
    if (!saved || saved.includes('ibb.co') || saved.includes('Map-GL2.png') || saved.includes('/file/30/map.jpg')) {
      return '/file/34/map.jpg';
    }
    return saved || '/file/34/map.jpg';
  });

  const [lang, setLang] = useState<Language>('ru');
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('gl_theme') as Theme) || 'dark';
  });
  const [appData, setAppData] = useState<any>(SHEET_DATA);

  useEffect(() => {
    const loadCitiesFromDb = async () => {
      try {
        const { data } = await protalkDb.from('map_cities').select('*');
        if (data && data.length > 0) {
          const dbCities: CityNode[] = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            top: c.top,
            left: c.left,
            logo: c.logo || undefined,
            description: c.description || undefined,
            link: c.link || undefined,
            linkText: c.link_text || undefined,
          }));
          setCities(dbCities);
        }
      } catch (err) {
        console.error('Failed to load cities from DB:', err);
      }
    };
    loadCitiesFromDb();
  }, []);

  useEffect(() => {
    const loadSiteContent = async () => {
      try {
        const [
          siteTextRes,
          lawsRes,
          crmRes,
          leadsRes,
          partnersRes,
          logsRes,
          contractsRes,
          statusRes,
          knowledgeRes,
          remindersRes,
          broadcastRes,
          rulesRes,
          contractUrlsRes
        ] = await Promise.all([
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
          protalkDb.from('broadcast_logs').select('*').limit(500),
          protalkDb.from('user_access').select('*').limit(500),
          protalkDb.from('contract_urls').select('*').limit(500),
        ]);

        setAppData((prev: any) => ({
          ...prev,
          SITE_TEXT: Array.isArray(siteTextRes.data) && siteTextRes.data.length > 0 ? siteTextRes.data : prev.SITE_TEXT,
          LAWS: Array.isArray(lawsRes.data) && lawsRes.data.length > 0 ? lawsRes.data : prev.LAWS,
          CRM: Array.isArray(crmRes.data) 
            ? crmRes.data.map((c: any) => ({
                ...c,
                chat_id: c.chat_id || c.telegram_id || c.id,
                telegram_id: c.telegram_id || c.chat_id || c.id,
                email: c.email || (c.comment && String(c.comment).match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]) || ''
              }))
            : prev.CRM,
          LEADS: Array.isArray(leadsRes.data) ? leadsRes.data : prev.LEADS,
          PARTNERS: (() => {
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
                chat_id: tgId || c.chat_id || c.telegram_id,
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
                  chat_id: tgId || p.chat_id || p.telegram_id,
                  type: 'Зарегистрирован',
                  status: p.status || 'Активен'
                });
              }
            }

            const unified = Array.from(partnerMap.values());
            return unified.length > 0 ? unified : prev.PARTNERS;
          })(),
          LOGS: Array.isArray(logsRes.data) ? logsRes.data : prev.LOGS,
          CONTRACTS_DATA: Array.isArray(contractsRes.data) ? contractsRes.data : prev.CONTRACTS_DATA,
          STATUS_CONFIG: Array.isArray(statusRes.data) ? statusRes.data : prev.STATUS_CONFIG,
          KNOWLEDGE: Array.isArray(knowledgeRes.data) ? knowledgeRes.data : prev.KNOWLEDGE,
          REMINDERS: Array.isArray(remindersRes.data) ? remindersRes.data : prev.REMINDERS,
          HISTORY: Array.isArray(broadcastRes.data) ? broadcastRes.data : prev.HISTORY,
          RULES: Array.isArray(rulesRes.data) ? rulesRes.data : prev.RULES,
          CONTRACTS: Array.isArray(contractUrlsRes.data) ? contractUrlsRes.data : prev.CONTRACTS,
        }));
      } catch (err) {
        console.error('Failed to load database content:', err);
      }
    };
    loadSiteContent();
  }, []);

  const t = useCallback((key: string): string => {
    const row = appData.SITE_TEXT?.find((r: any) => r.key === key);
    if (row) {
        return lang === 'olbanian' && row.olbanian ? row.olbanian : row.ru || key;
    }
    return key;
  }, [appData, lang]);

  useEffect(() => {
    document.body.classList.add('greenland-theme');
    return () => {
      document.body.classList.remove('greenland-theme');
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    localStorage.setItem('gl_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    localStorage.setItem('gl_map_image', mapImage);
    localStorage.setItem('gl_cities', JSON.stringify(cities));
  }, [mapImage, cities]);

  const toggleLang = () => {
    setLang(prev => prev === 'ru' ? 'olbanian' : 'ru');
  };

  const isLoading = tgLoading || accessLoading;
  const showBrowserWarning = !isLoading && context === 'browser' && !hasAccess('home');

  const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('sav_user_logged_out') === 'true';

  const isPartnerRegistered = typeof window !== 'undefined' && !isLoggedOut && (
    localStorage.getItem('sav_partner_registered') === 'true' ||
    Boolean(localStorage.getItem('sav_user_profile')) ||
    Boolean(localStorage.getItem('sav_auth_token'))
  );

  const withAccess = (page: string, element: React.ReactNode) => {
    if (isLoading) return null;
    if (!hasAccess(page)) {
      if (page === 'admin') {
        return (
          <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-black/40 border border-amber-400/40 shadow-lg">
              <Shield size={36} className="text-amber-300" />
            </div>
            <div className="liquid-bubble-plate border border-amber-400/35 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
              <span className="liquid-bubble-glare" />
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent relative z-10">
                Доступ к разделу «Штаб» ограничен
              </h2>
              <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-lg mx-auto relative z-10">
                Данный раздел управления доступен исключительно администраторам системы.
              </p>
              <div className="pt-2 flex justify-center gap-3 relative z-10">
                <button
                  onClick={() => navigate('/partner/profile')}
                  className="liquid-bubble-gold text-amber-950 font-bold px-6 py-3 rounded-xl text-sm md:text-base border border-amber-300 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  Вернуться в партнерский кабинет
                </button>
              </div>
            </div>
          </div>
        );
      }
      return <AccessDenied lang={lang} context={context} />;
    }
    return element;
  };

  const withPartnerProfile = (element: React.ReactNode) => {
    if (isLoading) return null;
    if (!isPartnerRegistered) {
      return <Navigate to="/partner/immigration?tab=login" replace />;
    }
    return withAccess('profile', element);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const isFullWidthRoute =
    location.pathname.includes('/profile') ||
    location.pathname.includes('/admin') ||
    location.pathname.includes('/treasury');

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col items-center p-1 sm:p-3 md:p-6 transition-colors duration-300 overflow-x-hidden">
      {showBrowserWarning && <BrowserWarningModal lang={lang} />}
      
      {/* Unified SAV AI Header */}
      <Header onLogoClick={() => navigate('/')} />

      <div className={`w-full ${isFullWidthRoute ? 'max-w-full px-2 sm:px-4 md:px-6 lg:px-8' : 'max-w-5xl px-2'} flex-grow flex flex-col mt-2`}>
        {/* Partner Sub-Navigation Bar */}
        <Navigation
          lang={lang}
          toggleLang={toggleLang}
          theme={theme}
          toggleTheme={toggleTheme}
          t={t}
          tgProfile={tgProfile}
        />

        <main className="animate-[fadeIn_0.5s_ease-out] pb-24 md:pb-8 flex-grow mt-4">
          <Routes>
            <Route path="/" element={withAccess('home', <GreenlandHomePage lang={lang} mapImage={mapImage} cities={cities} t={t} />)} />
            <Route path="/partner" element={withAccess('home', <GreenlandHomePage lang={lang} mapImage={mapImage} cities={cities} t={t} />)} />
            <Route path="/immigration" element={withAccess('immigration', <GreenlandImmigrationPage lang={lang} t={t} tgProfile={tgProfile} />)} />
            <Route path="/partner/immigration" element={withAccess('immigration', <GreenlandImmigrationPage lang={lang} t={t} tgProfile={tgProfile} />)} />
            <Route path="/constitution" element={withAccess('constitution', <GreenlandConstitutionPage lang={lang} t={t} lawsData={appData.LAWS} />)} />
            <Route path="/partner/constitution" element={withAccess('constitution', <GreenlandConstitutionPage lang={lang} t={t} lawsData={appData.LAWS} />)} />
            <Route path="/profile" element={withPartnerProfile(
              <GreenlandProfilePage
                lang={lang}
                mapImage={mapImage}
                cities={cities}
                onUpdateMapImage={setMapImage}
                onUpdateCities={setCities}
                t={t}
                appData={appData}
                setAppData={setAppData}
                tgProfile={tgProfile}
                tgLoading={tgLoading}
                isTelegram={isTelegram}
              />
            )} />
            <Route path="/partner/profile" element={withPartnerProfile(
              <GreenlandProfilePage
                lang={lang}
                mapImage={mapImage}
                cities={cities}
                onUpdateMapImage={setMapImage}
                onUpdateCities={setCities}
                t={t}
                appData={appData}
                setAppData={setAppData}
                tgProfile={tgProfile}
                tgLoading={tgLoading}
                isTelegram={isTelegram}
              />
            )} />
            <Route path="/admin" element={withAccess('admin',
              <GreenlandAdminPage
                mapImage={mapImage}
                cities={cities}
                onUpdateMapImage={setMapImage}
                onUpdateCities={setCities}
                appData={appData}
                setAppData={setAppData}
              />
            )} />
            <Route path="/partner/admin" element={withAccess('admin',
              <GreenlandAdminPage
                mapImage={mapImage}
                cities={cities}
                onUpdateMapImage={setMapImage}
                onUpdateCities={setCities}
                appData={appData}
                setAppData={setAppData}
              />
            )} />
            <Route path="*" element={withAccess('home', <GreenlandHomePage lang={lang} mapImage={mapImage} cities={cities} t={t} />)} />
          </Routes>
        </main>
      </div>

      {/* Unified Global Footer */}
      <GlobalFooter />

      <ChatWidget lang={lang} appData={appData} />
    </div>
  );
}
