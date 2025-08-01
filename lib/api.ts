// API Configuration and Base Client - REFATORADO PARA USAR APENAS ROTAS NEXT.JS
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    // Garantir HTTPS para WebAuthn em produção
    this.baseURL = this.ensureHttps(baseURL);
    this.loadToken();
  }

  private ensureHttps(url: string): string {
    // Em produção, sempre usar HTTPS
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return url.replace(/^http:/, 'https:');
    }
    
    // Em desenvolvimento local, permitir HTTP apenas para localhost
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url;
    }
    
    // Para todos os outros casos, forçar HTTPS
    return url.replace(/^http:/, 'https:');
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      console.log(`🌐 Making API request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 API response status: ${response.status}`);

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ API error response:`, {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      console.log(`✅ API request successful`);
      return data;
    } catch (error) {
      console.error('❌ API request failed:', {
        url,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);