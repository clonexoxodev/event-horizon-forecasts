const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://flippe-backend4-git-main-clonexoxodevs-projects.vercel.app';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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
          throw new Error(errorData.error?.message || 'This account already exists. Please log in instead.');
        }
        
        if (response.status === 401) {
          throw new Error('Invalid email or password. Please try again.');
        }
        
        if (response.status === 400) {
          throw new Error(errorData.error?.message || 'Invalid input. Please check your information.');
        }
        
        throw new Error(errorData.error?.message || errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async signup(userData: {
    username: string;
    email: string;
    password: string;
  }) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  // Wallet
  async getWallet() {
    return this.request('/api/wallet');
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

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

export const apiService = new ApiService();
export default apiService;