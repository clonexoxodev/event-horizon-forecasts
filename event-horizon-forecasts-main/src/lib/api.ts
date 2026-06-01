const LOCAL_API_URL = 'http://localhost:5004';
const API_URL_ENV_NAME = 'VITE_API_URL';

const normalizeApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (!configuredUrl) {
    if (import.meta.env.DEV) {
      return { baseUrl: LOCAL_API_URL };
    }

    return {
      baseUrl: '',
      error: `${API_URL_ENV_NAME} is required in production. Set it to your backend URL, for example https://flippe-backend4.vercel.app.`,
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    return {
      baseUrl: '',
      error: `${API_URL_ENV_NAME} must be a full http(s) URL. Received: ${configuredUrl}`,
    };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return {
      baseUrl: '',
      error: `${API_URL_ENV_NAME} must start with http:// or https://.`,
    };
  }

  const normalizedUrl = parsedUrl.origin + parsedUrl.pathname.replace(/\/$/, '');

  if (import.meta.env.PROD && typeof window !== 'undefined' && normalizedUrl === window.location.origin) {
    return {
      baseUrl: '',
      error: `${API_URL_ENV_NAME} points to the frontend domain (${window.location.origin}). Set it to the backend API domain instead.`,
    };
  }

  return { baseUrl: normalizedUrl };
};

const apiConfig = normalizeApiBaseUrl();

export type UserRole = 'user' | 'admin' | 'super_admin';

export type AuthUserResponse = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  balance?: number;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  profile_image_url?: string | null;
};

type AuthResponse = {
  user: AuthUserResponse;
  token?: string;
  message?: string;
};

export type ApiMarket = {
  id: string;
  question: string;
  category: string;
  yesPercent: number;
  pool: number;
  closesIn: string;
  description: string;
  source: string;
  icon: string;
  yesPool: number;
  noPool: number;
  totalPool: number;
  totalVolume?: number;
  seedLiquidityYes?: number;
  seedLiquidityNo?: number;
  participants: number;
  tradeCount?: number;
  yesPrice: number;
  noPrice: number;
  closeTime: string;
  status: 'draft' | 'active' | 'closed' | 'pending_resolution' | 'resolved' | 'cancelled' | 'archived';
  rules?: string;
  minAmount?: number;
  maxAmount?: number;
  winningOutcome?: 'YES' | 'NO' | null;
  resolvedAt?: string | null;
  confidence?: number;
  volatility?: number;
  liquidity?: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  isTrending?: boolean;
  is_trending?: boolean;
  priceHistory?: Array<{ timestamp: string; yesPrice: number; noPrice: number; yesPool?: number; noPool?: number; volume?: number; tradeCount?: number }>;
};

export type AdminMarket = {
  id: string;
  question: string;
  description?: string | null;
  category: string;
  status: 'draft' | 'active' | 'closed' | 'pending_resolution' | 'resolved' | 'cancelled' | 'archived';
  market_type?: string;
  yes_label?: string;
  no_label?: string;
  yes_price?: number;
  no_price?: number;
  close_date?: string;
  resolution_date?: string;
  resolution_source?: string | null;
  resolution_instructions?: string | null;
  outcome?: string | null;
  winning_outcome?: string | null;
  pool_amount_smallest_unit?: number;
  total_volume_smallest_unit?: number;
  seed_liquidity_yes_smallest_unit?: number;
  seed_liquidity_no_smallest_unit?: number;
  yes_pool_smallest_unit?: number;
  no_pool_smallest_unit?: number;
  participant_count?: number;
  trade_count?: number;
  rules?: string;
  currency?: 'NGN' | 'USD';
  image_url?: string | null;
  video_url?: string | null;
  is_trending?: boolean;
  min_position_smallest_unit?: number;
  max_position_smallest_unit?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminCreateMarketInput = {
  question: string;
  description: string;
  category: string;
  market_type: 'binary';
  yes_label: string;
  no_label: string;
  yes_price?: number;
  no_price?: number;
  seed_liquidity_yes_smallest_unit: number;
  seed_liquidity_no_smallest_unit: number;
  close_date: string;
  resolution_date: string;
  resolution_source?: string;
  resolution_instructions?: string;
  status: 'draft' | 'active';
  currency: 'NGN';
  image_url?: string;
  video_url?: string;
  is_trending?: boolean;
  min_position_smallest_unit?: number;
  max_position_smallest_unit?: number;
};

export type ApiPosition = {
  id: string;
  userId: string;
  marketId: string;
  side: 'YES' | 'NO';
  stake: number;
  entryPrice: number;
  currentPrice: number;
  sharesReceived?: number;
  currentValue: number;
  estimatedPayout?: number;
  estimatedProfit?: number;
  finalPayout?: number;
  status?: string;
  marketQuestion: string;
  marketIcon: string;
  category?: string;
  marketStatus: 'draft' | 'active' | 'closed' | 'pending_resolution' | 'resolved' | 'cancelled' | 'archived';
  isWinner?: boolean | null;
  payout?: number;
  resolvedAt?: string | null;
  createdAt: string;
  isListed: boolean;
  listingCode?: string;
  askingPrice?: number;
  listedAt?: string;
};

export type ApiWallet = {
  id?: string;
  userId?: string;
  balanceNgn?: number;
  balanceUsd?: number;
  availableNgn?: number;
  availableUsd?: number;
  balanceNgnKobo?: number;
  balanceUsdCents?: number;
  availableNgnKobo?: number;
  availableUsdCents?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiTransaction = {
  id: string;
  userId?: string;
  walletId?: string;
  type: 'deposit' | 'withdrawal' | 'position_entry' | 'position_payout' | 'refund';
  amount: number;
  amountSmallestUnit: number;
  currency: 'NGN' | 'USD';
  direction: 'IN' | 'OUT';
  referenceId?: string | null;
  referenceType?: string | null;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type ApiActivity = {
  id: string;
  type: string;
  label: string;
  amount: number;
  currency: 'NGN' | 'USD';
  direction: 'IN' | 'OUT';
  status: string;
  createdAt: string;
};

export type ApiNotification = {
  id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  is_read?: boolean;
  read?: boolean;
  reference_id?: string | null;
  reference_type?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  createdAt?: string;
};

export type ApiProfileStats = {
  totalPredictions: number;
  activePredictions: number;
  wonPredictions: number;
  winRate: number;
  totalStaked: number;
  totalEarnings: number;
};

export type ApiSearchUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type WalletResponse = {
  wallet: ApiWallet;
  display?: unknown;
};

const toSmallestUnit = (amount: number) => Math.round(Number(amount) * 100);

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

class ApiService {
  private baseURL: string;
  private configError?: string;
  private authTokenKey = 'flippe_auth_token';

  constructor() {
    this.baseURL = apiConfig.baseUrl;
    this.configError = apiConfig.error;
  }

  setAuthToken(token?: string | null) {
    if (typeof window === 'undefined') return;

    if (token) {
      window.localStorage.setItem(this.authTokenKey, token);
      return;
    }

    window.localStorage.removeItem(this.authTokenKey);
  }

  private getAuthToken() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(this.authTokenKey) || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.configError) {
      throw new Error(this.configError);
    }

    const url = `${this.baseURL}${endpoint}`;

    const isFormData = options.body instanceof FormData;
    const token = this.getAuthToken();
    const config: RequestInit = {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 409) {
          if (errorData.error?.code === 'EMAIL_EXISTS') {
            throw new ApiRequestError('An account with this email already exists. Please log in instead.', response.status, errorData.error?.code);
          }
          if (errorData.error?.code === 'USERNAME_EXISTS') {
            throw new ApiRequestError('This username is already taken. Please choose a different one.', response.status, errorData.error?.code);
          }
          if (errorData.error?.code === 'ALREADY_ADMIN') {
            throw new ApiRequestError(errorData.error?.message || 'User already has admin privileges.', response.status, errorData.error?.code);
          }
          throw new ApiRequestError(errorData.error?.message || 'This account already exists. Please log in instead.', response.status, errorData.error?.code);
        }

        if (response.status === 401) {
          if (errorData.error?.code === 'INVALID_CREDENTIALS') {
            throw new ApiRequestError('Invalid email or password. Please try again.', response.status, errorData.error?.code);
          }
          throw new ApiRequestError(errorData.error?.message || 'Authentication required. Please log in again.', response.status, errorData.error?.code);
        }

        if (response.status === 400) {
          throw new ApiRequestError(errorData.error?.message || 'Invalid input. Please check your information.', response.status, errorData.error?.code);
        }

        if (response.status === 403) {
          throw new ApiRequestError(errorData.error?.message || 'You do not have permission to perform this action.', response.status, errorData.error?.code);
        }

        if (response.status === 422) {
          if (errorData.error?.code === 'INSUFFICIENT_BALANCE') {
            throw new ApiRequestError(errorData.error?.message || 'Insufficient balance. Please add funds to your wallet.', response.status, errorData.error?.code);
          }
          if (errorData.error?.code === 'MARKET_NOT_ACTIVE') {
            throw new ApiRequestError(errorData.error?.message || 'This market is closed and no longer accepts predictions.', response.status, errorData.error?.code);
          }
          throw new ApiRequestError(errorData.error?.message || 'The request could not be completed.', response.status, errorData.error?.code);
        }

        throw new ApiRequestError(errorData.error?.message || errorData.message || `HTTP error! status: ${response.status}`, response.status, errorData.error?.code);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof TypeError) {
        throw new Error('Unable to reach the server. Please check your connection and try again.');
      }
      throw error;
    }
  }

  async signup(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/me');
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getMarkets(): Promise<{ markets: ApiMarket[]; count: number }> {
    return this.request('/api/markets');
  }

  async getMarket(marketId: string): Promise<{ market: ApiMarket }> {
    return this.request(`/api/markets/${encodeURIComponent(marketId)}`);
  }

  async placePrediction(
    marketId: string,
    prediction: { side: 'YES' | 'NO' | 'UP' | 'DOWN'; amount: number; currency?: 'NGN' | 'USD' }
  ): Promise<{ position: ApiPosition; market: ApiMarket; wallet: ApiWallet; transaction: ApiTransaction; activity: ApiActivity[] }> {
    const currency = prediction.currency || 'NGN';
    return this.request(`/api/markets/${encodeURIComponent(marketId)}/predictions`, {
      method: 'POST',
      body: JSON.stringify({
        side: prediction.side,
        amount: prediction.amount,
        amountSmallestUnit: toSmallestUnit(prediction.amount),
        currency,
      }),
    });
  }

  async getPositions(): Promise<{ positions: ApiPosition[]; count: number }> {
    return this.request('/api/positions');
  }

  async getWallet(): Promise<WalletResponse> {
    return this.request<WalletResponse>('/api/wallet');
  }

  async deposit(amount: number, currency: 'NGN' | 'USD' = 'NGN', method: string = 'bank_transfer') {
    return this.request('/api/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        amountSmallestUnit: toSmallestUnit(amount),
        amount_smallest_unit: toSmallestUnit(amount),
        currency,
        method,
      }),
    });
  }

  async withdraw(amount: number, currency: 'NGN' | 'USD' = 'NGN', destination: string = 'bank_account') {
    return this.request('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        amountSmallestUnit: toSmallestUnit(amount),
        amount_smallest_unit: toSmallestUnit(amount),
        currency,
        destination,
      }),
    });
  }

  async getTransactions(): Promise<{ transactions: ApiTransaction[] }> {
    return this.request('/api/wallet/transactions');
  }

  async getActivity(): Promise<{ activity: ApiActivity[] }> {
    return this.request('/api/activity');
  }

  async getNotifications(): Promise<{ success?: boolean; notifications: ApiNotification[] }> {
    return this.request('/api/notifications');
  }

  async markAllNotificationsRead(): Promise<{ success?: boolean; updated_count?: number }> {
    return this.request('/api/notifications/mark-all-read', {
      method: 'PATCH',
    });
  }

  async getProfileStats(): Promise<{ stats: ApiProfileStats }> {
    return this.request('/api/profile/stats');
  }

  async searchUsers(query: string): Promise<{ users: ApiSearchUser[] }> {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    return this.request(`/api/wallet/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
  }

  async addAdmin(email: string) {
    return this.request('/api/admin/add-admin', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async removeAdmin(userId: string) {
    return this.request('/api/admin/remove-admin', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async listAdmins() {
    return this.request<any>('/api/admin/list-admins');
  }

  async getAnalytics() {
    return this.request<any>('/api/admin/analytics');
  }

  async listAdminMarkets(params: { status?: string; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ success: boolean; markets: AdminMarket[]; pagination?: any }>(`/api/admin/markets${suffix}`);
  }

  async createAdminMarket(data: AdminCreateMarketInput) {
    return this.request<{ success: boolean; market: AdminMarket }>('/api/admin/markets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminMarket(marketId: string, data: Partial<AdminCreateMarketInput>) {
    return this.request<{ success: boolean; market: AdminMarket }>(`/api/admin/markets/${encodeURIComponent(marketId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateAdminMarketStatus(marketId: string, data: { status: string; outcome?: 'YES' | 'NO' | 'INVALID'; resolution_source?: string }) {
    return this.request<{ success: boolean; market: AdminMarket }>(`/api/admin/markets/${encodeURIComponent(marketId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadAdminMarketMedia(file: File, mediaType: 'image' | 'video') {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('mediaType', mediaType);
    return this.request<{ success: boolean; url: string; media_type: 'image' | 'video' }>('/api/admin/markets/upload-media', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadProfilePicture(file: File) {
    const formData = new FormData();
    formData.append('media', file);
    return this.request<{ success: boolean; avatarUrl: string; user: AuthUserResponse }>('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  async listAdminUsers() {
    return this.request<{ users: Array<{ id: string; email: string; username: string; role: UserRole; created_at?: string }> }>('/api/admin/users');
  }

  async listAdminTransactions() {
    return this.request<{ transactions: ApiTransaction[] }>('/api/admin/transactions');
  }

  async healthCheck() {
    return this.request('/api/health');
  }
}

export const apiService = new ApiService();
export default apiService;
