export interface Wallet {
  id: string;
  user_id: string;
  balance_ngn_kobo: number;
  balance_usd_cents: number;
  available_ngn_kobo: number;
  available_usd_cents: number;
  locked_ngn_kobo: number;
  locked_usd_cents: number;
  total_deposited_ngn_kobo: number;
  total_withdrawn_ngn_kobo: number;
  total_winnings_ngn_kobo: number;
  total_staked_ngn_kobo: number;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface WalletDisplay {
  totalBalance: string;
  availableBalance: string;
  currency: 'NGN' | 'USD';
}

export interface CreateWalletRequest {
  user_id: string;
}