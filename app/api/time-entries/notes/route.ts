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

    const body = await request.json();
    const { notes } = body;

    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { success: false, error: 'Notes are required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Buscar entrada existente para hoje
    let { data: timeEntry, error: fetchError } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Fetch time entry error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    if (!timeEntry) {
      // Criar nova entrada apenas com observações
      const { data: newEntry, error: createError } = await supabase
        .from('time_entries')
        .insert({
          user_id: decoded.userId,
          date: today,
          notes: notes.trim()
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
      // Verificar se já tem observações
      if (timeEntry.notes) {
        return NextResponse.json(
          { success: false, error: 'Notes already exist for today' },
          { status: 409 }
        );
      }

      // Atualizar entrada existente com observações
      const { data: updatedEntry, error: updateError } = await supabase
        .from('time_entries')
        .update({
          notes: notes.trim(),
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

    return NextResponse.json({
      success: true,
      data: timeEntry
    });

  } catch (error) {
    console.error('Add notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}