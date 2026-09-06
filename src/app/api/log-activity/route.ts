
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Production Log Activity API for Supabase.
 */

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, description, metadata, userId } = body;

        const supabase = await createAdminClient();

        const { error } = await supabase.from('system_logs').insert({
            log_type: type,
            description,
            actor_id: userId || null,
            metadata: metadata || {}
        });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[LOG ERROR]:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
