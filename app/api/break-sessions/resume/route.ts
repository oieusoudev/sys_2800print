import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractUserFromToken } from '@/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const today = new Date().toISOString().split('T')[0];

    // Buscar sessão pausada
    const { data: breakSession, error: fetchError } = await supabase
      .from('break_sessions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('date', today)
      .single();

    if (fetchError || !breakSession) {
      return NextResponse.json(
        { success: false, error: 'No break session found' },
        { status: 404 }
      );
    }

    const now = Date.now();
    const currentData = breakSession.sessions_data || {};

    const updatedSessionData = {
      ...currentData,
      isPaused: false,
      lastActiveTime: now
    };

    // Atualizar sessão
    const { data: updatedSession, error: updateError } = await supabase
      .from('break_sessions')
      .update({
        sessions_data: updatedSessionData,
        updated_at: new Date().toISOString()
      })
      .eq('id', breakSession.id)
      .select()
      .single();

    if (updateError) {
      console.error('Resume break session error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to resume break session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedSession
    });

  } catch (error) {
    console.error('Resume break error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}