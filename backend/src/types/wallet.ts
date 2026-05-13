export interface Wallet {
  id: string;
  user_id: string;
  balance_ngn_kobo: number;
  balance_usd_cents: number;
  available_ngn_kobo: number;
  available_usd_cents: number;
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