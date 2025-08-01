import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractUserFromToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = extractUserFromToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { credential_id, public_key, counter = 0 } = body;

    if (!credential_id || !public_key) {
      return NextResponse.json(
        { success: false, error: 'Credential ID and public key are required' },
        { status: 400 }
      );
    }

    // Verificar se a credencial já existe
    const { data: existingCredential } = await supabase
      .from('webauthn_credentials')
      .select('id')
      .eq('credential_id', credential_id)
      .single();

    if (existingCredential) {
      return NextResponse.json(
        { success: false, error: 'Credential already registered' },
        { status: 409 }
      );
    }

    // Registrar nova credencial
    const { data: newCredential, error: createError } = await supabase
      .from('webauthn_credentials')
      .insert({
        user_id: decoded.userId,
        credential_id,
        public_key,
        counter
      })
      .select()
      .single();

    if (createError) {
      console.error('WebAuthn register error:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to register credential' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newCredential
    });

  } catch (error) {
    console.error('WebAuthn register error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}