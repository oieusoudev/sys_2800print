import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractUserFromToken } from '@/lib/jwt';
import { BreakSession } from '@/types/api';

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
    const now = Date.now();

    // Define the default session data structure
    const defaultSessionData: BreakSession['sessions_data'] = {
      pausedTime: 0,
      startTime: null,
      isActive: false,
      isPaused: false,
      lastActiveTime: null
    };

    // Buscar sessão existente para hoje
    let { data: breakSession, error: fetchError } = await supabase
      .from('break_sessions')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Fetch break session error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    let totalTimeUsed = 0;
    let existingSessionData: BreakSession['sessions_data'] = { ...defaultSessionData };
    
    if (breakSession) {
      totalTimeUsed = breakSession.total_time_used || 0;
      existingSessionData = { ...defaultSessionData, ...(breakSession.sessions_data || {}) };
      
      // Se a sessão estava ativa e não pausada, calcular tempo adicional
      if (existingSessionData.isActive && 
          !existingSessionData.isPaused && 
          existingSessionData.lastActiveTime) {
        const timeSinceLastActive = Math.floor((now - existingSessionData.lastActiveTime) / 1000);
        totalTimeUsed += timeSinceLastActive;
      }
    }

    const sessionData = {
      ...defaultSessionData,
      pausedTime: existingSessionData.pausedTime,
      startTime: existingSessionData.startTime || now,
      isActive: true,
      isPaused: false,
      lastActiveTime: now
    };

    if (!breakSession) {
      // Criar nova sessão
      const { data: newSession, error: createError } = await supabase
        .from('break_sessions')
        .insert({
          user_id: decoded.userId,
          date: today,
          total_time_used: totalTimeUsed,
          sessions_data: sessionData
        })
        .select()
        .single();

      if (createError) {
        console.error('Create break session error:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create break session' },
          { status: 500 }
        );
      }

      breakSession = newSession;
    } else {
      // Atualizar sessão existente
      const { data: updatedSession, error: updateError } = await supabase
        .from('break_sessions')
        .update({
          total_time_used: totalTimeUsed,
          sessions_data: sessionData,
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

      breakSession = updatedSession;
    }

    return NextResponse.json({
      success: true,
      data: breakSession
    });

  } catch (error) {
    console.error('Start break error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}