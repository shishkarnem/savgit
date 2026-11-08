import { useState, useEffect } from 'react';
import { protalkDb } from '@/integrations/protalk/client';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';

export type CRMAccessLevel = 'viewer' | 'editor' | 'admin' | null;

interface CRMAccessState {
  isLoading: boolean;
  hasAccess: boolean;
  accessLevel: CRMAccessLevel;
  isDevMode: boolean;
}

const isLovablePreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const getDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('sav-dev-mode');
  if (stored !== null) return stored === 'true';
  return isLovablePreview;
};

export function useCRMAccess(): CRMAccessState {
  const { profile, isLoading: authLoading } = useTelegramAuth();
  
  // Fully open administrative access for all sections on /system-admin and /admin/*
  return {
    isLoading: false,
    hasAccess: true,
    accessLevel: 'admin',
    isDevMode: true,
  };
}
