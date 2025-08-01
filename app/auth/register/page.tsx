'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, User, Lock, Shield, Mail, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { 
  isWebAuthnSupported, 
  isBiometricAvailable, 
  registerBiometric 
} from '@/utils/webauthn'; // Added Fingerprint
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isAdmin: false,
    biometricAuth: false
  });
  const [isLoading, setIsLoading] = useState(false); // Local loading state
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  // Verificar suporte biométrico ao carregar
  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (isWebAuthnSupported()) {
        const available = await isBiometricAvailable();
        setIsBiometricSupported(available);
      }
    };
    
    checkBiometricSupport();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Set local loading state

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (formData.isAdmin) {
      if (!showAdminCode) {
        // Simular envio de código por email
        const code = Math.random().toString().slice(2, 8);
        console.log('Código do administrador:', code);
        localStorage.setItem('adminCode', code);
        setShowAdminCode(true);
        setIsLoading(false);
        toast.success(`Código enviado para ${formData.email}: ${code}`);
        return;
      }

      const storedCode = localStorage.getItem('adminCode');
      if (adminCode !== storedCode) {
        toast.error('Código incorreto');
        setIsLoading(false);
        return;
      }
    }

    try {
      const newUser = await register({
        username: formData.username,
        email: formData.email,
        full_name: formData.fullName,
        password: formData.password,
        is_admin: formData.isAdmin
      });
      
      // Se biometria está ativada e suportada, registrar credencial
      if (formData.biometricAuth && isBiometricSupported && newUser) {
        await registerBiometricCredential(newUser.username, newUser.full_name || newUser.username);
      }
      
      toast.success('Conta criada com sucesso!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error('Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const registerBiometricCredential = async (username: string, fullName: string) => {
    try {
      const result = await registerBiometric(username, fullName);
      if (!result.success) {
        throw new Error('Falha no registro da credencial');
      }
      toast.success('🔐 Credencial biométrica registrada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao registrar biometria:', error);
      toast.warning(`Conta criada, mas falha na biometria: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 mx-2 sm:mx-0">
        <CardHeader className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-slate-900" />
          </div>
          <CardTitle className="text-xl sm:text-2xl text-yellow-500">Criar Conta</CardTitle>
          <CardDescription className="text-slate-400 text-sm sm:text-base">
            Registe-se para aceder à folha de ponto
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300 text-sm sm:text-base">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Digite o seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300 text-sm sm:text-base">Utilizador</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Escolha um nome de utilizador"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm sm:text-base">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Digite seu email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-3 sm:p-4 border border-yellow-500">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => setFormData({...formData, isAdmin: checked as boolean})}
                />
                <Label htmlFor="isAdmin" className="text-yellow-500 font-medium cursor-pointer text-sm sm:text-base">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Criar conta de administrador
                </Label>
              </div>
            </div>

            {isBiometricSupported && (
              <div className="bg-slate-700 rounded-lg p-3 sm:p-4 border border-blue-500">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="biometricAuth"
                    checked={formData.biometricAuth}
                    onCheckedChange={(checked) => setFormData({...formData, biometricAuth: checked as boolean})}
                  />
                  <Label htmlFor="biometricAuth" className="text-blue-400 font-medium cursor-pointer text-sm sm:text-base">
                    <Fingerprint className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Registrar Face ID/Touch ID
                  </Label>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 ml-6">
                  Permitir login com biometria após criar a conta
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-sm sm:text-base">Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Crie uma palavra-passe"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300 text-sm sm:text-base">Confirmar Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme a sua palavra-passe"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            {showAdminCode && (
              <div className="space-y-2">
                <Label htmlFor="adminCode" className="text-slate-300 text-sm sm:text-base">Código de Administrador</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="adminCode"
                    type="text"
                    placeholder="Digite o código recebido por email"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 text-sm sm:text-base"
                    required
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-medium text-sm sm:text-base"
              disabled={isLoading || authLoading}
            >
              {isLoading ? 'Criando...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="text-center">
            <span className="text-slate-400 text-sm sm:text-base">Já tem conta? </span>
            <Button
              variant="link"
              className="text-yellow-500 hover:text-yellow-400 p-0 text-sm sm:text-base"
              onClick={() => router.push('/auth/login')}
            >
              Faça login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}