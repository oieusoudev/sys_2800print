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
    const { recipient_id, title, message } = body;

    if (!recipient_id || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Recipient ID, title and message are required' },
        { status: 400 }
      );
    }

    // Usar a função do banco para enviar aviso específico
    const { data: announcementId, error } = await supabase
      .rpc('send_specific_announcement', {
        p_sender_id: decoded.userId,
        p_recipient_id: recipient_id,
        p_title: title.trim(),
        p_message: message.trim()
      });

    if (error) {
      console.error('Send specific announcement error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to send announcement' },
        { status: 500 }
      );
    }

    // Buscar o aviso criado para retornar
    const { data: announcement, error: fetchError } = await supabase
      .from('announcements')
      .select(`
        *,
        sender:users!sender_id(full_name, username),
        recipient:users!recipient_id(full_name, username)
      `)
      .eq('id', announcementId)
      .single();

    if (fetchError) {
      console.error('Fetch announcement error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch created announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement
    });

  } catch (error) {
    console.error('Send specific announcement error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}