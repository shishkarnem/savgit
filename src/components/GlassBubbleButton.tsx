import React from 'react';

interface GlassBubbleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'secondary' | 'outline' | 'dark';
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const GlassBubbleButton: React.FC<GlassBubbleButtonProps> = ({
  variant = 'gold',
  children,
  icon,
  iconRight,
  className = '',
  size = 'md',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'py-2.5 px-4 text-sm min-h-[40px]',
    md: 'py-3.5 px-6 text-sm sm:text-base min-h-[46px]',
    lg: 'py-4 px-8 text-base md:text-lg min-h-[54px]',
  }[size];

  let variantClasses = '';
  if (variant === 'gold') {
    variantClasses = 'liquid-bubble-gold text-black font-bold shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_28px_rgba(251,191,36,0.5)]';
  } else if (variant === 'secondary') {
    variantClasses = 'liquid-bubble-secondary text-amber-100 hover:text-white font-bold shadow-[0_4px_20px_rgba(0,0,0,0.5)]';
  } else if (variant === 'dark') {
    variantClasses = 'bg-black/80 border border-amber-400/40 hover:border-amber-300/80 hover:bg-black/95 text-amber-200 hover:text-white font-semibold backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.7)]';
  } else {
    variantClasses = 'bg-black/60 border border-white/20 hover:border-amber-300/60 text-white font-medium backdrop-blur-2xl';
  }

  return (
    <button
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2.5 rounded-2xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      <span className="liquid-bubble-glare" />
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      <span className="relative z-10 font-bold whitespace-nowrap">{children}</span>
      {iconRight && <span className="relative z-10 shrink-0">{iconRight}</span>}
    </button>
  );
};

export default GlassBubbleButton;
