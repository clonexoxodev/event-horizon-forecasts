export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout';
  amount_smallest_unit: number;
  currency: 'NGN' | 'USD';
  direction: 'IN' | 'OUT';
  reference_id?: string;
  reference_type?: 'position' | 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface CreateTransactionRequest {
  user_id: string;
  wallet_id: string;
  type: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout';
  amount_smallest_unit: number;
  currency: 'NGN' | 'USD';
  direction: 'IN' | 'OUT';
  reference_id?: string;
  reference_type?: 'position' | 'deposit' | 'withdrawal';
  status?: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

export interface DepositRequest {
  amount_smallest_unit: number;
  currency: 'NGN' | 'USD';
  method: 'bank_transfer' | 'card' | 'crypto';
  metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
  amount_smallest_unit: number;
  currency: 'NGN' | 'USD';
  destination: string;
  metadata?: Record<string, any>;
}