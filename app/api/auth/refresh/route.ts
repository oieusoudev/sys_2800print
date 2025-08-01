import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractUserFromToken, signJWT } from '@/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = extractUserFromToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verificar se usuário ainda existe e está ativo
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, is_admin, is_active')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Gerar novo token JWT assinado
    const newToken = signJWT({
      userId: user.id,
      username: user.username,
      isAdmin: user.is_admin
    });

    return NextResponse.json({
      success: true,
      data: { 
        token: newToken,
        expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}