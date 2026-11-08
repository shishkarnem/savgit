import { useState, useCallback, useEffect } from 'react';
import { protalkDb } from '@/integrations/protalk/client';

interface PromoResult {
  isValid: boolean;
  partnerName: string | null;
  discountPercent: number;
}

function getInitialPromo(): string {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('promo') || urlParams.get('ref') || urlParams.get('start');
    if (fromUrl) {
      const clean = fromUrl.trim();
      sessionStorage.setItem('sav-promo-code', clean);
      localStorage.setItem('sav_user_promo', clean);
      return clean;
    }
    const fromSession = sessionStorage.getItem('sav-promo-code');
    if (fromSession) return fromSession.trim();
    const fromLocal = localStorage.getItem('sav_user_promo');
    if (fromLocal) return fromLocal.trim();
  } catch {}
  return '';
}

export const usePromoCode = () => {
  const [promoCode, setPromoCodeState] = useState<string>(getInitialPromo);
  const [isChecking, setIsChecking] = useState(false);
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);

  const setPromoCode = useCallback((code: string) => {
    const clean = code ? code.trim() : '';
    setPromoCodeState(clean);
    try {
      if (clean) {
        sessionStorage.setItem('sav-promo-code', clean);
        localStorage.setItem('sav_user_promo', clean);
      }
    } catch {}
  }, []);

  const checkPromo = useCallback(async (code: string) => {
    if (!code || !code.trim()) {
      setPromoResult(null);
      return;
    }

    const cleanCode = code.trim();
    setIsChecking(true);
    try {
      // 1. Try backend promo check API first
      try {
        const resp = await fetch(`/api/v1/ai/promo/check?code=${encodeURIComponent(cleanCode)}`);
        if (resp.ok) {
          const resJson = await resp.json();
          if (resJson.success && resJson.isValid) {
            setPromoResult({
              isValid: true,
              partnerName: resJson.partnerName || 'Партнёр платформы',
              discountPercent: resJson.discountPercent || 5,
            });
            try {
              sessionStorage.setItem('sav-promo-code', cleanCode);
              localStorage.setItem('sav_user_promo', cleanCode);
            } catch {}
            setIsChecking(false);
            return;
          } else if (resJson.success && resJson.isValid === false) {
            setPromoResult({
              isValid: false,
              partnerName: null,
              discountPercent: 0,
            });
            setIsChecking(false);
            return;
          }
        }
      } catch (backendErr) {
        console.warn('[Promo Check] Backend check fallback to BD ProTalk client:', backendErr);
      }

      // 2. Query BD ProTalk via db client
      const { data, error } = await protalkDb
        .from('partners')
        .select('promo, partner_code, telegram_id, fio, pseudonym');

      if (error) throw error;

      const normalizedInput = cleanCode.toLowerCase();
      const match = data?.find(p => {
        const pPromo = p.promo ? String(p.promo).trim().toLowerCase() : '';
        const pCode = (p as any).partner_code ? String((p as any).partner_code).trim().toLowerCase() : '';
        const pTg = (p as any).telegram_id ? String((p as any).telegram_id).trim().toLowerCase() : '';
        return pPromo === normalizedInput || pCode === normalizedInput || pTg === normalizedInput;
      });

      if (match) {
        setPromoResult({
          isValid: true,
          partnerName: match.pseudonym || match.fio || 'Партнёр',
          discountPercent: 5,
        });
        try {
          sessionStorage.setItem('sav-promo-code', cleanCode);
          localStorage.setItem('sav_user_promo', cleanCode);
        } catch {}
      } else {
        setPromoResult({
          isValid: false,
          partnerName: null,
          discountPercent: 0,
        });
      }
    } catch (err) {
      console.error('Promo check error:', err);
      setPromoResult(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Auto-check initial promo on mount if present
  useEffect(() => {
    const initial = getInitialPromo();
    if (initial && !promoResult) {
      checkPromo(initial);
    }
  }, [checkPromo]);

  const applyDiscount = useCallback((price: number): number => {
    if (!promoResult?.isValid) return price;
    return Math.round(price * (1 - promoResult.discountPercent / 100));
  }, [promoResult]);

  return {
    promoCode,
    setPromoCode,
    isChecking,
    promoResult,
    checkPromo,
    applyDiscount,
  };
};

