'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, User, Lock, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { 
  isWebAuthnSupported, 
  isBiometricAvailable, 
  authenticateWithBiometric,
  hasRegisteredCredentials 
} from '@/utils/webauthn';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    biometricAuth: false
  });
  const { login, isLoading: authLoading } = useAuth();
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [hasUserCredentials, setHasUserCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar suporte biométrico ao carregar
  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (isWebAuthnSupported()) {
        const available = await isBiometricAvailable();
        setIsBiometricSupported(available);
        
        if (available && formData.username) {
          console.log('✅ Biometria disponível neste dispositivo');
          
          try {
            const hasAnyCredentials = await hasRegisteredCredentials();
            setHasUserCredentials(hasAnyCredentials);
          } catch (error) {
            console.log('WebAuthn desabilitado ou nenhuma credencial encontrada');
            setHasUserCredentials(false);
          }
        } else {
          console.log('❌ Biometria não disponível neste dispositivo ou usuário não logado');
        }
      }
    };
    checkBiometricSupport();
  }, [formData.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Set local loading state
    try {
      await login({ username: formData.username, password: formData.password });
      // Redirection is handled by useAuth hook on successful login
    } catch (error) {
      // Error toast is handled by useAuth hook
    } finally {
      setIsLoading(false); // Reset local loading state
    }
  };

  const handleBiometricAuth = async () => {
    if (!isBiometricSupported) {
      toast.error('Biometria não suportada neste dispositivo');
      return;
    }

    setIsBiometricLoading(true);
    
    try {
      // Tentar autenticar
      const result = await authenticateWithBiometric(formData.username || undefined);
      
      if (result.success && result.user && result.token) {
        // The useAuth hook's login method would typically handle setting the user and token.
        // For direct biometric auth, we might need to manually set the user in localStorage
        // if useAuth's internal state isn't updated by this external call.
        // For simplicity, let's assume the biometric auth directly sets the token and user in apiClient/localStorage.
        const userData = {
          id: result.user.id,
          username: result.user.username,
          fullName: result.user.full_name,
          isAdmin: result.user.is_admin
        };
        toast.success(`✅ Login biométrico realizado com sucesso! Bem-vindo, ${result.user.full_name || result.user.username}`);
        router.push('/dashboard');
      } else {
        toast.error('Falha na autenticação biométrica');
      }
    } catch (error: any) {
      console.error('Erro na autenticação biométrica:', error);
      toast.error(error.message || 'Erro na autenticação biométrica');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 mx-2 sm:mx-0">
        <CardHeader className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-slate-900" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-yellow-500">Folha de Ponto</CardTitle>
          <CardDescription className="text-slate-400 text-sm sm:text-base">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300 text-sm sm:text-base">Usuário</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu usuário"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-sm sm:text-base">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-3 sm:p-4 border border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                  <span className="text-yellow-500 font-medium text-sm sm:text-base">Autenticação Biométrica</span>
                </div>
                <Switch
                  checked={formData.biometricAuth}
                  onCheckedChange={(checked) => setFormData({...formData, biometricAuth: checked})}
                  disabled={!isBiometricSupported}
                />
              </div>
              {isBiometricSupported ? (
                <p className="text-xs sm:text-sm text-slate-400">
                  Ative para usar Face ID ou impressão digital no próximo login
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-red-400">
                  Biometria não disponível neste dispositivo/navegador
                </p>
              )}
            </div>

            <div className="bg-slate-700 rounded-lg p-3 sm:p-4 border border-slate-600">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded flex items-center justify-center">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">⚙️</span>
                </div>
                <span className="text-yellow-500 font-medium text-sm sm:text-base">Usuário de Teste</span>
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="text-slate-300">
                  <span className="font-medium">Usuário:</span> admin
                </p>
                <p className="text-slate-300">
                  <span className="font-medium">Senha:</span> admin123
                </p>
                <p className="text-slate-300 mt-2">
                  <span className="font-medium">Ou use:</span> funcionario / funcionario123
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-medium text-sm sm:text-base"
              disabled={isLoading || authLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {isBiometricSupported && hasUserCredentials && (
            <Button
              onClick={handleBiometricAuth}
              variant="outline"
              className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-slate-900 text-sm sm:text-base"
              disabled={isBiometricLoading}
            >
              {isBiometricLoading ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Fingerprint className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Entrar com Face ID
                </>
              )}
            </Button>
          )}

          {isBiometricSupported && !hasUserCredentials && (
            <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3 text-center">
              <p className="text-xs sm:text-sm text-blue-300">
                💡 Para usar Face ID, faça login normal primeiro e ative a biometria nas configurações
              </p>
            </div>
          )}

          <div className="text-center">
            <span className="text-slate-400 text-sm sm:text-base">Não tem conta? </span>
            <Button
              variant="link"
              className="text-yellow-500 hover:text-yellow-400 p-0 text-sm sm:text-base"
              onClick={() => router.push('/auth/register')}
            >
              Cadastre-se
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}