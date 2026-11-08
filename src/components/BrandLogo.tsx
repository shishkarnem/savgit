import React from 'react';
import { useLocation } from 'react-router-dom';

export const OFFICIAL_LOGO_URL = '/file/16/logo.png';
export const PROTALK_LOGO_URL = '/file/16/logo.png';
export const PARTNER_LOGO_URL = '/file/36/gerb.png';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  title?: string;
  textClassName?: string;
  subtext?: string;
  logoSrc?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imageClassName = '',
  size = 'md',
  showText = false,
  title,
  textClassName = '',
  subtext,
  logoSrc,
  onClick
}) => {
  let isPartnerRoute = false;
  try {
    const loc = useLocation();
    isPartnerRoute = loc.pathname.startsWith('/partner') || loc.pathname.startsWith('/greenland');
  } catch {
    if (typeof window !== 'undefined') {
      isPartnerRoute = window.location.pathname.startsWith('/partner') || window.location.pathname.startsWith('/greenland');
    }
  }

  const effectiveLogoSrc = logoSrc || (isPartnerRoute ? PARTNER_LOGO_URL : OFFICIAL_LOGO_URL);
  const effectiveTitle = title || (isPartnerRoute ? 'ИИ-Гренландия' : 'SAV AI');
  const effectiveSubtext = subtext !== undefined ? subtext : (isPartnerRoute ? 'Цифровое государство партнёров' : undefined);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12 md:w-14 md:h-14',
    lg: 'w-16 h-16 md:w-20 md:h-20',
    xl: 'w-24 h-24 md:w-28 md:h-28'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  const isPartner = isPartnerRoute || (effectiveLogoSrc && effectiveLogoSrc.includes('gerb'));

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="relative group flex items-center justify-center">
        {/* Clean large logo with no container box/border and our golden glow color filter */}
        <div className={`${currentSizeClass} relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}>
          <img
            src={effectiveLogoSrc}
            alt={effectiveTitle}
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (isPartner) {
                if (!target.src.includes('/file/31/gerb.png')) {
                  target.src = '/file/31/gerb.png';
                }
              } else {
                target.src = OFFICIAL_LOGO_URL;
              }
            }}
            className={`w-full h-full object-contain ${isPartner ? 'partner-logo-filter' : 'filter drop-shadow-[0_0_12px_rgba(251,191,36,0.7)] brightness-110 contrast-105 saturate-125'} transition-all ${imageClassName}`}
          />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent leading-none ${textClassName}`}>
            {effectiveTitle}
          </span>
          {effectiveSubtext && (
            <span className="text-amber-100/85 text-sm sm:text-base font-medium mt-1">
              {effectiveSubtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
