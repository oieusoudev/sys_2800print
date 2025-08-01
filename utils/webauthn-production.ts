// Production WebAuthn utilities - DISABLED FOR API ROUTES VERSION
// Since we removed Edge Functions, WebAuthn is temporarily disabled

export interface WebAuthnRegistrationResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

export interface WebAuthnAuthenticationResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

// Verificar se WebAuthn é suportado
export function isWebAuthnSupported(): boolean {
  const isSecureContext = window.isSecureContext || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';
    
  return !!(
    isSecureContext &&
    navigator.credentials && 
    navigator.credentials.create && 
    navigator.credentials.get &&
    window.PublicKeyCredential
  );
}

// Verificar se autenticação biométrica está disponível
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (error) {
    console.warn('Erro ao verificar disponibilidade biométrica:', error);
    return false;
  }
}

// TEMPORARIAMENTE DESABILITADO - Registrar nova credencial biométrica
export async function registerBiometricProduction(
  username: string, 
  displayName?: string
): Promise<WebAuthnRegistrationResult> {
  console.warn('WebAuthn temporariamente desabilitado - Edge Functions removidas');
  throw new Error('WebAuthn temporariamente desabilitado. Use login tradicional.');
}

// TEMPORARIAMENTE DESABILITADO - Autenticar com biometria
export async function authenticateWithBiometricProduction(
  username?: string
): Promise<WebAuthnAuthenticationResult> {
  console.warn('WebAuthn temporariamente desabilitado - Edge Functions removidas');
  throw new Error('WebAuthn temporariamente desabilitado. Use login tradicional.');
}

// TEMPORARIAMENTE DESABILITADO - Verificar se usuário tem credenciais registradas
export async function hasRegisteredCredentialsProduction(username?: string): Promise<boolean> {
  // Sempre retorna false para desabilitar WebAuthn
  return false;
}

// TEMPORARIAMENTE DESABILITADO - Obter credenciais do usuário
export async function getUserCredentialsProduction(username: string): Promise<any[]> {
  return [];
}

// TEMPORARIAMENTE DESABILITADO - Remover credenciais do usuário
export async function removeUserCredentialsProduction(username: string): Promise<void> {
  throw new Error('WebAuthn temporariamente desabilitado');
}