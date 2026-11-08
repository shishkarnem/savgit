import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  Download,
  Share2,
  Copy,
  Loader2,
  UserCircle,
  Wallet,
  Settings,
  Briefcase,
  MapPin,
  Hash,
  Calendar,
  Award,
  Star,
  FileText,
  ExternalLink,
  ChevronDown,
  Edit3,
  Camera,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Phone,
  Mail,
  Send,
  Eye,
  EyeOff,
  Lock,
  Key,
  ShieldCheck,
  CreditCard,
  Bot,
  Link,
  LogOut
} from 'lucide-react';
import { ResidentCard } from './ResidentCard';
import { generateResidentCardCanvas } from '@/utils/cardGenerator';
import { Treasury } from './Treasury';
// @ts-ignore
import html2canvas from 'html2canvas';
import { CityNode, Language } from '@/types';
import { TelegramProfile } from '@/hooks/useTelegramUser';
import { protalkDb } from '@/integrations/protalk/client';

interface ProfileProps {
  lang: Language;
  mapImage: string;
  cities: CityNode[];
  onUpdateMapImage: (url: string) => void;
  onUpdateCities: (cities: CityNode[]) => void;
  t: (key: string) => string;
  appData: any;
  setAppData: (data: any) => void;
  tgProfile: TelegramProfile | null;
  tgLoading: boolean;
  isTelegram: boolean;
}

export const Profile: React.FC<ProfileProps> = ({
  lang,
  mapImage,
  cities,
  onUpdateMapImage,
  onUpdateCities,
  t,
  appData,
  setAppData,
  tgProfile,
  tgLoading,
  isTelegram
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const adminPath = location.pathname.startsWith('/partner') ? '/partner/admin' : '/greenland/admin';
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'treasury' | 'hq'>('main');
  const [partnerData, setPartnerData] = useState<any>(null);
  const [partnerProfileData, setPartnerProfileData] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [contractLinks, setContractLinks] = useState<any[]>([]);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);

  const [copiedSiteLink, setCopiedSiteLink] = useState(false);
  const [copiedBotLink, setCopiedBotLink] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editFio, setEditFio] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editTelegram, setEditTelegram] = useState<string>('');
  const [editTelegramId, setEditTelegramId] = useState<string>('');
  const [editPromo, setEditPromo] = useState<string>('');
  const [editCity, setEditCity] = useState<string>('');
  const [editRank, setEditRank] = useState<string>('Резидент');
  const [editType, setEditType] = useState<string>('Партнер');
  // Expert Section toggle
  const [showExpertSection, setShowExpertSection] = useState<boolean>(false);
  const [editPseudonym, setEditPseudonym] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editSpheres, setEditSpheres] = useState<string>('');
  const [editTools, setEditTools] = useState<string>('');
  const [editCases, setEditCases] = useState<string>('');
  const [editOther, setEditOther] = useState<string>('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [copiedAvatarUrl, setCopiedAvatarUrl] = useState<boolean>(false);
  const [copiedTgId, setCopiedTgId] = useState<boolean>(false);
  const editFormRef = useRef<HTMLFormElement>(null);

  const [promoCheckStatus, setPromoCheckStatus] = useState<{ available: boolean; message: string } | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('');

  // Password management states for email authentication
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [isSendingForgotPassword, setIsSendingForgotPassword] = useState<boolean>(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string>('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string>('');
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState<string>('');

  // Generated Card Modal Preview
  const [cardModalData, setCardModalData] = useState<{
    isOpen: boolean;
    dataUrl: string;
    galleryUrl: string;
    fileName: string;
  } | null>(null);

  const [savedAuthUser, setSavedAuthUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('sav_user_profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const effectiveTgId = useMemo(() => {
    if (tgProfile?.telegram_id) return String(tgProfile.telegram_id).trim();
    const candidate = partnerData?.telegram_id || savedAuthUser?.telegram_id;
    if (candidate) {
      const str = String(candidate).trim();
      if (/^\d{6,10}$/.test(str)) return str;
    }
    return null;
  }, [tgProfile?.telegram_id, partnerData?.telegram_id, savedAuthUser?.telegram_id]);

  // Check admin privileges strictly
  const isAdmin = useMemo(() => {
    const currentTgId = String(effectiveTgId || '').trim();
    if (currentTgId === '169262990') return true;
    if (savedAuthUser?.email === 'shishkarnem@gmail.com') return true;
    if (
      savedAuthUser?.role === 'ADMIN' ||
      savedAuthUser?.role === 'admin' ||
      savedAuthUser?.is_admin === 1 ||
      savedAuthUser?.is_admin === true
    ) return true;
    if (userRole === 'ADMIN' || userRole === 'admin' || userRole === 'СУПЕРАДМИН') return true;
    return false;
  }, [effectiveTgId, savedAuthUser, userRole]);

  // Partner ID (код партнера):
  // 1. If partnerData?.partner_code exists, that is the partner ID
  // 2. If registered via TG MiniApp, telegram_id is the partner ID
  // 3. savedAuthUser?.partner_code
  // 4. localStorage 'sav_partner_id'
  // 5. Generate 11-digit partner code, store as partner_code (NEVER as telegram_id!)
  const partnerId = useMemo(() => {
    if (partnerData?.partner_code && String(partnerData.partner_code).trim().length > 0) {
      return String(partnerData.partner_code).trim();
    }
    if (tgProfile?.telegram_id) {
      return String(tgProfile.telegram_id).trim();
    }
    if (savedAuthUser?.partner_code && String(savedAuthUser.partner_code).trim().length > 0) {
      return String(savedAuthUser.partner_code).trim();
    }
    const localId = localStorage.getItem('sav_partner_id');
    if (localId && localId.trim().length > 0) return localId.trim();

    const generated11 = String(Math.floor(10000000000 + Math.random() * 90000000000));
    localStorage.setItem('sav_partner_id', generated11);
    if (savedAuthUser) {
      try {
        const updated = { ...savedAuthUser, partner_code: generated11 };
        localStorage.setItem('sav_user_profile', JSON.stringify(updated));
      } catch {}
    }
    fetch('/api/v1/partners/update-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: savedAuthUser?.email, partner_code: generated11 }),
    }).catch(() => {});
    return generated11;
  }, [tgProfile?.telegram_id, savedAuthUser, partnerData]);

  // Website Referral Link: домен/?ref169262990
  const siteReferralLink = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?ref${partnerId}`;
  }, [partnerId]);

  const botReferralLink = useMemo(() => {
    return `https://t.me/SAVPartnerBot?start=ref_${partnerId}`;
  }, [partnerId]);

  const fetchProfileDetails = async () => {
    try {
      const q = new URLSearchParams();
      if (effectiveTgId) q.append('tgId', String(effectiveTgId));
      if (savedAuthUser?.email) q.append('email', String(savedAuthUser.email));
      if (partnerId) q.append('id', String(partnerId));
      const savedPromo = localStorage.getItem('sav_partner_code');
      if (savedPromo) q.append('promo', savedPromo);

      const res = await fetch(`/api/v1/partners/profile-details?${q.toString()}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.partner) setPartnerData(json.partner);
          if (json.partner_profile) setPartnerProfileData(json.partner_profile);
          if (json.user?.role) setUserRole(json.user.role);
          if (json.partner?.role) setUserRole(json.partner.role);
          return;
        }
      }

      // Fallback direct BD ProTalk query
      const { data: pData } = await protalkDb
        .from('partners')
        .select('*')
        .or(`partner_code.eq.${effectiveTgId || partnerId},telegram_id.eq.${effectiveTgId || partnerId},email.eq.${savedAuthUser?.email || '___NONE___'}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pData && pData.length > 0) {
        setPartnerData(pData[0]);
      }

      const { data: ppData } = await protalkDb
        .from('partner_profile' as any)
        .select('*')
        .or(`telegram_id.eq.${effectiveTgId || partnerId},promo.eq.${savedPromo || '___NONE___'}`)
        .limit(1);

      if (ppData && ppData.length > 0) {
        setPartnerProfileData(ppData[0]);
      }
    } catch (e) {
      console.warn('Fetch profile details error:', e);
    }
  };

  useEffect(() => {
    fetchProfileDetails();

    const fetchContracts = async () => {
      try {
        const targetTg = effectiveTgId || partnerId;
        const targetEmail = savedAuthUser?.email;
        let query = protalkDb.from('contracts').select('*');
        if (targetTg && targetEmail) {
          query = query.or(`telegram_id.eq.${targetTg},email.eq.${targetEmail}`);
        } else if (targetTg) {
          query = query.eq('telegram_id', targetTg);
        } else if (targetEmail) {
          query = query.eq('email', targetEmail);
        } else {
          return;
        }
        const { data } = await query.order('created_at', { ascending: false });
        if (data) setContractLinks(data);
      } catch (err) {
        console.warn('Contracts fetch error:', err);
      }
    };
    fetchContracts();

    const fetchReferral = async () => {
      try {
        const targetTg = effectiveTgId || partnerId;
        const { data } = await protalkDb
          .from('referral_links')
          .select('*')
          .eq('partner_code', targetTg)
          .limit(1);
        if (data && data.length > 0) setReferralData(data[0]);
      } catch (e) {
        console.warn('Referral fetch error:', e);
      }
    };
    fetchReferral();
  }, [effectiveTgId, partnerId, savedAuthUser?.role]);

  const user = {
    name: partnerData?.fio || (partnerProfileData?.first_name ? `${partnerProfileData.first_name} ${partnerProfileData.last_name || ''}`.trim() : null) || savedAuthUser?.full_name || savedAuthUser?.partner_fio || savedAuthUser?.fio || tgProfile?.first_name || "Партнёр SAV",
    fio: partnerData?.fio || (partnerProfileData?.first_name ? `${partnerProfileData.first_name} ${partnerProfileData.last_name || ''}`.trim() : null) || savedAuthUser?.full_name || savedAuthUser?.partner_fio || savedAuthUser?.fio || (tgProfile ? `${tgProfile.first_name || ''} ${tgProfile.last_name || ''}`.trim() : "Партнёр SAV"),
    rank: partnerData?.rank || partnerProfileData?.rank || (partnerData?.type === 'Эксперт' ? 'Эксперт' : 'Резидент'),
    type: partnerData?.type || (userRole === 'EXPERT' ? 'Эксперт' : 'Партнер'),
    id: partnerData?.partner_code || (tgProfile?.telegram_id ? String(tgProfile.telegram_id) : null) || partnerId,
    promo: partnerData?.promo || partnerProfileData?.promo || savedAuthUser?.referral_code || savedAuthUser?.partner_code || savedAuthUser?.promo || localStorage.getItem('sav_partner_code') || tgProfile?.promo || "SAV_AI",
    balance: partnerProfileData?.balance || savedAuthUser?.balance || tgProfile?.balance || 0,
    referrals: partnerProfileData?.referrals || savedAuthUser?.referrals || tgProfile?.referrals || 0,
    missionsCompleted: partnerProfileData?.missions_completed || tgProfile?.missions_completed || 0,
    username: tgProfile?.username || savedAuthUser?.username || partnerData?.telegram?.replace('@', '') || partnerProfileData?.username || null,
    photoUrl: partnerData?.photo_url || partnerProfileData?.photo_url || savedAuthUser?.photo_url || tgProfile?.photo_url || null,
    telegramId: effectiveTgId || (partnerData?.telegram_id && /^\d{6,10}$/.test(String(partnerData.telegram_id).trim()) ? String(partnerData.telegram_id).trim() : null),
    referralLink: siteReferralLink,
    phone: partnerData?.phone || savedAuthUser?.phone || '',
    city: partnerData?.city || '',
  };

  const isExpert = user.type === 'Эксперт' || userRole === 'EXPERT' || partnerData?.type === 'Эксперт' || editType === 'Эксперт';

  // Open Edit Modal with existing data
  const handleOpenEditModal = () => {
    const userIsExpert = user.type === 'Эксперт' || userRole === 'EXPERT' || partnerData?.type === 'Эксперт';
    setEditFio(partnerData?.fio || user.fio || '');
    setEditEmail(partnerData?.email || savedAuthUser?.email || '');
    setEditPhone(partnerData?.phone || savedAuthUser?.phone || '');
    setEditTelegram(partnerData?.telegram || (user.username ? `@${user.username}` : ''));
    setEditTelegramId(partnerData?.telegram_id || user.telegramId || '');
    setEditPromo(partnerData?.promo || user.promo || '');
    setEditCity(partnerData?.city || '');
    setEditRank(partnerData?.rank || partnerProfileData?.rank || 'Резидент');
    setEditType(partnerData?.type || (userIsExpert ? 'Эксперт' : 'Партнер'));
    setShowExpertSection(Boolean(partnerData?.pseudonym || partnerData?.tools || partnerData?.cases || partnerData?.type === 'Эксперт'));
    setEditPseudonym(partnerData?.pseudonym || '');
    setEditTitle(partnerData?.title || '');
    setEditSpheres(partnerData?.spheres || '');
    setEditTools(partnerData?.tools || '');
    setEditCases(partnerData?.cases || '');
    setEditOther(partnerData?.other || partnerData?.expert_description || '');
    setEditPhotoUrl(user.photoUrl || '');
    setPromoCheckStatus(null);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');
    setForgotPasswordNotice('');
    setShowEditModal(true);

    // Scroll form to top when opened
    setTimeout(() => {
      if (editFormRef.current) {
        editFormRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 40);
  };

  // Debounced Promo check
  useEffect(() => {
    if (!showEditModal) return;
    const clean = editPromo.trim();
    if (!clean || clean === (partnerData?.promo || user.promo)) {
      setPromoCheckStatus({ available: true, message: 'Текущий промокод' });
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingPromo(true);
      try {
        const res = await fetch(`/api/v1/partners/check-promo?code=${encodeURIComponent(clean)}&currentTgId=${user.telegramId}`);
        const data = await res.json();
        setPromoCheckStatus(data);
      } catch (err) {
        setPromoCheckStatus({ available: true, message: 'Промокод свободен' });
      } finally {
        setIsCheckingPromo(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editPromo, showEditModal, user.telegramId, partnerData?.promo]);

  // Handle avatar upload with persistent disk storage and direct DB link
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setSaveErrorMsg('Размер файла не должен превышать 15 МБ');
      return;
    }

    setIsUploadingAvatar(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (loadEvt) => {
        const base64Data = loadEvt.target?.result as string;
        if (!base64Data) {
          setIsUploadingAvatar(false);
          return;
        }

        try {
          const res = await fetch('/api/v1/partners/upload-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: base64Data,
              telegram_id: editTelegramId.trim() || user.telegramId,
              email: editEmail.trim() || user.email,
              pseudonym: editPseudonym.trim()
            })
          });

          const data = await res.json();
          if (data.success && data.photo_url) {
            setEditPhotoUrl(data.photo_url);
            setSaveSuccessMsg('Аватарка успешно загружена и связана с базой данных!');
            setTimeout(() => setSaveSuccessMsg(''), 3000);
          } else {
            setEditPhotoUrl(base64Data);
          }
        } catch (uploadErr) {
          console.warn('Avatar server upload fallback:', uploadErr);
          setEditPhotoUrl(base64Data);
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsUploadingAvatar(false);
      setSaveErrorMsg('Ошибка при выборе файла');
    }
  };

  // Change Password Handler for Email Login
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');
    setForgotPasswordNotice('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Новый пароль и подтверждение не совпадают');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/v1/partners/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail.trim() || user.email || savedAuthUser?.email,
          telegramId: editTelegramId.trim() || user.telegramId,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setPasswordSuccessMsg(data.message || 'Пароль для входа по email успешно сохранен!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccessMsg(''), 5000);
      } else {
        setPasswordErrorMsg(data.error || 'Не удалось обновить пароль');
      }
    } catch (err: any) {
      setPasswordErrorMsg('Ошибка подключения к серверу при обновлении пароля');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Forgot Password Handler: sends temp password to user email
  const handleForgotPassword = async () => {
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');
    setForgotPasswordNotice('');

    const targetEmail = editEmail.trim() || user.email || savedAuthUser?.email;
    if (!targetEmail || !targetEmail.includes('@')) {
      setPasswordErrorMsg('Укажите корректный Email в профиле для отправки пароля');
      return;
    }

    setIsSendingForgotPassword(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });

      const data = await res.json();
      if (data.success) {
        setForgotPasswordNotice(data.message || `Временный пароль успешно отправлен на ${targetEmail}`);
      } else {
        setPasswordErrorMsg(data.error || 'Не удалось отправить пароль на почту');
      }
    } catch (err: any) {
      setPasswordErrorMsg('Ошибка соединения при отправке пароля');
    } finally {
      setIsSendingForgotPassword(false);
    }
  };

  // Submit Profile Updates to BD ProTalk and update state
  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (promoCheckStatus && !promoCheckStatus.available) {
      setSaveErrorMsg(promoCheckStatus.message || 'Этот промокод уже занят другим резидентом.');
      return;
    }

    setIsSavingProfile(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      const tgCandidate = editTelegramId.trim() || (user.telegramId ? String(user.telegramId) : '');
      const cleanTargetTgId = /^\d{6,10}$/.test(tgCandidate) ? tgCandidate : null;

      // If Telegram ID was updated, synchronize partner identifier in database
      if (cleanTargetTgId && cleanTargetTgId !== String(user.telegramId)) {
        await fetch('/api/v1/partners/update-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_telegram_id: user.telegramId,
            new_telegram_id: cleanTargetTgId,
            email: editEmail.trim(),
            promo: editPromo.trim().toUpperCase()
          })
        }).catch(() => null);
      }

      const payload = {
        telegram_id: cleanTargetTgId,
        partner_code: partnerData?.partner_code || partnerId,
        email: editEmail.trim(),
        fio: editFio.trim(),
        phone: editPhone.trim(),
        city: editCity.trim(),
        rank: editRank.trim(),
        type: editType.trim(),
        telegram: editTelegram.trim(),
        promo: editPromo.trim().toUpperCase(),
        pseudonym: showExpertSection ? editPseudonym.trim() : '',
        title: showExpertSection ? editTitle.trim() : '',
        spheres: showExpertSection ? editSpheres.trim() : '',
        tools: showExpertSection ? editTools.trim() : '',
        cases: showExpertSection ? editCases.trim() : '',
        other: showExpertSection ? editOther.trim() : '',
        expert_description: showExpertSection ? (editOther.trim() || editCases.trim()) : '',
        photo_url: editPhotoUrl.trim()
      };

      const res = await fetch('/api/v1/partners/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('Данные профиля успешно сохранены в базе данных!');
        if (data.partner) {
          setPartnerData(data.partner);
        } else {
          setPartnerData((prev: any) => ({ ...prev, ...payload }));
        }

        // Update local storage auth user and component state
        const updatedUser = {
          ...(savedAuthUser || {}),
          telegram_id: cleanTargetTgId,
          fio: editFio.trim(),
          full_name: editFio.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          city: editCity.trim(),
          rank: editRank.trim(),
          type: editType.trim(),
          promo: editPromo.trim().toUpperCase(),
          photo_url: editPhotoUrl.trim()
        };
        try {
          localStorage.setItem('sav_user_profile', JSON.stringify(updatedUser));
          if (cleanTargetTgId) {
            localStorage.setItem('gl_tg_id', cleanTargetTgId);
          }
          if (editPromo.trim()) {
            localStorage.setItem('sav_partner_code', editPromo.trim().toUpperCase());
          }
        } catch {}
        setSavedAuthUser(updatedUser);

        setTimeout(() => {
          setShowEditModal(false);
          setSaveSuccessMsg('');
        }, 1500);
      } else {
        setSaveErrorMsg(data.error || 'Ошибка при сохранении профиля');
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      setSaveErrorMsg(err.message || 'Сетевая ошибка при сохранении');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Robust PNG Download System: 1-click, saves to gallery, triggers download, opens preview
  const handleDownloadCard = async () => {
    setIsDownloading(true);

    try {
      const cardPromo = user.promo || 'RESIDENT';
      const canvas = await generateResidentCardCanvas({
        fio: user.fio || 'Резидент ИИ-Гренландии',
        promo: cardPromo,
        rank: user.rank || 'Резидент',
        type: user.type || 'Партнер'
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
          setIsDownloading(false);
          return;
        }

        const fileName = `AI-GreenLand-Card-${cardPromo}.png`;
        const localDataUrl = canvas.toDataURL('image/png');
        let galleryUrl = '';

        // 1. Upload to gallery /api/files/upload
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
          console.warn('Gallery auto-upload non-blocking error:', e);
        }

        // 2. Direct 1-click file download
        const a = document.createElement('a');
        a.href = localDataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 3. Open preview modal with download & copy link buttons
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

  const InfoField = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value || value === '-') return null;
    return (
      <div className="flex items-start gap-3 p-3.5 bg-black/40 rounded-xl border border-white/10">
        <div className="p-2 bg-amber-400/15 rounded-lg text-amber-400 shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-400">{label}</p>
          <p className="text-sm md:text-base text-zinc-100 font-medium whitespace-pre-wrap break-words">{value}</p>
        </div>
      </div>
    );
  };

  const formatDateTime = (value?: string | null) => {
    if (!value || value === '-') return null;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString('ru-RU');
  };

  const formatDbKey = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (tgLoading) {
    return (
      <div className="w-full px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin text-amber-400" size={48} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-2 sm:px-4 md:px-6 py-4 space-y-6 animate-fadeIn pb-16">
      {/* Sub-tab Switcher (Liquid Glass Apple Style) */}
      <div className="flex justify-center">
        <div className="liquid-bubble-plate border border-amber-400/35 p-1.5 rounded-2xl flex flex-wrap justify-center gap-2 backdrop-blur-xl shadow-xl relative overflow-hidden">
          <span className="liquid-bubble-glare" />
          <button
            onClick={() => setActiveTab('main')}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 relative z-10 cursor-pointer ${
              activeTab === 'main'
                ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'liquid-bubble-secondary text-zinc-200 hover:text-white border border-white/10'
            }`}
          >
            <UserCircle size={17} />
            <span>{t('prof_tab_main') || 'Профиль'}</span>
          </button>

          <button
            onClick={() => setActiveTab('treasury')}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 relative z-10 cursor-pointer ${
              activeTab === 'treasury'
                ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'liquid-bubble-secondary text-zinc-200 hover:text-white border border-white/10'
            }`}
          >
            <Wallet size={17} />
            <span>{t('prof_tab_treasury') || 'Казначейство'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate(adminPath)}
              className="liquid-bubble-secondary px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 text-zinc-200 hover:text-white border border-white/10 relative z-10 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Settings size={17} />
              <span>{t('prof_tab_hq') || 'Штаб'}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'main' && (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Profile Card, Telegram Details & Partner Links */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-6">
            {/* User Info Card with Liquid Glass Apple & Color Filtered Avatar */}
            <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 text-center relative overflow-hidden backdrop-blur-xl shadow-xl space-y-4">
              <span className="liquid-bubble-glare" />

              <div className="relative z-10">
                <div className="w-24 h-24 rounded-full bg-black/50 border-2 border-amber-400 p-1 mx-auto mb-3 overflow-hidden shadow-2xl relative">
                  {user.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover partner-gold-sepia-filter"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-amber-400">
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-white">{user.name}</h2>
                {user.fio && user.fio !== user.name && (
                  <p className="text-sm text-zinc-300 mt-0.5">{user.fio}</p>
                )}

                <div className="inline-block px-3.5 py-1 bg-amber-400/15 text-amber-300 border border-amber-400/30 rounded-full text-sm font-semibold mt-2">
                  {user.rank}
                </div>

                <div className="pt-4 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleOpenEditModal}
                    className="liquid-bubble-gold text-amber-950 font-bold px-4 py-2 rounded-xl text-sm border border-amber-300 shadow-sm inline-flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit3 size={15} />
                    <span>Редактировать профиль</span>
                  </button>

                  <button
                    onClick={() => {
                      localStorage.setItem('sav_user_logged_out', 'true');
                      localStorage.removeItem('sav_auth_token');
                      localStorage.removeItem('sav_user_profile');
                      localStorage.removeItem('sav_partner_registered');
                      localStorage.removeItem('gl_tg_id');
                      localStorage.removeItem('sav_partner_code');
                      localStorage.removeItem('sav_user_role');
                      localStorage.removeItem('gl_avatar_cache');
                      window.dispatchEvent(new Event('partner-logout'));
                      navigate('/partner/immigration?tab=login');
                    }}
                    className="liquid-bubble-secondary text-zinc-300 hover:text-white font-medium px-4 py-2 rounded-xl text-sm border border-white/15 inline-flex items-center gap-1.5 hover:border-amber-400/40 transition-all cursor-pointer"
                    title="Выйти из личного кабинета"
                  >
                    <LogOut size={15} className="text-amber-400" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Telegram Details */}
            {user.telegramId && (
              <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-5 space-y-3 relative overflow-hidden backdrop-blur-xl shadow-xl">
                <span className="liquid-bubble-glare" />
                <h3 className="font-bold text-white text-base flex items-center gap-2 relative z-10">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-400" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  <span>Telegram и контакты</span>
                </h3>
                <div className="space-y-2 text-sm relative z-10">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-zinc-400">Telegram ID:</span>
                    <span className="font-mono text-amber-300 font-bold">{user.telegramId}</span>
                  </div>
                  {user.username && (
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-zinc-400">Юзернейм:</span>
                      <a
                        href={`https://t.me/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:underline font-mono"
                      >
                        @{user.username}
                      </a>
                    </div>
                  )}
                  {partnerData?.email && (
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-zinc-400">Email:</span>
                      <span className="text-zinc-200 truncate max-w-[180px]">{partnerData.email}</span>
                    </div>
                  )}
                  {partnerData?.phone && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-zinc-400">Телефон:</span>
                      <span className="text-zinc-200">{partnerData.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invite & Referral Links Card */}
            <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-5 md:p-6 text-white space-y-4 relative overflow-hidden backdrop-blur-xl shadow-xl">
              <span className="liquid-bubble-glare" />

              <div className="flex items-center justify-between relative z-10">
                <h3 className="font-bold text-amber-200 text-base flex items-center gap-2">
                  <Share2 size={18} className="text-amber-400" />
                  <span>Партнёрская программа</span>
                </h3>
                <span className="text-sm px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono">
                  ID: {partnerId}
                </span>
              </div>

              {/* Website Referral Link */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between text-sm text-amber-200/90 font-medium">
                  <span>Реферальная ссылка на сайт:</span>
                  <span className="text-sm text-zinc-400">/?ref{partnerId}</span>
                </div>
                <div className="bg-black/40 border border-amber-400/30 p-2.5 rounded-xl flex justify-between items-center gap-2">
                  <span className="font-mono text-sm md:text-base text-amber-300 break-all select-all">
                    {siteReferralLink}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(siteReferralLink);
                      setCopiedSiteLink(true);
                      setTimeout(() => setCopiedSiteLink(false), 2500);
                    }}
                    className="liquid-bubble-gold text-amber-950 font-bold px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 shrink-0 border border-amber-300 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <Copy size={13} />
                    <span>{copiedSiteLink ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
                <p className="text-sm text-zinc-400 leading-tight">
                  При переходе клиента по этой ссылке его промокод автоматически применится во всех формах заявок сайта.
                </p>
              </div>

              {/* Telegram Bot Link */}
              <div className="space-y-1.5 relative z-10 pt-1">
                <div className="flex items-center justify-between text-sm text-amber-200/90 font-medium">
                  <span>Ссылка на Telegram бота (@SAVPartnerBot):</span>
                </div>
                <div className="bg-black/40 border border-white/15 p-2 rounded-xl flex justify-between items-center gap-2">
                  <span className="font-mono text-sm text-zinc-300 break-all select-all">
                    {botReferralLink}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(botReferralLink);
                      setCopiedBotLink(true);
                      setTimeout(() => setCopiedBotLink(false), 2500);
                    }}
                    className="liquid-bubble-secondary text-zinc-200 hover:text-white font-semibold px-2.5 py-1 rounded-lg text-sm flex items-center gap-1 shrink-0 border border-white/15 hover:border-amber-400/30 transition-all cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>{copiedBotLink ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
              </div>

              {/* Promo code */}
              <div className="flex items-center justify-between text-sm text-zinc-300 pt-2 border-t border-white/10 relative z-10">
                <span>Промокод резидента:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-300 text-base">{user.promo}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.promo);
                      setCopiedPromo(true);
                      setTimeout(() => setCopiedPromo(false), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 transition-all cursor-pointer"
                    title="Скопировать промокод"
                  >
                    <Copy size={14} />
                  </button>
                  {copiedPromo && <span className="text-sm text-amber-300 font-medium">Скопирован!</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dossier, Contracts, Referral Stats & Digital Green Card */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-6">
            {/* Dossier Card */}
            {partnerData && (
              <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl shadow-xl">
                <span className="liquid-bubble-glare" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-amber-400" />
                    <span>Досье Резидента</span>
                  </h3>
                  <button
                    onClick={handleOpenEditModal}
                    className="liquid-bubble-secondary text-amber-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-semibold border border-amber-400/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Изменить данные</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 relative z-10">
                  <InfoField icon={Hash} label="Код Партнера" value={partnerData.partner_code || user.id} />
                  <InfoField icon={Activity} label="Статус Партнера" value={partnerData.status || 'Активен'} />
                  <InfoField icon={Award} label="Ранг Резидента" value={user.rank} />
                  <InfoField icon={Award} label="Тип аккаунта" value={user.type} />
                  {partnerData.city && <InfoField icon={MapPin} label="Город / Регион" value={partnerData.city} />}
                  {partnerData.tools && <InfoField icon={Briefcase} label="Инструменты" value={partnerData.tools} />}
                  {partnerData.spheres && <InfoField icon={MapPin} label="Сферы деятельности" value={partnerData.spheres} />}
                  {partnerData.cases && <InfoField icon={FileText} label="Кейсы и боты" value={partnerData.cases} />}
                  {partnerData.other && <InfoField icon={Star} label="Дополнительно" value={partnerData.other || partnerData.expert_description} />}
                  <InfoField icon={Calendar} label="Дата регистрации" value={formatDateTime(partnerData.timestamp || partnerData.created_at)} />
                  <InfoField icon={Calendar} label="Дата обновления" value={formatDateTime(partnerData.updated_at)} />
                </div>
              </div>
            )}

            {/* Referral Info (Liquid Glass Apple Style) */}
            {(referralData || partnerData?.promo) && (
              <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl shadow-xl">
                <span className="liquid-bubble-glare" />
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                  <Share2 className="text-amber-400" />
                  <span>Реферальные данные</span>
                </h3>
                <div className="grid sm:grid-cols-3 gap-3 relative z-10">
                  <InfoField icon={Hash} label="Промокод" value={partnerData?.promo || user.promo} />
                  <InfoField icon={Hash} label="Реферальный код" value={referralData?.referral_code || `ref${partnerId}`} />
                  <InfoField icon={Activity} label="Пригласил" value={referralData?.referred_by || 'Парламент SAV'} />
                </div>
              </div>
            )}

            {/* Contracts Accordion */}
            {contractLinks.length > 0 && (
              <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 relative overflow-hidden backdrop-blur-xl shadow-xl">
                <span className="liquid-bubble-glare" />
                <button
                  onClick={() => setContractsOpen(!contractsOpen)}
                  className="w-full text-lg md:text-xl font-bold text-white flex items-center justify-between gap-2 relative z-10 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="text-amber-400" />
                    <span>Мои договоры ({contractLinks.length})</span>
                  </span>
                  <ChevronDown
                    size={20}
                    className={`transition-transform text-amber-400 ${contractsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {contractsOpen && (
                  <ul className="space-y-2.5 mt-4 relative z-10">
                    {contractLinks.map((c: any, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 p-3.5 bg-black/40 rounded-xl border border-amber-400/20"
                      >
                        <ExternalLink size={16} className="text-amber-400 shrink-0" />
                        <div className="min-w-0 flex-grow">
                          <span className="text-sm font-semibold text-zinc-200">{c.contract_type}</span>
                          {c.date_now && <span className="text-sm text-zinc-400 ml-2">({c.date_now})</span>}
                        </div>
                        <span className="text-sm px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 font-medium">
                          {c.status || 'Подписан'}
                        </span>
                        {c.contract_url && (
                          <a
                            href={c.contract_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 liquid-bubble-gold text-amber-950 text-sm font-bold rounded-lg hover:shadow-md transition-all shrink-0 cursor-pointer"
                          >
                            <ExternalLink size={12} />
                            <span>Открыть</span>
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Resident Card & Robust PNG Download System */}
            <div className="liquid-bubble-plate border border-amber-400/35 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 relative overflow-hidden backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)]">

              <div className="relative z-10 w-full flex justify-center">
                <ResidentCard
                  ref={cardRef}
                  fio={user.fio}
                  promo={user.promo}
                  rank={user.rank}
                  type={user.type}
                  onCopyPromo={() => navigator.clipboard.writeText(user.promo)}
                />
              </div>

              <div className="text-center space-y-3 relative z-10 max-w-md">
                <h4 className="text-lg md:text-xl font-bold text-white">
                  {t('prof_card_title') || 'Ваша цифровая Green Card'}
                </h4>
                <p className="text-sm text-zinc-300">
                  Скачивание карты в высоком разрешении (PNG) с сохранением в вашей галерее резидента.
                </p>

                <button
                  onClick={handleDownloadCard}
                  disabled={isDownloading}
                  className="liquid-bubble-gold px-8 py-3.5 text-base font-bold text-amber-950 rounded-xl relative overflow-hidden shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer mx-auto disabled:opacity-50"
                >
                  <span className="liquid-bubble-glare" />
                  {isDownloading ? (
                    <>
                      <Loader2 size={18} className="animate-spin relative z-10" />
                      <span className="relative z-10">Генерация и сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} className="relative z-10" />
                      <span className="relative z-10">{t('prof_download') || 'Скачать PNG карту'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'treasury' && (
        <Treasury
          lang={lang}
          t={t}
          telegramId={user.telegramId}
          partnerData={{
            fio: user.fio || partnerData?.fio || '',
            telegram: user.telegram || partnerData?.telegram || (user.username ? `@${user.username}` : ''),
            telegramId: user.telegramId || partnerData?.telegram_id || '',
            promo: user.promo || partnerData?.promo || '',
            phone: user.phone || partnerData?.phone || '',
            email: user.email || partnerData?.email || '',
            rank: partnerProfileData?.rank || partnerData?.rank || 'Резидент',
            type: user.type || partnerData?.type || 'Партнер'
          }}
        />
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-transparent animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="liquid-bubble-plate border border-amber-400/40 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col relative overflow-hidden backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] my-auto">
            {/* Header: fixed at the top */}
            <div className="flex items-center justify-between border-b border-amber-400/20 px-6 py-3.5 bg-black/30 shrink-0 relative z-10">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                    Редактирование профиля
                  </h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    isExpert
                      ? 'bg-amber-400/15 text-amber-200 border-amber-400/40'
                      : 'bg-white/10 text-zinc-200 border-white/20'
                  }`}>
                    {isExpert ? 'Эксперт' : 'Партнер'}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">
                  Настройки профиля и привязка к боту @SAVPartnerBot
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form ref={editFormRef} id="edit-profile-form" onSubmit={handleSaveProfileSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar relative z-10">
              {saveSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-sm font-medium flex items-center gap-2 animate-fadeIn">
                  <Check size={18} className="text-amber-400 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {saveErrorMsg && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-amber-400/40 text-amber-300 text-sm font-medium flex items-center gap-2 animate-fadeIn">
                  <AlertCircle size={18} className="text-amber-400 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* Avatar Uploader & DB Link Display */}
              <div className="p-4 rounded-2xl bg-black/20 border border-amber-400/25 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border-2 border-amber-400 overflow-hidden shrink-0 relative shadow-md">
                    {editPhotoUrl ? (
                      <img
                        src={editPhotoUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover partner-gold-sepia-filter"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-bold text-amber-400">
                        {editFio.charAt(0) || 'A'}
                      </div>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 size={18} className="animate-spin text-amber-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-grow space-y-1">
                    <p className="text-sm font-semibold text-white">Аватарка резидента</p>
                    <p className="text-sm text-zinc-400">
                      Отображается в профиле и на вашей цифровой карте
                    </p>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="liquid-bubble-secondary px-3.5 py-1.5 rounded-lg text-sm font-semibold text-amber-200 border border-amber-400/30 flex items-center gap-1.5 cursor-pointer mt-1 hover:border-amber-400/60 transition-all"
                    >
                      <Camera size={14} />
                      <span>{isUploadingAvatar ? 'Загрузка...' : 'Выбрать фото'}</span>
                    </button>
                  </div>
                </div>

                {/* Avatar URL & DB Link Connection */}
                <div className="pt-2 border-t border-amber-400/15 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                      <Link size={13} className="text-amber-400" />
                      <span>Ссылка на аватар</span>
                    </span>
                    <span className="text-amber-300 flex items-center gap-1">
                      <Check size={12} className="text-amber-400" />
                      <span>Связано с базой данных</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      placeholder="Ссылка появится после загрузки фото"
                      className="w-full px-3 py-1.5 bg-black/30 border border-white/15 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400"
                    />
                    {editPhotoUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editPhotoUrl);
                            setCopiedAvatarUrl(true);
                            setTimeout(() => setCopiedAvatarUrl(false), 2000);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 shrink-0 cursor-pointer"
                          title="Скопировать ссылку"
                        >
                          <Copy size={14} />
                        </button>
                        <a
                          href={editPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-white/10 shrink-0 cursor-pointer"
                          title="Открыть в новой вкладке"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </>
                    )}
                  </div>
                  {copiedAvatarUrl && (
                    <p className="text-xs text-amber-300 font-medium animate-fadeIn">Ссылка на аватар скопирована в буфер</p>
                  )}
                  <p className="text-xs text-zinc-400">
                    Фотография сохраняется на сервере и синхронизируется с профилем резидента
                  </p>
                </div>
              </div>

              {/* Status and Community Badges (READ-ONLY for regular users) */}
              <div className="p-4 rounded-2xl bg-black/20 border border-amber-400/25 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-400/15 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-200">Статус резидента в системе</span>
                  </div>
                  <span className="text-xs text-zinc-400">Фиксированные системные данные</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Account Type */}
                  <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-1">
                    <span className="text-xs text-zinc-400 block">Тип аккаунта</span>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>{editType || (isExpert ? 'Эксперт' : 'Партнер')}</span>
                    </div>
                  </div>

                  {/* Community Rank */}
                  <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-1">
                    <span className="text-xs text-zinc-400 block">Ранг в сообществе</span>
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <Award size={14} className="text-amber-400 shrink-0" />
                      <span>{editRank || 'Резидент'}</span>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="p-3 rounded-xl bg-black/25 border border-white/10 space-y-1">
                    <span className="text-xs text-zinc-400 block">Ваш промокод</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-bold text-amber-200">
                        {editPromo || user.promo}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(editPromo || user.promo);
                          setSaveSuccessMsg('Промокод скопирован в буфер');
                          setTimeout(() => setSaveSuccessMsg(''), 2000);
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 p-1 hover:bg-white/5 rounded cursor-pointer"
                        title="Скопировать"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-amber-400/15">
                    <p className="text-xs text-amber-400 font-semibold mb-2">Административный доступ (изменение ранга и типа):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-300 block mb-1">Ранг (Админ):</label>
                        <select
                          value={editRank}
                          onChange={(e) => setEditRank(e.target.value)}
                          className="w-full px-3 py-1.5 bg-black/60 border border-amber-400/40 rounded-lg text-white text-sm"
                        >
                          <option value="Резидент">Резидент</option>
                          <option value="Партнер">Партнер</option>
                          <option value="Мастер">Мастер</option>
                          <option value="Амбассадор">Амбассадор</option>
                          <option value="Канцлер">Канцлер</option>
                          <option value="Архитектор">Архитектор</option>
                          <option value="Министр">Министр</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-300 block mb-1">Тип (Админ):</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="w-full px-3 py-1.5 bg-black/60 border border-amber-400/40 rounded-lg text-white text-sm"
                        >
                          <option value="Партнер">Партнер</option>
                          <option value="Эксперт">Эксперт</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Basic Personal/Partner Information */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2 border-b border-amber-400/20 pb-2">
                  <UserCircle size={16} className="text-amber-400" />
                  <span>Контактные и личные данные</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-zinc-200 mb-1">
                      ФИО <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editFio}
                      onChange={(e) => setEditFio(e.target.value)}
                      placeholder="Иванов Иван Иванович"
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">Телефон</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+7 999 000-00-00"
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">Telegram</label>
                    <input
                      type="text"
                      value={editTelegram}
                      onChange={(e) => setEditTelegram(e.target.value)}
                      placeholder="@username"
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-200 mb-1">Город / Регион</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Москва, Санкт-Петербург..."
                      className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Telegram ID Binding & @SAVPartnerBot Instructions */}
              <div className="p-4 rounded-2xl bg-black/20 border border-amber-400/25 space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-400/15 pb-2">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-200">Подключение Telegram ID (@SAVPartnerBot)</span>
                  </div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    editTelegramId && /^\d+$/.test(editTelegramId.trim())
                      ? 'bg-amber-400/15 text-amber-200 border-amber-400/40'
                      : 'bg-white/10 text-zinc-300 border-white/20'
                  }`}>
                    {editTelegramId && /^\d+$/.test(editTelegramId.trim()) ? 'ID указан' : 'Ожидает привязки'}
                  </span>
                </div>

                {/* Step-by-step instructions for adding to @SAVPartnerBot */}
                <div className="p-3.5 rounded-xl bg-black/25 border border-amber-400/20 space-y-2 text-sm text-zinc-300">
                  <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                    <span>Инструкция для привязки аккаунта в боте:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-300 pl-1 leading-relaxed">
                    <li>
                      Перейдите в официального партнерского бота{' '}
                      <a
                        href="https://t.me/SAVPartnerBot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 underline font-semibold hover:text-amber-300"
                      >
                        @SAVPartnerBot
                      </a>
                    </li>
                    <li>Нажмите кнопку <b>«Запустить» (/start)</b> в диалоге с ботом</li>
                    <li>Бот зарегистрирует вас в системе и отправит ваш личный цифровой <b>Telegram ID</b></li>
                    <li>Скопируйте полученный номер, вставьте в поле ниже и сохраните профиль</li>
                  </ol>
                </div>

                {/* Input & Action */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-200">
                    Ваш цифровой Telegram ID
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={editTelegramId}
                        onChange={(e) => setEditTelegramId(e.target.value)}
                        placeholder="Например: 169262990"
                        className="w-full px-3.5 py-2.5 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      {editTelegramId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editTelegramId);
                            setCopiedTgId(true);
                            setTimeout(() => setCopiedTgId(false), 2000);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-amber-400 hover:text-amber-300 p-1 hover:bg-white/5 rounded cursor-pointer"
                          title="Скопировать Telegram ID"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                    <a
                      href="https://t.me/SAVPartnerBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="liquid-bubble-secondary px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-200 border border-amber-400/30 flex items-center justify-center gap-1.5 hover:border-amber-400/60 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Send size={14} className="text-amber-400" />
                      <span>Перейти в @SAVPartnerBot</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                  {copiedTgId && (
                    <p className="text-xs text-amber-300 font-medium">Telegram ID скопирован в буфер</p>
                  )}
                  <p className="text-xs text-zinc-400">
                    Привязка Telegram ID необходима для мгновенного получения уведомлений о начислениях, статусах сделок и выплатах в боте @SAVPartnerBot
                  </p>
                </div>
              </div>

              {/* Password Editor Section (Email Auth) */}
              <div className="p-4 rounded-2xl bg-black/20 border border-amber-400/25 space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-400/15 pb-2">
                  <div className="flex items-center gap-2">
                    <Key size={18} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-200">Пароль для входа по email</span>
                  </div>
                  <span className="text-xs text-zinc-400">Вход через почту</span>
                </div>

                <p className="text-xs text-zinc-300">
                  Установите или обновите пароль для входа в кабинет по адресу электронной почты.
                </p>

                {passwordSuccessMsg && (
                  <div className="p-3 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-sm font-medium flex items-center gap-2 animate-fadeIn">
                    <Check size={16} className="text-amber-400 shrink-0" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrorMsg && (
                  <div className="p-3 rounded-xl bg-black/40 border border-amber-400/40 text-amber-300 text-sm font-medium flex items-center gap-2 animate-fadeIn">
                    <AlertCircle size={16} className="text-amber-400 shrink-0" />
                    <span>{passwordErrorMsg}</span>
                  </div>
                )}

                {forgotPasswordNotice && (
                  <div className="p-3 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-sm font-medium flex items-center gap-2 animate-fadeIn">
                    <Mail size={16} className="text-amber-400 shrink-0" />
                    <span>{forgotPasswordNotice}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Current Password Field */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Текущий пароль <span className="text-zinc-500 font-normal">(если уже был установлен)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Введите текущий пароль"
                        className="w-full px-3.5 py-2.5 pr-10 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                        title={showCurrentPass ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Новый пароль <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
                          className="w-full px-3.5 py-2.5 pr-10 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          title={showNewPass ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                          {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Повторите новый пароль <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите новый пароль"
                          className="w-full px-3.5 py-2.5 pr-10 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                          title={showConfirmPass ? 'Скрыть пароль' : 'Показать пароль'}
                        >
                          {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Save Password & Forgot Password */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleChangePassword()}
                      disabled={isChangingPassword || !newPassword}
                      className="liquid-bubble-secondary px-4 py-2 rounded-xl text-sm font-semibold text-amber-200 border border-amber-400/40 flex items-center gap-1.5 hover:border-amber-400 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-amber-400" />
                          <span>Обновление пароля...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={14} className="text-amber-400" />
                          <span>Обновить пароль</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSendingForgotPassword}
                      className="text-xs text-zinc-400 hover:text-amber-300 underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Mail size={13} className="text-amber-400" />
                      <span>{isSendingForgotPassword ? 'Отправка...' : 'Забыли пароль? Отправить на почту'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expert Portfolio Section - ONLY FOR EXPERTS! */}
              {isExpert && (
                <div className="space-y-4 pt-1 border-t border-amber-400/20 animate-fadeIn">
                  <h4 className="text-sm font-bold text-amber-200 flex items-center gap-2 border-b border-amber-400/20 pb-2">
                    <Briefcase size={16} className="text-amber-400" />
                    <span>Сведения эксперта (для каталога специалистов)</span>
                  </h4>

                  <div className="space-y-4 p-4 rounded-2xl bg-black/20 border border-amber-400/25">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-200 mb-1">Псевдоним / Бренд эксперта</label>
                        <input
                          type="text"
                          value={editPseudonym}
                          onChange={(e) => setEditPseudonym(e.target.value)}
                          placeholder="Например: Александр AI"
                          className="w-full px-3.5 py-2.5 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-200 mb-1">Специализация</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Архитектор нейросетей, интегратор CRM..."
                          className="w-full px-3.5 py-2.5 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">Сферы деятельности</label>
                      <input
                        type="text"
                        value={editSpheres}
                        onChange={(e) => setEditSpheres(e.target.value)}
                        placeholder="Автоматизация продаж, техподдержка, голосовые роботы"
                        className="w-full px-3.5 py-2.5 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">Инструменты и стек</label>
                      <input
                        type="text"
                        value={editTools}
                        onChange={(e) => setEditTools(e.target.value)}
                        placeholder="Make, n8n, Python, OpenAI, Anthropic, Telegram API"
                        className="w-full px-3.5 py-2.5 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">Кейсы и опыт</label>
                      <textarea
                        rows={2}
                        value={editCases}
                        onChange={(e) => setEditCases(e.target.value)}
                        placeholder="Кратко опишите реализованные проекты и решения"
                        className="w-full px-3.5 py-2 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-200 mb-1">Дополнительно о себе</label>
                      <textarea
                        rows={2}
                        value={editOther}
                        onChange={(e) => setEditOther(e.target.value)}
                        placeholder="Любая дополнительная информация или пожелания"
                        className="w-full px-3.5 py-2 bg-black/30 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer: Fixed at the bottom */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-amber-400/20 bg-black/30 shrink-0 relative z-10">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="liquid-bubble-secondary px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white border border-white/15 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                form="edit-profile-form"
                disabled={isSavingProfile}
                className="liquid-bubble-gold px-6 py-2.5 rounded-xl text-sm font-bold text-amber-950 border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                <span className="liquid-bubble-glare" />
                {isSavingProfile ? (
                  <>
                    <Loader2 size={16} className="animate-spin relative z-10" />
                    <span className="relative z-10">Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} className="relative z-10" />
                    <span className="relative z-10">Сохранить изменения</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATED CARD PREVIEW MODAL */}
      {cardModalData && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm animate-fadeIn">
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

            <div className="relative z-10 p-2 rounded-2xl bg-black/20 border border-amber-400/30 overflow-hidden shadow-2xl">
              <img
                src={cardModalData.dataUrl}
                alt="Green Card"
                className="w-full h-auto rounded-xl object-contain shadow-lg"
              />
            </div>

            <div className="space-y-2 relative z-10">
              <p className="text-sm text-zinc-300">
                Изображение сохранено в галерею и скачано на ваше устройство.
              </p>
              {cardModalData.galleryUrl && (
                <div className="p-2.5 rounded-xl bg-black/25 border border-white/10 flex items-center justify-between gap-2 text-sm">
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
                className="liquid-bubble-secondary px-6 py-2.5 rounded-xl text-sm font-semibold text-zinc-200 hover:text-white border border-white/15 cursor-pointer"
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
