import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole, Language } from '@/types';
import { IMAGES } from '@/greenlandConstants';
import { Loader2, Fingerprint, Sparkles, User, Download, HelpCircle, X, AlertCircle, ChevronDown, CheckCircle2, UserCheck, ArrowRight, LogIn, Mail, Phone, Lock, Key, Eye, EyeOff, Send, ExternalLink, ShieldCheck, Upload, Camera } from 'lucide-react';
import { ResidentCard } from './ResidentCard';
import { generateResidentCardCanvas } from '@/utils/cardGenerator';
// @ts-ignore
import html2canvas from 'html2canvas';
import { protalkDb } from '@/integrations/protalk/client';
import { TelegramProfile } from '@/hooks/useTelegramUser';
import { MiniAudioField } from '@/components/MiniAudioField';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx50qdPexCJeZlybgWpXVGKBPiHsDEnBi1Hd6JNDpgXtx2aSvFgBdy1UNzMEkRAfbVt/exec';
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/1teDuRzUkKxLXxIxSESUwWsB7dOnde2KTd2CiUflBqL0/edit';

const TITLES = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Pr.'];
const DEFAULT_PSEUDONYMS = ['Azure', 'Beige', 'Fuchsia', 'Green', 'Onyx', 'Vermilion'];

interface ImmigrationProps {
  lang: Language;
  t: (key: string) => string;
  tgProfile?: TelegramProfile | null;
}

interface ExistingRegistration {
  type: string;
  fio: string | null;
  promo: string | null;
  telegram: string | null;
  pseudonym: string | null;
  title: string | null;
  tools: string | null;
  spheres: string | null;
  cases: string | null;
  other: string | null;
  status: string | null;
  created_at: string;
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="ml-1 text-slate-400 hover:text-amber-400 transition-colors"
        aria-label="Описание"
      >
        <HelpCircle size={15} />
      </button>
      {open && (
        <div
          ref={tooltipRef}
          className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:left-auto md:top-auto md:-translate-x-0 md:-translate-y-0 md:bottom-full md:left-0 md:mb-2 w-72 bg-black/40 border border-amber-500/30 rounded-xl shadow-2xl p-4 text-sm text-slate-200 leading-relaxed backdrop-blur-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-2 right-2 text-slate-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X size={14} />
          </button>
          <p className="pr-4">{text}</p>
        </div>
      )}
    </span>
  );
}

function RegistrationBanner({ reg, lang, onReRegister, onGoProfile }: {
  reg: ExistingRegistration;
  lang: Language;
  onReRegister: () => void;
  onGoProfile: () => void;
}) {
  const isOlbanian = lang === 'olbanian';
  const isPartner = reg.type === 'Партнер';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU');

  return (
    <div className="mb-6 p-5 rounded-2xl liquid-bubble-plate border border-amber-400/35 space-y-4 animate-fadeIn shadow-xl relative overflow-hidden backdrop-blur-xl">
      <span className="liquid-bubble-glare" />
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2.5 liquid-bubble-secondary rounded-xl border border-amber-400/30">
          <UserCheck className="text-amber-400" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">
            {isOlbanian
              ? (isPartner ? 'Вы уже зарегистрированы как Резидент' : 'Вы уже зарегистрированы как Эксперт')
              : (isPartner ? 'Вы уже зарегистрированы как Резидент' : 'Вы уже зарегистрированы как Эксперт')
            }
          </h3>
          <p className="text-sm text-zinc-300 font-medium">
            {isOlbanian ? 'Дата регистрации: ' : 'Дата регистрации: '}{formatDate(reg.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm relative z-10">
        {reg.fio && (
          <div className="liquid-bubble-secondary border border-white/10 rounded-xl p-3.5">
            <span className="text-sm text-amber-300 font-semibold block mb-1">ФИО</span>
            <p className="text-white font-medium truncate">{reg.fio}</p>
          </div>
        )}
        {reg.promo && (
          <div className="liquid-bubble-secondary border border-white/10 rounded-xl p-3.5">
            <span className="text-sm text-amber-300 font-semibold block mb-1">Промокод</span>
            <p className="text-amber-400 font-mono font-bold">{reg.promo}</p>
          </div>
        )}
        {reg.status && (
          <div className="liquid-bubble-secondary border border-white/10 rounded-xl p-3.5">
            <span className="text-sm text-amber-300 font-semibold block mb-1">Статус</span>
            <p className="text-zinc-200 font-medium">{reg.status}</p>
          </div>
        )}
        {!isPartner && reg.pseudonym && (
          <div className="liquid-bubble-secondary border border-white/10 rounded-xl p-3.5">
            <span className="text-sm text-amber-300 font-semibold block mb-1">Псевдоним</span>
            <p className="text-zinc-200 font-medium">{reg.title || ''}{reg.pseudonym}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2 relative z-10">
        <button
          onClick={onGoProfile}
          className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-md flex-1 py-3 px-4 text-sm md:text-base flex items-center justify-center gap-2 rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 cursor-pointer transition-all duration-300"
        >
          <span className="liquid-bubble-glare" />
          <UserCheck size={18} className="relative z-10" />
          <span className="relative z-10 font-bold">Перейти в профиль</span>
        </button>
        <button
          onClick={onReRegister}
          className="liquid-bubble-secondary border border-white/15 text-zinc-200 hover:text-white rounded-xl font-medium flex-1 py-3 px-4 flex items-center justify-center gap-2 transition-all text-sm md:text-base relative overflow-hidden hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <span className="liquid-bubble-glare" />
          <ArrowRight size={18} className="relative z-10" />
          <span className="relative z-10 font-semibold">Повторная регистрация</span>
        </button>
      </div>
    </div>
  );
}

export const Immigration: React.FC<ImmigrationProps> = ({ lang, t, tgProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const profilePath = location.pathname.startsWith('/partner') ? '/partner/profile' : '/greenland/profile';
  const [step, setStep] = useState<'form' | 'processing' | 'card'>('form');
  const [role, setRole] = useState<UserRole>(UserRole.RESIDENT);
  const [pseudonymOptions, setPseudonymOptions] = useState<string[]>(DEFAULT_PSEUDONYMS);

  const [partnerReg, setPartnerReg] = useState<ExistingRegistration | null>(null);
  const [expertReg, setExpertReg] = useState<ExistingRegistration | null>(null);
  const [regLoading, setRegLoading] = useState(true);
  const [showFormPartner, setShowFormPartner] = useState(false);
  const [showFormExpert, setShowFormExpert] = useState(false);

  const [resFio, setResFio] = useState('');
  const [resPromo, setResPromo] = useState('');

  const [expFio, setExpFio] = useState('');
  const [expPromo, setExpPromo] = useState('');
  const [expPseudonym, setExpPseudonym] = useState('');
  const [expPseudonymCustom, setExpPseudonymCustom] = useState('');
  const [expTitle, setExpTitle] = useState('Dr.');
  const [expTools, setExpTools] = useState('');
  const [expSpheres, setExpSpheres] = useState('');
  const [expCases, setExpCases] = useState('');
  const [expOther, setExpOther] = useState('');

  const [generatedCode, setGeneratedCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cardModalData, setCardModalData] = useState<{
    isOpen: boolean;
    dataUrl: string;
    galleryUrl: string;
    fileName: string;
  } | null>(null);

  // Auth Mode: register vs login
  const [authMode, setAuthMode] = useState<'register' | 'login'>(() => {
    return new URLSearchParams(window.location.search).get('tab') === 'login' ? 'login' : 'register';
  });

  // Password & Email registration states
  const [resEmail, setResEmail] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resPassword, setResPassword] = useState('');
  const [resConfirmPassword, setResConfirmPassword] = useState('');
  const [showResPass, setShowResPass] = useState(false);

  const [expEmail, setExpEmail] = useState('');
  const [expPhone, setExpPhone] = useState('');
  const [expPassword, setExpPassword] = useState('');
  const [expConfirmPassword, setExpConfirmPassword] = useState('');
  const [showExpPass, setShowExpPass] = useState(false);
  const [expAvatar, setExpAvatar] = useState<string>('');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setAuthError('Размер файла не должен превышать 15 МБ');
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const res = loadEvt.target?.result as string;
      if (res) setExpAvatar(res);
    };
    reader.readAsDataURL(file);

    // Save to gallery /api/files/upload directly
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('custom_name', `Avatar_Expert_${file.name}`);
      const up = await fetch('/api/files/upload', { method: 'POST', body: fd });
      const upData = await up.json();
      if (upData?.success && upData?.file) {
        const directUrl = upData.file.proxy_url || upData.file.direct_url || upData.file.full_url;
        if (directUrl) setExpAvatar(directUrl);
      }
    } catch (err) {
      console.warn('Avatar background upload warning:', err);
    }
  };

  const [authError, setAuthError] = useState('');

  // Login form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Synchronize tab parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'login') {
      setAuthMode('login');
    }
  }, [location.search]);

  const telegramId = tgProfile?.telegram_id || '';
  const telegramUsername = tgProfile?.username ? `@${tgProfile.username}` : '';

  useEffect(() => {
    const checkRegistration = async () => {
      if (typeof window !== 'undefined' && localStorage.getItem('sav_user_logged_out') === 'true') {
        setRegLoading(false);
        return;
      }
      if (!telegramId) { setRegLoading(false); return; }
      const { data } = await protalkDb
        .from('partners')
        .select('type, fio, promo, telegram, pseudonym, title, tools, spheres, cases, other, status, created_at')
        .eq('partner_code', telegramId)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const partnerRow = data.find((r: any) => r.type === 'Партнер');
        const expertRow = data.find((r: any) => r.type === 'Эксперт');
        if (partnerRow) {
          setPartnerReg(partnerRow as ExistingRegistration);
          localStorage.setItem('sav_partner_registered', 'true');
          if (partnerRow.promo) localStorage.setItem('sav_partner_code', partnerRow.promo);
          window.dispatchEvent(new Event('partner-registered'));
        }
        if (expertRow) {
          setExpertReg(expertRow as ExistingRegistration);
          localStorage.setItem('sav_partner_registered', 'true');
          if (expertRow.promo) localStorage.setItem('sav_partner_code', expertRow.promo);
          window.dispatchEvent(new Event('partner-registered'));
        }
      }
      setRegLoading(false);
    };
    checkRegistration();
  }, [telegramId]);

  useEffect(() => {
    protalkDb.from('pseudonym_options' as any).select('value').order('created_at').then(({ data }) => {
      if (data && data.length > 0) {
        setPseudonymOptions(data.map((r: any) => r.value));
      }
    });
  }, []);

  useEffect(() => {
    if (tgProfile) {
      const tgName = [tgProfile.first_name, tgProfile.last_name].filter(Boolean).join(' ');
      if (tgName) {
        setResFio(prev => prev || tgName);
        setExpFio(prev => prev || tgName);
      }
    }
  }, [tgProfile]);

  const prefillPartnerForm = (reg: ExistingRegistration) => {
    setResFio(reg.fio || '');
    setResPromo(reg.promo || '');
    setShowFormPartner(true);
  };

  const prefillExpertForm = (reg: ExistingRegistration) => {
    setExpFio(reg.fio || '');
    setExpPromo(reg.promo || '');
    setExpPseudonym(reg.pseudonym || '');
    setExpTitle(reg.title || 'Dr.');
    setExpTools(reg.tools || '');
    setExpSpheres(reg.spheres || '');
    setExpCases(reg.cases || '');
    setExpOther(reg.other || '');
    setShowFormExpert(true);
  };

  const validatePromo = async (promo: string): Promise<boolean> => {
    if (!promo.trim()) return true;
    try {
      const res = await fetch(`/api/v1/partners/check-promo?code=${encodeURIComponent(promo.trim())}&currentTgId=${telegramId || ''}`);
      const json = await res.json();
      if (json && !json.available) {
        setPromoError(json.message || 'Этот промокод уже занят. Придумайте другой.');
        return false;
      }
    } catch {
      const { data } = await protalkDb
        .from('partners')
        .select('id')
        .eq('promo', promo.toUpperCase())
        .limit(1);
      const isOwnPromo = (partnerReg?.promo === promo.toUpperCase()) || (expertReg?.promo === promo.toUpperCase());
      if (data && data.length > 0 && !isOwnPromo) {
        setPromoError('Этот промокод уже занят. Придумайте другой.');
        return false;
      }
    }
    setPromoError('');
    return true;
  };

  const sendToGoogleForm = async (formData: Record<string, string>) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formUrl: GOOGLE_FORM_URL, ...formData }),
        signal: controller.signal
      }).catch(() => {}).finally(() => clearTimeout(timeout));
    } catch (e) {
      console.warn('Google Form submission error:', e);
    }
  };

  const saveToProTalkDb = async (data: any) => {
    try {
      const isRealTg = Boolean(telegramId && /^\d{6,10}$/.test(String(telegramId).trim()));
      const realTgId = isRealTg ? String(telegramId).trim() : null;
      const partnerId = data.partner_code || (isRealTg ? realTgId : Math.floor(10000000000 + Math.random() * 90000000000).toString());
      const newPartnerRecordId = `partners_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      await protalkDb.from('partners').insert({
        id: newPartnerRecordId,
        fio: data.fio,
        email: data.email || null,
        phone: data.phone || null,
        partner_code: partnerId,
        telegram_id: realTgId,
        promo: data.promo?.toUpperCase() || null,
        telegram: data.telegram || null,
        type: data.type,
        role: data.type === 'Эксперт' ? 'EXPERT' : 'RESIDENT',
        status: 'На проверке',
        pseudonym: data.pseudonym || null,
        title: data.title || null,
        tools: data.tools || null,
        spheres: data.spheres || null,
        cases: data.cases || null,
        other: data.other || null,
        photo_url: data.photo_url || null,
        timestamp: new Date().toISOString(),
      });

      // Also persist to sav_experts table if Expert registration
      if (data.type === 'Эксперт' || data.role === 'EXPERT' || data.pseudonym) {
        try {
          await protalkDb.from('sav_experts').insert({
            id: `exp_${partnerId}`,
            pseudonym: data.pseudonym || data.fio,
            greeting: `Приветствую! Я ${data.title || ''} ${data.pseudonym || data.fio}. Помогу разработать и внедрить ИИ-агентов.`,
            description: data.cases || data.other || data.spheres || 'Эксперт AI-GreenLand',
            spheres: data.spheres || null,
            tools: data.tools || null,
            cases: data.cases || null,
            other_info: data.other || null,
            photo_url: data.photo_url || null,
            telegram: data.telegram || null,
            telegram_id: realTgId,
            status: 'pending',
          } as any);
        } catch (expErr) {
          console.warn('sav_experts insert warning:', expErr);
        }
      }

      // Synchronize with users table and session via backend API
      if (data.email && data.password) {
        try {
          const resp = await fetch('/api/v1/auth/email-auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'register',
              email: data.email,
              phone: data.phone || undefined,
              password: data.password,
              telegram_id: realTgId,
              partner_code: partnerId,
              first_name: data.fio ? data.fio.split(' ')[0] : 'Партнер',
              last_name: data.fio ? data.fio.split(' ').slice(1).join(' ') : '',
            }),
          });
          const resData = await resp.json();
          if (resData.success) {
            if (resData.token) localStorage.setItem('sav_auth_token', resData.token);
            if (resData.profile) localStorage.setItem('sav_user_profile', JSON.stringify(resData.profile));
          }
        } catch (authErr) {
          console.warn('Backend email-auth register sync warning:', authErr);
        }
      }
    } catch (e) {
      console.error('BD ProTalk save error:', e);
    }
  };

  const handleResidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setAuthError('');
    setIsSubmitting(true);

    if (!resEmail.trim()) {
      setAuthError('Пожалуйста, укажите адрес электронной почты');
      setIsSubmitting(false);
      return;
    }
    if (!resPhone.trim()) {
      setAuthError('Пожалуйста, укажите контактный номер телефона');
      setIsSubmitting(false);
      return;
    }
    if (!resPassword || resPassword.length < 6) {
      setAuthError('Пароль должен содержать не менее 6 символов');
      setIsSubmitting(false);
      return;
    }
    if (resPassword !== resConfirmPassword) {
      setAuthError('Введенные пароли не совпадают');
      setIsSubmitting(false);
      return;
    }

    const promoOk = await validatePromo(resPromo);
    if (!promoOk) { setIsSubmitting(false); return; }

    setStep('processing');

    const code = resPromo.trim() ? resPromo.toUpperCase() : `AI-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const isRealTg = Boolean(telegramId && /^\d{6,10}$/.test(String(telegramId).trim()));
    const finalPartnerId = isRealTg ? String(telegramId).trim() : Math.floor(10000000000 + Math.random() * 90000000000).toString();

    await sendToGoogleForm({
      'ФИО': resFio,
      'Email': resEmail,
      'Телефон': resPhone,
      'Код Партнера': finalPartnerId,
      'ПРОМОКОД': code,
      'Телеграм': telegramUsername,
      'Тип Регистрации': 'Партнер',
    });

    await saveToProTalkDb({
      fio: resFio,
      email: resEmail.trim(),
      phone: resPhone.trim(),
      password: resPassword,
      promo: code,
      telegram: telegramUsername,
      partner_code: finalPartnerId,
      type: 'Партнер',
    });

    // Send RichMessage notification to Admin Telegram in PM
    try {
      await fetch('/api/v1/partners/register-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fio: resFio,
          email: resEmail.trim(),
          phone: resPhone.trim(),
          telegram: telegramUsername,
          telegramId: isRealTg ? String(telegramId).trim() : null,
          partnerId: finalPartnerId,
          promo: code,
          type: 'Партнер',
          role: 'RESIDENT',
          photo_url: null,
        }),
      });
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr);
    }

    setGeneratedCode(code);
    localStorage.removeItem('sav_user_logged_out');
    localStorage.setItem('sav_partner_registered', 'true');
    localStorage.setItem('sav_partner_code', code);
    localStorage.setItem('sav_partner_id', finalPartnerId);
    window.dispatchEvent(new Event('partner-registered'));
    window.dispatchEvent(new Event('partner-login'));
    setIsSubmitting(false);
    setStep('card');
  };

  const handleExpertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    setAuthError('');
    setIsSubmitting(true);

    if (!expEmail.trim()) {
      setAuthError('Пожалуйста, укажите адрес электронной почты');
      setIsSubmitting(false);
      return;
    }
    if (!expPhone.trim()) {
      setAuthError('Пожалуйста, укажите контактный номер телефона');
      setIsSubmitting(false);
      return;
    }
    if (!expPassword || expPassword.length < 6) {
      setAuthError('Пароль должен содержать не менее 6 символов');
      setIsSubmitting(false);
      return;
    }
    if (expPassword !== expConfirmPassword) {
      setAuthError('Введенные пароли не совпадают');
      setIsSubmitting(false);
      return;
    }

    const promoOk = await validatePromo(expPromo);
    if (!promoOk) { setIsSubmitting(false); return; }

    setStep('processing');

    const code = expPromo.trim() ? expPromo.toUpperCase() : `AI-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const finalPseudonym = expPseudonym === 'Другое' ? expPseudonymCustom : expPseudonym;
    const isRealTg = Boolean(telegramId && /^\d{6,10}$/.test(String(telegramId).trim()));
    const finalPartnerId = isRealTg ? String(telegramId).trim() : Math.floor(10000000000 + Math.random() * 90000000000).toString();

    await sendToGoogleForm({
      'ФИО': expFio,
      'Email': expEmail,
      'Телефон': expPhone,
      'Код Партнера': finalPartnerId,
      'ПРОМОКОД': code,
      'Псевдоним': finalPseudonym,
      'Обращение': expTitle,
      'Инструменты': expTools,
      'Сферы': expSpheres,
      'Кейсы и боты': expCases,
      'Другое': expOther,
      'Тип Регистрации': 'Эксперт',
    });

    let finalAvatarUrl = expAvatar || null;
    if (expAvatar && expAvatar.startsWith('data:')) {
      try {
        const avRes = await fetch('/api/v1/partners/upload-avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: expAvatar,
            telegram_id: isRealTg ? String(telegramId).trim() : null,
            email: expEmail.trim(),
            pseudonym: finalPseudonym,
          }),
        });
        const avJson = await avRes.json();
        if (avJson && avJson.success && avJson.photo_url) {
          finalAvatarUrl = avJson.photo_url;
        }
      } catch (avErr) {
        console.warn('Avatar upload error:', avErr);
      }
    }

    await saveToProTalkDb({
      fio: expFio,
      email: expEmail.trim(),
      phone: expPhone.trim(),
      password: expPassword,
      promo: code,
      telegram: telegramUsername,
      partner_code: finalPartnerId,
      type: 'Эксперт',
      pseudonym: finalPseudonym,
      title: expTitle,
      tools: expTools,
      spheres: expSpheres,
      cases: expCases,
      other: expOther,
      photo_url: finalAvatarUrl,
    });

    // Send RichMessage notification to Admin Telegram in PM
    try {
      await fetch('/api/v1/partners/register-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fio: expFio,
          email: expEmail.trim(),
          phone: expPhone.trim(),
          telegram: telegramUsername,
          telegramId: isRealTg ? String(telegramId).trim() : null,
          partnerId: finalPartnerId,
          promo: code,
          type: 'Эксперт',
          role: 'EXPERT',
          pseudonym: finalPseudonym,
          title: expTitle,
          tools: expTools,
          spheres: expSpheres,
          cases: expCases,
          other: expOther,
          photo_url: finalAvatarUrl,
        }),
      });
    } catch (notifErr) {
      console.warn('Admin notification error:', notifErr);
    }

    setGeneratedCode(code);
    localStorage.removeItem('sav_user_logged_out');
    localStorage.setItem('sav_partner_registered', 'true');
    localStorage.setItem('sav_partner_code', code);
    localStorage.setItem('sav_partner_id', finalPartnerId);
    window.dispatchEvent(new Event('partner-registered'));
    window.dispatchEvent(new Event('partner-login'));
    setIsSubmitting(false);
    setStep('card');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/email-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: loginIdentifier.trim(),
          password: loginPassword,
          telegram_id: telegramId || null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Ошибка входа. Проверьте почту или логин и пароль.');
      }

      localStorage.removeItem('sav_user_logged_out');
      if (data.token) localStorage.setItem('sav_auth_token', data.token);
      if (data.profile) localStorage.setItem('sav_user_profile', JSON.stringify(data.profile));
      localStorage.setItem('sav_partner_registered', 'true');
      if (data.profile?.partner_code) localStorage.setItem('sav_partner_code', data.profile.partner_code);
      window.dispatchEvent(new Event('partner-registered'));
      window.dispatchEvent(new Event('partner-login'));

      const userRole = (data.profile?.role || '').toUpperCase();
      if (userRole === 'ADMIN') {
        navigate('/partner/admin');
      } else {
        navigate(profilePath);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка авторизации');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(true);
    try {
      const resp = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить временный пароль');
      }
      setForgotMessage(data.message || 'Временный пароль успешно отправлен на вашу почту.');
    } catch (err: any) {
      setForgotError(err.message || 'Ошибка при отправке запроса на сброс пароля');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleDownloadCard = async () => {
    setIsDownloading(true);
    try {
      const cardFio = role === UserRole.RESIDENT ? resFio : expFio;
      const cardPromo = generatedCode || 'RESIDENT';
      const cardRank = role === UserRole.RESIDENT ? 'Резидент' : 'Архитектор';
      const cardType = role === UserRole.RESIDENT ? 'Партнер' : 'Эксперт';

      const canvas = await generateResidentCardCanvas({
        fio: cardFio,
        promo: cardPromo,
        rank: cardRank,
        type: cardType
      });
      const localDataUrl = canvas.toDataURL('image/png');
      const fileName = `AI-GreenLand-Card-${cardPromo}.png`;

      canvas.toBlob(async (blob) => {
        let galleryUrl = '';
        if (blob) {
          try {
            const fd = new FormData();
            fd.append('file', blob, fileName);
            fd.append('custom_name', fileName);
            const upRes = await fetch('/api/files/upload', {
              method: 'POST',
              body: fd
            });
            const upData = await upRes.json();
            if (upData?.file) {
              galleryUrl = upData.file.proxy_url || upData.file.direct_url || upData.file.full_url;
            }
          } catch (e) {
            console.warn('Gallery upload non-blocking error:', e);
          }
        }

        // Direct 1-click download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = localDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Open preview modal with 1-click download & copy link
        setCardModalData({
          isOpen: true,
          dataUrl: localDataUrl,
          galleryUrl: galleryUrl || localDataUrl,
          fileName
        });

        setIsDownloading(false);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to generate card', error);
      setIsDownloading(false);
    }
  };

  const inputClass = "w-full liquid-bubble-secondary border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-xl p-3 text-white outline-none transition placeholder:text-zinc-500 font-medium backdrop-blur-xl text-sm md:text-base";
  const labelClass = "block text-sm md:text-base font-semibold text-zinc-200 mb-1.5 flex items-center gap-1 flex-wrap";

  const shouldShowResidentForm = !partnerReg || showFormPartner;
  const shouldShowExpertForm = !expertReg || showFormExpert;

  if (regLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-[60vh] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 min-h-[70vh] flex items-center justify-center">
      {step === 'form' && (
        <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl max-w-2xl w-full p-6 md:p-10 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <span className="liquid-bubble-glare" />
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent relative z-10">
            {t('imm_title') || 'Иммиграционный центр ИИ-Гренландии'}
          </h2>
          <p className="text-zinc-300 text-center mb-6 text-sm md:text-base font-medium relative z-10">
            {t('imm_subtitle') || 'Заполните заявку для получения статуса и личной карты'}
          </p>

          {/* Top Auth Mode Tabs: Registration vs Login */}
          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`py-3 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 border cursor-pointer ${
                authMode === 'register'
                  ? 'liquid-bubble-gold text-amber-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                  : 'liquid-bubble-secondary text-zinc-300 hover:text-white border-white/10 hover:border-amber-400/30'
              }`}
            >
              <span className="liquid-bubble-glare" />
              <UserCheck size={18} className="relative z-10" />
              <span className="relative z-10">Регистрация</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-3 px-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-300 border cursor-pointer ${
                authMode === 'login'
                  ? 'liquid-bubble-gold text-amber-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                  : 'liquid-bubble-secondary text-zinc-300 hover:text-white border-white/10 hover:border-amber-400/30'
              }`}
            >
              <span className="liquid-bubble-glare" />
              <LogIn size={18} className="relative z-10" />
              <span className="relative z-10">Вход в кабинет</span>
            </button>
          </div>

          {/* LOGIN VIEW */}
          {authMode === 'login' && (
            <div className="relative z-10 space-y-5">
              {/* Telegram Bot MiniApp Direct Access */}
              <div className="liquid-bubble-secondary border border-amber-400/40 rounded-xl p-4 text-center relative overflow-hidden">
                <span className="liquid-bubble-glare" />
                <p className="text-sm text-zinc-300 mb-2 font-medium">
                  Прямой вход и авторегистрация партнеров через Telegram-бот:
                </p>
                <a
                  href="https://t.me/SAVPartnerBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm md:text-base font-bold text-amber-300 hover:text-amber-100 transition-colors"
                >
                  <Send size={18} className="text-amber-400" />
                  <span>Открыть бот @SAVPartnerBot</span>
                  <ExternalLink size={14} className="text-amber-400/70" />
                </a>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Почта или логин <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className={inputClass + ' pl-10'}
                      placeholder="name@domain.com или telegram id"
                      value={loginIdentifier}
                      onChange={e => { setLoginIdentifier(e.target.value); setLoginError(''); }}
                    />
                    <Mail className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Пароль <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      required
                      className={inputClass + ' pl-10 pr-10'}
                      placeholder="Введите пароль"
                      value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                    />
                    <Lock className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-amber-300 cursor-pointer"
                    >
                      {showLoginPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(true); setForgotEmail(loginIdentifier); }}
                    className="text-sm text-amber-300/90 hover:text-amber-200 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Забыли пароль?
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className="text-sm text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Создать новый аккаунт
                  </button>
                </div>

                {loginError && (
                  <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/40 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-400 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.45)] w-full py-3.5 text-base flex items-center justify-center gap-2 mt-4 rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
                >
                  <span className="liquid-bubble-glare" />
                  {loginLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin relative z-10" />
                      <span className="relative z-10">Выполняем вход...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} className="relative z-10" />
                      <span className="relative z-10">Войти в партнёрский кабинет</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* REGISTRATION VIEW */}
          {authMode === 'register' && (
            <>
              {/* Role Selector: 3D Liquid Glass Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.RESIDENT)}
                  className={`p-4 rounded-xl transition-all text-left relative overflow-hidden backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-95 duration-300 border ${
                    role === UserRole.RESIDENT
                      ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                      : 'liquid-bubble-secondary text-zinc-200 hover:text-white border-white/10 hover:border-amber-400/40'
                  }`}
                >
                  <span className="liquid-bubble-glare" />
                  {partnerReg && (
                    <CheckCircle2 size={18} className={`absolute top-2 right-2 relative z-10 ${role === UserRole.RESIDENT ? 'text-amber-950' : 'text-amber-400'}`} />
                  )}
                  <div className={`font-bold text-sm md:text-base mb-1 relative z-10 ${role === UserRole.RESIDENT ? 'text-amber-950' : 'text-white'}`}>{t('imm_role_res')}</div>
                  <div className={`text-sm relative z-10 font-medium ${role === UserRole.RESIDENT ? 'text-amber-900' : 'text-zinc-400'}`}>{t('imm_role_res_desc')}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole(UserRole.ARCHITECT)}
                  className={`p-4 rounded-xl transition-all text-left relative overflow-hidden backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-95 duration-300 border ${
                    role === UserRole.ARCHITECT
                      ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                      : 'liquid-bubble-secondary text-zinc-200 hover:text-white border-white/10 hover:border-amber-400/40'
                  }`}
                >
                  <span className="liquid-bubble-glare" />
                  {expertReg && (
                    <CheckCircle2 size={18} className={`absolute top-2 right-2 relative z-10 ${role === UserRole.ARCHITECT ? 'text-amber-950' : 'text-amber-400'}`} />
                  )}
                  <div className={`font-bold text-sm md:text-base mb-1 relative z-10 ${role === UserRole.ARCHITECT ? 'text-amber-950' : 'text-white'}`}>{t('imm_role_exp')}</div>
                  <div className={`text-sm relative z-10 font-medium ${role === UserRole.ARCHITECT ? 'text-amber-900' : 'text-zinc-400'}`}>{t('imm_role_exp_desc')}</div>
                </button>
              </div>

          {/* RESIDENT SECTION */}
          {role === UserRole.RESIDENT && (
            <div className="relative z-10">
              {partnerReg && !showFormPartner && (
                <RegistrationBanner
                  reg={partnerReg}
                  lang={lang}
                  onReRegister={() => prefillPartnerForm(partnerReg)}
                  onGoProfile={() => navigate(profilePath)}
                />
              )}

              {shouldShowResidentForm && (
                <form onSubmit={handleResidentSubmit} className="space-y-4">
                  {showFormPartner && (
                    <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-400 shrink-0" />
                      Повторная регистрация. Данные предзаполнены из предыдущей заявки.
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>
                      ФИО <span className="text-amber-400">*</span>
                      <Tooltip text="Фамилия Имя Отчество" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className={inputClass + ' pl-10'}
                        placeholder="Иванов Иван Иванович"
                        value={resFio}
                        onChange={e => setResFio(e.target.value)}
                      />
                      <User className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Промокод <span className="text-amber-400">*</span>
                      <Tooltip text="Придумайте свой уникальный промокод. Клиенты получат скидку 5% при регистрации через бота. Например: IVANOV" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className={inputClass + ' pl-10 font-mono text-amber-400 font-bold'}
                        placeholder="IVANOV"
                        value={resPromo}
                        onChange={e => { setResPromo(e.target.value); setPromoError(''); }}
                      />
                      <Fingerprint className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                    {promoError && (
                      <p className="text-amber-300 text-sm mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle size={14} className="text-amber-400" />
                        {promoError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>
                      Электронная почта <span className="text-amber-400">*</span>
                      <Tooltip text="Почта используется как логин для входа в кабинет и восстановления пароля" />
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        className={inputClass + ' pl-10'}
                        placeholder="name@domain.com"
                        value={resEmail}
                        onChange={e => { setResEmail(e.target.value); setAuthError(''); }}
                      />
                      <Mail className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Номер телефона <span className="text-amber-400">*</span>
                      <Tooltip text="Номер телефона для оперативной связи и подтверждения статуса партнера" />
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        className={inputClass + ' pl-10'}
                        placeholder="+7 (999) 000-00-00"
                        value={resPhone}
                        onChange={e => { setResPhone(e.target.value); setAuthError(''); }}
                      />
                      <Phone className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        Пароль <span className="text-amber-400">*</span>
                        <Tooltip text="Придумайте надежный пароль от 6 символов" />
                      </label>
                      <div className="relative">
                        <input
                          type={showResPass ? 'text' : 'password'}
                          required
                          className={inputClass + ' pl-10 pr-10'}
                          placeholder="Не менее 6 знаков"
                          value={resPassword}
                          onChange={e => { setResPassword(e.target.value); setAuthError(''); }}
                        />
                        <Lock className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                        <button
                          type="button"
                          onClick={() => setShowResPass(!showResPass)}
                          className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-amber-300 cursor-pointer"
                        >
                          {showResPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Повтор пароля <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showResPass ? 'text' : 'password'}
                          required
                          className={inputClass + ' pl-10'}
                          placeholder="Повторите пароль"
                          value={resConfirmPassword}
                          onChange={e => { setResConfirmPassword(e.target.value); setAuthError(''); }}
                        />
                        <Key className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => { setShowForgotModal(true); setForgotEmail(resEmail); }}
                      className="text-sm text-amber-300/90 hover:text-amber-200 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Забыли пароль?
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-sm text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Уже есть аккаунт? Войти
                    </button>
                  </div>

                  {authError && (
                    <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/40 rounded-xl p-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-400 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="liquid-bubble-secondary border border-white/10 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-amber-300 font-semibold">Данные из Telegram (подставляются автоматически):</p>
                    {telegramId && (
                      <p className="text-sm text-zinc-300 flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" />
                        Код Партнера (TG ID): <span className="font-mono text-amber-400 font-bold">{telegramId}</span>
                      </p>
                    )}
                    {telegramUsername && (
                      <p className="text-sm text-zinc-300 flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" />
                        Телеграм Username: <span className="font-mono text-amber-400 font-bold">@{telegramUsername.replace('@', '')}</span>
                      </p>
                    )}
                    {!telegramId && !telegramUsername && (
                      <p className="text-sm text-zinc-400 italic font-medium">Войдите через Telegram для автоматического заполнения</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.45)] w-full py-3.5 text-base flex items-center justify-center gap-2 mt-2 rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="liquid-bubble-glare" />
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin relative z-10" />
                        <span className="relative z-10">Проверяем...</span>
                      </>
                    ) : (
                      <span className="relative z-10">{t('imm_btn') || 'Получить карту резидента'}</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* EXPERT SECTION */}
          {role === UserRole.ARCHITECT && (
            <div className="relative z-10">
              {expertReg && !showFormExpert && (
                <RegistrationBanner
                  reg={expertReg}
                  lang={lang}
                  onReRegister={() => prefillExpertForm(expertReg)}
                  onGoProfile={() => navigate(profilePath)}
                />
              )}

              {shouldShowExpertForm && (
                <form onSubmit={handleExpertSubmit} className="space-y-4">
                  {showFormExpert && (
                    <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-400 shrink-0" />
                      Повторная регистрация эксперта. Данные предзаполнены.
                    </div>
                  )}

                  <div>
                    <label className={labelClass}>
                      ФИО <span className="text-amber-400">*</span>
                      <Tooltip text="Фамилия Имя Отчество" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className={inputClass + ' pl-10'}
                        placeholder="Иванов Иван Иванович"
                        value={expFio}
                        onChange={e => setExpFio(e.target.value)}
                      />
                      <User className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Промокод <span className="text-amber-400">*</span>
                      <Tooltip text="Уникальный промокод эксперта. Например: EXPERT_AI" />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className={inputClass + ' pl-10 font-mono text-amber-400 font-bold'}
                        placeholder="EXPERT_AI"
                        value={expPromo}
                        onChange={e => { setExpPromo(e.target.value); setPromoError(''); }}
                      />
                      <Fingerprint className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                    {promoError && (
                      <p className="text-amber-300 text-sm mt-1 flex items-center gap-1 font-medium">
                        <AlertCircle size={14} className="text-amber-400" />
                        {promoError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>
                      Электронная почта <span className="text-amber-400">*</span>
                      <Tooltip text="Почта используется для входа в кабинет эксперта и восстановления пароля" />
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        className={inputClass + ' pl-10'}
                        placeholder="name@domain.com"
                        value={expEmail}
                        onChange={e => { setExpEmail(e.target.value); setAuthError(''); }}
                      />
                      <Mail className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Номер телефона <span className="text-amber-400">*</span>
                      <Tooltip text="Номер телефона для оперативной связи с заказчиками и координаторами" />
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        className={inputClass + ' pl-10'}
                        placeholder="+7 (999) 000-00-00"
                        value={expPhone}
                        onChange={e => { setExpPhone(e.target.value); setAuthError(''); }}
                      />
                      <Phone className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        Пароль <span className="text-amber-400">*</span>
                        <Tooltip text="Придумайте надежный пароль от 6 символов" />
                      </label>
                      <div className="relative">
                        <input
                          type={showExpPass ? 'text' : 'password'}
                          required
                          className={inputClass + ' pl-10 pr-10'}
                          placeholder="Не менее 6 знаков"
                          value={expPassword}
                          onChange={e => { setExpPassword(e.target.value); setAuthError(''); }}
                        />
                        <Lock className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                        <button
                          type="button"
                          onClick={() => setShowExpPass(!showExpPass)}
                          className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-amber-300 cursor-pointer"
                        >
                          {showExpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Повтор пароля <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showExpPass ? 'text' : 'password'}
                          required
                          className={inputClass + ' pl-10'}
                          placeholder="Повторите пароль"
                          value={expConfirmPassword}
                          onChange={e => { setExpConfirmPassword(e.target.value); setAuthError(''); }}
                        />
                        <Key className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => { setShowForgotModal(true); setForgotEmail(expEmail); }}
                      className="text-sm text-amber-300/90 hover:text-amber-200 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      Забыли пароль?
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="text-sm text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Уже есть аккаунт? Войти
                    </button>
                  </div>

                  {authError && (
                    <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/40 rounded-xl p-3 flex items-center gap-2">
                      <AlertCircle size={16} className="text-amber-400 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Expert Avatar Upload */}
                  <div className="liquid-bubble-secondary p-3.5 rounded-2xl border border-white/10">
                    <label className={labelClass + ' mb-2'}>
                      Фото / Аватарка эксперта
                      <Tooltip text="Загрузите фото или изображение профиля. Оно будет отображаться в списках выбора экспертов и в вашем кабинете." />
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-amber-400/40 bg-zinc-900/90 flex items-center justify-center shrink-0 relative shadow-inner">
                        {expAvatar ? (
                          <img src={expAvatar} alt="Аватар эксперта" className="w-full h-full object-cover" />
                        ) : (
                          <User size={30} className="text-amber-400/60" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="liquid-bubble-gold text-amber-950 px-3.5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-amber-300 shadow-md cursor-pointer hover:scale-[1.02] active:scale-95 transition-all w-fit">
                          <Upload size={16} />
                          <span>{expAvatar ? 'Изменить фото' : 'Загрузить аватар'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                        </label>
                        <p className="text-sm text-zinc-400 mt-1.5 font-medium">PNG, JPG, WebP до 8 МБ</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        Псевдоним <span className="text-amber-400">*</span>
                        <Tooltip text="Выберите кодовое имя эксперта" />
                      </label>
                      <div className="relative">
                        <select
                          required
                          className={inputClass + ' appearance-none pr-8 bg-zinc-900/80'}
                          value={expPseudonym}
                          onChange={e => setExpPseudonym(e.target.value)}
                        >
                          <option value="" className="bg-zinc-900 text-white">Выберите...</option>
                          {pseudonymOptions.map(p => <option key={p} value={p} className="bg-zinc-900 text-white">{p}</option>)}
                          <option value="Другое" className="bg-zinc-900 text-white">Другое</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 text-amber-400/60 pointer-events-none" size={16} />
                      </div>
                      {expPseudonym === 'Другое' && (
                        <input
                          type="text"
                          required
                          className={inputClass + ' mt-2'}
                          placeholder="Ваш вариант"
                          value={expPseudonymCustom}
                          onChange={e => setExpPseudonymCustom(e.target.value)}
                        />
                      )}
                    </div>

                    <div>
                      <label className={labelClass}>
                        Обращение <span className="text-amber-400">*</span>
                        <Tooltip text={'Dr. – доктор\nMr. – мистер\nMrs. – миссис\nMs. – мисс\nPr. – профессор'} />
                      </label>
                      <div className="relative">
                        <select
                          required
                          className={inputClass + ' appearance-none pr-8 bg-zinc-900/80'}
                          value={expTitle}
                          onChange={e => setExpTitle(e.target.value)}
                        >
                          {TITLES.map(t => <option key={t} value={t} className="bg-zinc-900 text-white">{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 text-amber-400/60 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Инструменты
                      <Tooltip text="CRM, телефония, конструкторы ботов, LLM и другие инструменты" />
                    </label>
                    <MiniAudioField
                      multiline
                      rows={3}
                      placeholder="amoCRM, Bitrix24, n8n, OpenAI, ManyChat..."
                      value={expTools}
                      onChange={val => setExpTools(val)}
                      className={inputClass + ' p-3 min-h-[85px]'}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Сферы деятельности
                      <Tooltip text="Отрасли, в которых у вас есть реальный опыт работы" />
                    </label>
                    <MiniAudioField
                      multiline
                      rows={2}
                      placeholder="E-commerce, недвижимость, медицина, образование..."
                      value={expSpheres}
                      onChange={val => setExpSpheres(val)}
                      className={inputClass + ' p-3 min-h-[70px]'}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Кейсы и боты
                      <Tooltip text="Примеры реализованных решений" />
                    </label>
                    <MiniAudioField
                      multiline
                      rows={3}
                      placeholder="Чат-бот для записи клиентов, автоворонка продаж..."
                      value={expCases}
                      onChange={val => setExpCases(val)}
                      className={inputClass + ' p-3 min-h-[85px]'}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Дополнительная информация
                    </label>
                    <MiniAudioField
                      multiline
                      rows={2}
                      placeholder="Опыт, портфолио, ссылки на проекты..."
                      value={expOther}
                      onChange={val => setExpOther(val)}
                      className={inputClass + ' p-3 min-h-[70px]'}
                    />
                  </div>

                  <div className="liquid-bubble-secondary border border-white/10 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-amber-300 font-semibold">Данные из Telegram (подставляются автоматически):</p>
                    {telegramId && (
                      <p className="text-sm text-zinc-300 flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" />
                        Код Партнера (TG ID): <span className="font-mono text-amber-400 font-bold">{telegramId}</span>
                      </p>
                    )}
                    {telegramUsername && (
                      <p className="text-sm text-zinc-300 flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" />
                        Телеграм Username: <span className="font-mono text-amber-400 font-bold">@{telegramUsername.replace('@', '')}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.45)] w-full py-3.5 text-base flex items-center justify-center gap-2 mt-2 rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="liquid-bubble-glare" />
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin relative z-10" />
                        <span className="relative z-10">Проверяем...</span>
                      </>
                    ) : (
                      <span className="relative z-10">{t('imm_btn_exp') || 'Подать заявку эксперта'}</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
          </>
          )}
        </div>
      )}

      {step === 'processing' && (
        <div className="text-center py-12">
          <Loader2 size={56} className="animate-spin text-amber-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">{t('imm_processing') || 'Создание личной Green Card...'}</h3>
        </div>
      )}

      {step === 'card' && (
        <div className="flex flex-col items-center">
          <ResidentCard
            ref={cardRef}
            fio={role === UserRole.RESIDENT ? resFio : expFio}
            promo={generatedCode}
            rank={role === UserRole.RESIDENT ? 'Резидент' : 'Архитектор'}
            type={role === UserRole.RESIDENT ? 'Партнер' : 'Эксперт'}
          />
          <div className="mt-6 text-center max-w-md w-full px-4 space-y-3">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-2">{t('imm_success') || 'Green Card успешно создана!'}</h3>
            <button
              onClick={handleDownloadCard}
              disabled={isDownloading}
              className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.45)] w-full py-3.5 text-base flex items-center justify-center gap-2 rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <span className="liquid-bubble-glare" />
              {isDownloading ? <><Loader2 size={18} className="animate-spin relative z-10" /> <span className="relative z-10">Генерация файла...</span></> : <><Download size={18} className="relative z-10" /> <span className="relative z-10">Скачать карту (PNG)</span></>}
            </button>
            <button
              onClick={() => navigate(profilePath)}
              className="liquid-bubble-secondary border border-white/15 text-zinc-200 hover:text-white rounded-xl font-medium w-full py-3.5 flex items-center justify-center gap-2 transition-all text-sm md:text-base relative overflow-hidden hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span className="liquid-bubble-glare" />
              <UserCheck size={18} className="relative z-10" />
              <span className="relative z-10 font-semibold">Перейти в личный кабинет</span>
            </button>
            <a
              href="https://t.me/SAVPartnerBot"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-bubble-secondary border border-amber-400/40 text-amber-300 hover:text-white rounded-xl font-medium w-full py-3.5 flex items-center justify-center gap-2 transition-all text-sm md:text-base relative overflow-hidden hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span className="liquid-bubble-glare" />
              <Send size={18} className="text-amber-400 relative z-10" />
              <span className="relative z-10 font-semibold">Войти в Telegram MiniApp @SAVPartnerBot</span>
            </a>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="liquid-bubble-plate border border-amber-400/40 rounded-2xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl">
            <span className="liquid-bubble-glare" />
            <button
              onClick={() => { setShowForgotModal(false); setForgotMessage(''); setForgotError(''); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white relative z-10 p-1 rounded-lg cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-amber-300 mb-2 relative z-10 flex items-center gap-2">
              <Key size={20} className="text-amber-400" />
              <span>Восстановление пароля</span>
            </h3>
            <p className="text-sm text-zinc-300 mb-4 relative z-10 font-medium">
              Укажите email, привязанный к вашему аккаунту. Мы вышлем временный пароль для входа.
            </p>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 relative z-10">
              <div>
                <label className={labelClass}>
                  Электронная почта <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    className={inputClass + ' pl-10'}
                    placeholder="name@domain.com"
                    value={forgotEmail}
                    onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                  />
                  <Mail className="absolute left-3.5 top-3.5 text-amber-400/60" size={18} />
                </div>
              </div>

              {forgotMessage && (
                <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/40 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                  <span>{forgotMessage}</span>
                </div>
              )}

              {forgotError && (
                <div className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/40 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-400 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-md w-full py-3 text-sm md:text-base flex items-center justify-center gap-2 rounded-xl relative overflow-hidden hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                <span className="liquid-bubble-glare" />
                {forgotLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin relative z-10" />
                    <span className="relative z-10">Отправляем...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} className="relative z-10" />
                    <span className="relative z-10">Отправить пароль на почту</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GENERATED CARD PREVIEW MODAL */}
      {cardModalData && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="liquid-bubble-plate border border-amber-400/40 rounded-2xl p-6 md:p-8 max-w-lg w-full relative overflow-hidden backdrop-blur-2xl shadow-2xl space-y-6 text-center">
            <span className="liquid-bubble-glare" />

            <div className="flex justify-between items-center relative z-10">
              <h3 className="text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                Ваша Green Card успешно создана!
              </h3>
              <button
                onClick={() => setCardModalData(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative z-10 p-2 rounded-2xl bg-black/40 border border-amber-400/30 overflow-hidden shadow-2xl">
              <img
                src={cardModalData.dataUrl}
                alt="Green Card"
                className="w-full h-auto rounded-xl object-contain shadow-lg"
              />
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-sm text-zinc-300">
                Изображение сохранено в галерею на сервере и скачано на ваше устройство.
              </p>
              {cardModalData.galleryUrl && (
                <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-amber-300 truncate">{cardModalData.galleryUrl}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        cardModalData.galleryUrl.startsWith('http')
                          ? cardModalData.galleryUrl
                          : `${window.location.origin}${cardModalData.galleryUrl}`
                      );
                    }}
                    className="liquid-bubble-secondary px-2.5 py-1 rounded-lg text-amber-300 text-sm shrink-0 cursor-pointer"
                  >
                    Копировать ссылку
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 relative z-10 pt-2">
              <a
                href={cardModalData.dataUrl}
                download={cardModalData.fileName}
                className="liquid-bubble-gold px-6 py-2.5 rounded-xl text-sm font-bold text-amber-950 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] inline-flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                <Download size={16} />
                <span>Скачать повторно</span>
              </a>
              <button
                onClick={() => setCardModalData(null)}
                className="liquid-bubble-secondary px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white border border-white/15 cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
