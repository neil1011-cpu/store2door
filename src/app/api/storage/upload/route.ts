import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

/**
 * @fileOverview Authorized Documentation Porter (Database Backed).
 * Stores uploaded files directly in the Supabase PostgreSQL database as binary data (bytea).
 * Hardened to use direct Buffer transmission and descriptive logging.
 */

export async function POST(request: Request) {
    const requestId = Math.random().toString(36).slice(2, 9);
    console.log(`[STORAGE_UPLOAD:${requestId}] Request received.`);

    try {
        const headerList = await headers();
        const authHeader = headerList.get('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        const adminClient = await createAdminClient();
        let caller;

        // Verify Authentication
        if (token) {
            const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
            if (authError) throw new Error("Security verification failed: Session expired or invalid.");
            caller = user;
        } else {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            caller = user;
        }

        if (!caller) {
            console.warn(`[STORAGE_UPLOAD:${requestId}] 401 Unauthorized: No caller identified.`);
            return NextResponse.json({ message: 'Authentication session required' }, { status: 401 });
        }

        // 1. Extract and Validate File
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return NextResponse.json({ message: 'Payload missing file segment.' }, { status: 400 });
        }

        // Size Restriction: 500MB
        if (file.size > 500 * 1024 * 1024) {
            return NextResponse.json({ message: 'File size exceeds 500MB limit. Please compress or resize.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Use Hex encoding for PostgREST bytea insertion
        const hexData = `\\x${buffer.toString('hex')}`;

        console.log(`[STORAGE_UPLOAD:${requestId}] Binary data prepared. Size: ${file.size} bytes. Filename: ${file.name}`);

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

        if (insertError) {
            console.error(`[STORAGE_UPLOAD:${requestId}] Database Insert Error:`, insertError);
            throw new Error(`Registry rejection: ${insertError.message}`);
        }

        console.log(`[STORAGE_UPLOAD:${requestId}] Success. Asset ID: ${asset.id}`);

        return NextResponse.json({ 
            success: true, 
            key: asset.id, 
            fileName: file.name
        });

    } catch (error: any) {
        console.error(`[STORAGE_UPLOAD_FATAL:${requestId}]`, error.message);
        return NextResponse.json({ 
            message: error.message || 'The database transfer handshake failed.',
            code: error.name
        }, { status: 500 });
    }
}
