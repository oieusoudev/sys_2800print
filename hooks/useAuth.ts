import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginRequest, RegisterRequest } from '@/types/api';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if user exists in localStorage first
        const storedUser = authService.getCurrentUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
          
          // Verify with backend
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Token expired or invalid
            await logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      toast.success('Login realizado com sucesso!');
      router.push('/dashboard');
      return response;
    } catch (error: any) {
      toast.error(error.message || 'Erro no login');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (userData: RegisterRequest) => {
    setIsLoading(true);
    try {
      const newUser = await authService.register(userData);
      toast.success('Conta criada com sucesso!');
      
      // Auto login after registration
      await login({ username: userData.username, password: userData.password });
      return newUser;
    } catch (error: any) {
      toast.error(error.message || 'Erro no registro');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      toast.success('Logout realizado com sucesso');
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
      setIsAuthenticated(false);
      router.push('/auth/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        return currentUser;
      } else {
        await logout();
        return null;
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      await logout();
      return null;
    }
  }, [logout]);

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser
  };
}