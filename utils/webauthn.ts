// WebAuthn utilities - LEGACY VERSION (for backward compatibility)
// WebAuthn TEMPORARIAMENTE DESABILITADO - Edge Functions removidas

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

// TEMPORARIAMENTE DESABILITADO - Todas as funções WebAuthn
export async function registerBiometric(username: string, displayName?: string): Promise<any> {
  throw new Error('WebAuthn temporariamente desabilitado. Use login tradicional.');
}

export async function authenticateWithBiometric(username?: string): Promise<any> {
  throw new Error('WebAuthn temporariamente desabilitado. Use login tradicional.');
}

export async function hasRegisteredCredentials(username?: string): Promise<boolean> {
  return false; // Sempre false para desabilitar WebAuthn
}

export async function getUserCredentials(username: string): Promise<any[]> {
  return [];
}

export async function removeUserCredentials(username: string): Promise<void> {
  throw new Error('WebAuthn temporariamente desabilitado');
}

// Legacy localStorage functions (deprecated)
export function clearAllCredentials(): void {
  localStorage.removeItem('webauthn_credentials');
}