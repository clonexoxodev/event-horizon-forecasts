const LOCAL_API_URL = 'http://localhost:5000';
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
};

type AuthResponse = {
  user: AuthUserResponse;
  message?: string;
};

type WalletResponse = {
  wallet: {
    balanceNgn?: number;
    balanceUsd?: number;
    availableNgn?: number;
    availableUsd?: number;
    balanceNgnKobo?: number;
    balanceUsdCents?: number;
    availableNgnKobo?: number;
    availableUsdCents?: number;
  };
};

class ApiService {
  private baseURL: string;
  private configError?: string;

  constructor() {
    this.baseURL = apiConfig.baseUrl;
    this.configError = apiConfig.error;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.configError) {
      throw new Error(this.configError);
    }

    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error codes with user-friendly messages
        if (response.status === 409) {
          if (errorData.error?.code === 'EMAIL_EXISTS') {
            throw new Error('An account with this email already exists. Please log in instead.');
          }
          if (errorData.error?.code === 'USERNAME_EXISTS') {
            throw new Error('This username is already taken. Please choose a different one.');
          }
          if (errorData.error?.code === 'ALREADY_ADMIN') {
            throw new Error(errorData.error?.message || 'User already has admin privileges.');
          }
          throw new Error(errorData.error?.message || 'This account already exists. Please log in instead.');
        }
        
        if (response.status === 401) {
          // Check if this is an auth endpoint error or a generic auth error
          if (errorData.error?.code === 'INVALID_CREDENTIALS') {
            throw new Error('Invalid email or password. Please try again.');
          }
          // For other 401 errors, use the actual error message
          throw new Error(errorData.error?.message || 'Authentication required. Please log in again.');
        }
        
        if (response.status === 400) {
          throw new Error(errorData.error?.message || 'Invalid input. Please check your information.');
        }
        
        if (response.status === 403) {
          throw new Error(errorData.error?.message || 'You do not have permission to perform this action.');
        }
        
        throw new Error(errorData.error?.message || errorData.message || `HTTP error! status: ${response.status}`);
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

  // Authentication
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

  // Wallet
  async getWallet(): Promise<WalletResponse> {
    return this.request<WalletResponse>('/api/wallet');
  }

  async deposit(amount: number, currency: string = 'NGN') {
    return this.request('/api/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    });
  }

  async withdraw(amount: number, currency: string = 'NGN') {
    return this.request('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    });
  }

  async getTransactions() {
    return this.request('/api/wallet/transactions');
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    return this.request(`/api/wallet/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
  }

  // Admin Management (Super Admin only)
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
    return this.request('/api/admin/list-admins');
  }

  async getAnalytics() {
    return this.request('/api/admin/analytics');
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

export const apiService = new ApiService();
export default apiService;
