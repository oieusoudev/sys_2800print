import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PunchRequest } from '@/types/api';
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

    // Verificar se o usuário é admin - admins não podem bater ponto
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', decoded.userId)
      .single();

    if (userError) {
      console.error('User verification error:', userError);
      return NextResponse.json(
        { success: false, error: 'User verification failed' },
        { status: 500 }
      );
    }

    if (currentUser?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Administrators cannot punch clock' },
        { status: 403 }
      );
    }

    const body: PunchRequest = await request.json();
    const { punch_type, location, notes, punch_time_client } = body;

    if (!punch_type || !location) {
      return NextResponse.json(
        { success: false, error: 'Punch type and location are required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    // Usar hora do cliente se fornecida, senão usar hora do servidor
    const currentTime = punch_time_client ? `${punch_time_client}:00` : new Date().toTimeString().split(' ')[0];

    // Buscar entrada existente para hoje
    let { data: timeEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Fetch time entry error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    // Se não existe entrada para hoje, criar nova
    if (!timeEntry) {
      const { data: newEntry, error: createError } = await supabase
        .from('time_entries')
        .insert({
          user_id: decoded.userId,
          date: today,
          [punch_type]: currentTime,
          notes: notes || null
        })
        .select()
        .single();

      if (createError) {
        console.error('Create time entry error:', createError);
        return NextResponse.json(
          { success: false, error: 'Failed to create time entry' },
          { status: 500 }
        );
      }

      timeEntry = newEntry;
    } else {
      // Verificar se o ponto já foi batido
      if (timeEntry[punch_type]) {
        return NextResponse.json(
          { success: false, error: `${punch_type} already recorded today` },
          { status: 409 }
        );
      }

      // Atualizar entrada existente
      const { data: updatedEntry, error: updateError } = await supabase
        .from('time_entries')
        .update({
          [punch_type]: currentTime,
          notes: notes || timeEntry.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', timeEntry.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update time entry error:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update time entry' },
          { status: 500 }
        );
      }

      timeEntry = updatedEntry;
    }

    // Registrar localização do ponto
    const { error: locationError } = await supabase
      .from('punch_locations')
      .insert({
        time_entry_id: timeEntry.id,
        punch_type,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: new Date(location.timestamp).toISOString()
      });

    if (locationError) {
      console.error('Location insert error:', locationError);
      // Não falhar a operação por causa da localização
    }

    return NextResponse.json({
      success: true,
      data: timeEntry
    });

  } catch (error) {
    console.error('Punch clock error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}