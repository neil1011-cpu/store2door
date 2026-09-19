import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Authorized Documentation Porter (Database Backed).
 * Stores uploaded files directly in the Supabase PostgreSQL database as binary data (bytea).
 * Limits upload size to 5MB to preserve database performance.
 */

export async function POST(request: Request) {
    const requestId = Math.random().toString(36).slice(2, 9);
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    try {
        const supabase = await createClient();
        let caller;

        // Extract authenticated user
        if (token) {
            const { data } = await supabase.auth.getUser(token);
            caller = data?.user;
        } else {
            const { data } = await supabase.auth.getUser();
            caller = data?.user;
        }

        if (!caller) {
            return NextResponse.json({ message: 'Authentication session required' }, { status: 401 });
        }

        const adminClient = await createAdminClient();
        
        // 1. Extract and Validate File
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ message: 'Payload missing file segment.' }, { status: 400 });

        // Max 5MB check
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ message: 'File size exceeds 5MB limit.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Convert Buffer to PostgreSQL-friendly Hex string for the 'bytea' column
        // We prefix with \x to tell Postgres this is hex-encoded binary data
        const hexData = `\\x${buffer.toString('hex')}`;

        // 2. Persist directly in PostgreSQL
        const { data: asset, error: insertError } = await adminClient
            .from('document_assets')
            .insert({
                profile_id: caller.id,
                file_name: file.name,
                mime_type: file.type || 'application/octet-stream',
                file_size: file.size,
                file_data: hexData
            })
            .select('id')
            .single();

        if (insertError) throw insertError;

        // We return the asset ID as the durable reference
        return NextResponse.json({ 
            success: true, 
            key: asset.id, 
            fileName: file.name
        });

    } catch (error: any) {
        console.error(`[DB_STORAGE_FATAL:${requestId}]`, error);
        return NextResponse.json({ 
            message: error.message || 'The database transfer handshake failed.',
            code: error.name
        }, { status: 500 });
    }
}
