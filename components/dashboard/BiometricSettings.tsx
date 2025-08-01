'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Fingerprint, Shield, Trash2, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  isWebAuthnSupported, 
  isBiometricAvailable, 
  registerBiometric,
  hasRegisteredCredentials,
  removeUserCredentials,
  getUserCredentials,
  authenticateWithBiometric
} from '@/utils/webauthn';

export function BiometricSettings() {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [userCredentials, setUserCredentials] = useState<any[]>([]);

  // Obter dados do usuário atual
  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  };

  // Verificar suporte e credenciais
  useEffect(() => {
    const checkBiometricStatus = async () => {
      const user = getCurrentUser();
      if (!user) return;

      if (isWebAuthnSupported()) {
        const available = await isBiometricAvailable();
        setIsBiometricSupported(available);
        
        if (available && user.username) {
          const hasUserCredentials = await hasRegisteredCredentials();
          setHasCredentials(hasUserCredentials);
          
          if (hasUserCredentials) {
            const credentials = await getUserCredentials(user.username);
            setUserCredentials(credentials);
          }
        }
      }
    };
    
    checkBiometricStatus();
  }, []);

  const handleRegisterBiometric = async () => {
    const user = getCurrentUser();
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }

    setIsRegistering(true);
    
    try {
      const result = await registerBiometric(user.username, user.fullName || user.username);
      
      if (result.success) {
        setHasCredentials(true);
        // Note: In production, credentials are stored server-side
        // We'll just show that registration was successful
        setUserCredentials([{
          id: result.credentialId,
          createdAt: Date.now()
        }]);
      }
      
      toast.success('🔐 Face ID/Touch ID registrado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao registrar biometria:', error);
      toast.error(error.message || 'Erro ao registrar biometria');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRemoveBiometric = async () => {
    const user = getCurrentUser();
    if (!user) return;

    try {
      // In production, this would call an Edge Function to remove credentials
      // For now, we'll just clear the local state
      setHasCredentials(false);
      setUserCredentials([]);
      toast.warning('🗑️ Para remover credenciais em produção, contate o administrador');
    } catch (error: any) {
      toast.error('Erro ao remover credenciais');
    }
  };

  const handleTestBiometric = async () => {
    const user = getCurrentUser();
    if (!user) return;

    setIsTesting(true);
    
    try {
      const result = await authenticateWithBiometric(user.username);
      
      if (result.success && result.user) {
        toast.success('✅ Teste de biometria realizado com sucesso!');
      } else {
        toast.error('❌ Falha no teste de biometria');
      }
    } catch (error: any) {
      console.error('Erro no teste biométrico:', error);
      toast.error(error.message || 'Erro no teste biométrico');
    } finally {
      setIsTesting(false);
    }
  };

  if (!isBiometricSupported) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-white flex items-center">
            <Fingerprint className="mr-2 h-5 w-5 text-slate-400" />
            Autenticação Biométrica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 text-center">
            <Shield className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 font-medium">Não Suportado</p>
            <p className="text-red-400 text-sm mt-1">
              Este dispositivo/navegador não suporta autenticação biométrica
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-white flex items-center">
          <Fingerprint className="mr-2 h-5 w-5" />
          Autenticação Biométrica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-slate-300">Face ID / Touch ID</Label>
            <div className="flex items-center space-x-2">
              {hasCredentials ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-500 rounded-full" />
              )}
              <span className={`text-sm ${hasCredentials ? 'text-green-400' : 'text-slate-400'}`}>
                {hasCredentials ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          
          <p className="text-xs text-slate-400">
            {hasCredentials 
              ? 'Você pode fazer login usando Face ID ou Touch ID'
              : 'Configure a biometria para login mais rápido e seguro'
            }
          </p>
        </div>

        {/* Credenciais registradas */}
        {userCredentials.length > 0 && (
          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">
              Credenciais Registradas
            </h4>
            {userCredentials.map((cred, index) => (
              <div key={cred.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-slate-200">
                    Credencial {index + 1}
                  </p>
                  <p className="text-xs text-slate-400">
                    Criada em: {new Date(cred.createdAt).toLocaleDateString('pt-PT')}
                  </p>
                </div>
                <Fingerprint className="h-4 w-4 text-blue-400" />
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2">
          {!hasCredentials ? (
            <Button
              onClick={handleRegisterBiometric}
              disabled={isRegistering}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isRegistering ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Face ID / Touch ID
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleTestBiometric}
                disabled={isTesting}
                variant="outline"
                className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
              >
                {isTesting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Testar Biometria
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleRemoveBiometric}
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Credenciais
              </Button>
            </div>
          )}
        </div>

        {/* Informações de segurança */}
        <div className="bg-blue-900/50 border border-blue-600 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300 font-medium text-sm">Segurança</span>
          </div>
          <ul className="text-xs text-blue-200 space-y-1">
            <li>• Suas credenciais biométricas ficam no dispositivo</li>
            <li>• Nenhuma informação biométrica é enviada para servidores</li>
            <li>• Use apenas em dispositivos pessoais e confiáveis</li>
            <li>• Sempre mantenha sua senha como alternativa</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}