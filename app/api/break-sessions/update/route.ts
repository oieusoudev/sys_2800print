import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractUserFromToken } from '@/lib/jwt';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
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
    const { total_time_used, sessions_data } = body;

    if (total_time_used === undefined || !sessions_data) {
      return NextResponse.json(
        { success: false, error: 'Total time used and sessions data are required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Buscar sessão existente
    const { data: breakSession, error: fetchError } = await supabase
      .from('break_sessions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('date', today)
      .single();

    if (fetchError || !breakSession) {
      return NextResponse.json(
        { success: false, error: 'Break session not found' },
        { status: 404 }
      );
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from('break_sessions')
      .update({
        total_time_used: total_time_used,
        sessions_data: sessions_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', breakSession.id)
      .select()
      .single();

    if (updateError) {
      console.error('Update break session error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update break session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedSession
    });

  } catch (error) {
    console.error('Update break session error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}