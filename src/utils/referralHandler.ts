/**
 * Referral link extraction, resolution, and auto-filling utility
 * Supports URL formats:
 * - domain/?ref169262990
 * - domain/?ref=169262990
 * - domain/?ref_169262990
 * - domain/calculator?ref169262990
 * - Telegram WebApp start_param & startapp
 */

export function extractReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const search = window.location.search || '';
    const hash = window.location.hash || '';
    const fullQuery = search + (hash.includes('?') ? hash.slice(hash.indexOf('?')) : '');

    // 1. Direct Regex for ?ref169262990 or &ref169262990 or ?ref=169262990 or ?ref_169262990
    const match = fullQuery.match(/[?&]ref[=_]?([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }

    // 2. Parse URLSearchParams
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    for (const [key, val] of params.entries()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.startsWith('ref') && lowerKey.length > 3) {
        // Param key itself is e.g. "ref169262990" (because no '=' was provided)
        return key.slice(3).replace(/^[=_]/, '').trim();
      }
      if (lowerKey === 'ref' && val) {
        return val.trim();
      }
    }

    // 3. Fallback for Telegram MiniApp params
    const tgParam = params.get('startapp') || params.get('start_param') || params.get('promo');
    if (tgParam) {
      return tgParam.replace(/^ref_?/, '').trim();
    }
  } catch (e) {
    console.warn('[ReferralHandler] URL extraction error:', e);
  }

  return null;
}

export function getStoredReferralId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sav_referrer_id') || sessionStorage.getItem('sav_referrer_id') || null;
}

export function getStoredReferralPromo(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('sav_referral_promo') ||
    sessionStorage.getItem('sav_referral_promo') ||
    localStorage.getItem('sav-promo-code') ||
    sessionStorage.getItem('sav-promo-code') ||
    null
  );
}

export async function resolveAndStoreReferral(rawRef: string): Promise<string> {
  if (!rawRef || !rawRef.trim()) return '';
  const cleanRef = rawRef.trim();

  try {
    localStorage.setItem('sav_referrer_id', cleanRef);
    sessionStorage.setItem('sav_referrer_id', cleanRef);

    const resp = await fetch(`/api/v1/partners/resolve-ref?ref=${encodeURIComponent(cleanRef)}`);
    if (resp.ok) {
      const json = await resp.json();
      const promoToSet = json.promoCode || cleanRef;

      localStorage.setItem('sav_referral_promo', promoToSet);
      sessionStorage.setItem('sav_referral_promo', promoToSet);
      localStorage.setItem('sav-promo-code', promoToSet);
      sessionStorage.setItem('sav-promo-code', promoToSet);

      window.dispatchEvent(new CustomEvent('referral-promo-updated', { detail: promoToSet }));
      return promoToSet;
    }
  } catch (err) {
    console.warn('[ReferralHandler] Error resolving referral code:', err);
  }

  localStorage.setItem('sav_referral_promo', cleanRef);
  sessionStorage.setItem('sav_referral_promo', cleanRef);
  window.dispatchEvent(new CustomEvent('referral-promo-updated', { detail: cleanRef }));
  return cleanRef;
}

/**
 * Initializes referral extraction on page entry
 */
export async function initReferralTracking(): Promise<string | null> {
  const urlRef = extractReferralFromUrl();
  if (urlRef) {
    return await resolveAndStoreReferral(urlRef);
  }
  return getStoredReferralPromo();
}

/**
 * Generates an 11-digit numeric ID for email-registered partners
 */
export function generate11DigitPartnerId(): string {
  return String(Math.floor(10000000000 + Math.random() * 90000000000));
}

/**
 * Builds the canonical website referral link according to user requirement:
 * домен/?ref169262990
 */
export function buildSiteReferralLink(partnerId: string | number): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanId = String(partnerId).trim();
  return `${origin}/?ref${cleanId}`;
}
