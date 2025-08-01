import { apiClient } from '@/lib/api';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '@/types/api';

export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
      this.setCurrentUser(response.data.user);
    }
    
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', userData);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.clearToken();
      this.clearCurrentUser();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      if (response.success && response.data) {
        this.setCurrentUser(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await apiClient.post<{ token: string }>('/auth/refresh');
      if (response.success && response.data) {
        apiClient.setToken(response.data.token);
        return response.data.token;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    return null;
  }

  // Local storage helpers
  private setCurrentUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(user));
    }
  }

  private clearCurrentUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_user');
    }
  }

  getCurrentUserFromStorage(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('current_user');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }
}

export const authService = new AuthService();