/**
 * Helper to reliably resolve and convert /file/16/logo.png to Base64 Data URI
 * for html2canvas rendering without any CORS or network timing issues in PDFs.
 */

let cachedLogoDataUrl: string | null = null;

export const OFFICIAL_LOGO_URL = '/file/16/logo.png';
export const FALLBACK_REMOTE_LOGO_URL = '/file/16/logo.png';

export async function getSavAiLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  const candidateUrls = [
    OFFICIAL_LOGO_URL,
    '/files/16/logo.png',
    FALLBACK_REMOTE_LOGO_URL
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (base64 && base64.startsWith('data:image')) {
          cachedLogoDataUrl = base64;
          return base64;
        }
      }
    } catch (e) {
      // Try next candidate URL
    }
  }

  // If fetch failed, return official local proxy route
  return OFFICIAL_LOGO_URL;
}
