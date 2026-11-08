export interface UserProfile {
  id: string;
  telegram_id?: number | string | null;
  email?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  photo_url?: string | null;
  profile_link?: string | null;
  bio?: string | null;
  is_premium?: number | boolean;
  language_code?: string | null;
  phone?: string | null;
  allows_write_to_pm?: number | boolean;
  latitude?: number | null;
  longitude?: number | null;
  role?: string;
  balance?: number;
  referral_reward_balance?: number;
  referral_code?: string | null;
  referred_by?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  status?: string;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReferralStats {
  referralLink: string;
  miniAppLink: string;
  rewardBalance: number;
  totalInvited: number;
  invitedUsers: UserProfile[];
  referrerInfo?: {
    telegram_id?: string;
    username?: string;
    full_name?: string;
    photo_url?: string;
  } | null;
}
