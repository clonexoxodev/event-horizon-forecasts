export type DepositProviderRequest = {
  userId: string;
  amountSmallestUnit: number;
  currency: 'NGN';
  reference: string;
};

export type WithdrawalProviderRequest = {
  userId: string;
  amountSmallestUnit: number;
  currency: 'NGN';
  reference: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export interface PaymentProvider {
  name: string;
  createDeposit(request: DepositProviderRequest): Promise<{ reference: string; provider: string; paymentInstruction: string }>;
  verifyDeposit(reference: string): Promise<{ verified: boolean; reference: string }>;
  initiateWithdrawal(request: WithdrawalProviderRequest): Promise<{ reference: string; provider: string; status: 'pending' }>;
  verifyWithdrawal(reference: string): Promise<{ verified: boolean; reference: string }>;
}

export const manualPaymentProvider: PaymentProvider = {
  name: 'manual',
  async createDeposit(request) {
    return {
      reference: request.reference,
      provider: 'manual',
      paymentInstruction: `Transfer exactly ₦${(request.amountSmallestUnit / 100).toLocaleString()} and use ${request.reference} as your payment reference.`,
    };
  },
  async verifyDeposit(reference) {
    return { verified: false, reference };
  },
  async initiateWithdrawal(request) {
    return { reference: request.reference, provider: 'manual', status: 'pending' };
  },
  async verifyWithdrawal(reference) {
    return { verified: false, reference };
  },
};

export const paymentProvider = manualPaymentProvider;
