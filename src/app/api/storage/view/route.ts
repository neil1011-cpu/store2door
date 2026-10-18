import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Secure Database Documentation Proxy.
 * Retrieves binary data from PostgreSQL and serves it to the browser.
 * Hardened to handle various PostgreSQL bytea output formats.
 */

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idOrKey = searchParams.get('key');

    if (!idOrKey) return NextResponse.json({ message: 'Missing document identifier' }, { status: 400 });

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        // 1. Legacy URL Detection
        const decodedKey = decodeURIComponent(idOrKey);
        if (decodedKey.startsWith('http')) {
            return Response.redirect(decodedKey, 307);
        }

        const adminClient = await createAdminClient();

        // 2. Fetch from Database
        const { data: asset, error: fetchError } = await adminClient
            .from('document_assets')
            .select('*')
            .eq('id', idOrKey)
            .maybeSingle();

        if (fetchError || !asset) {
            return NextResponse.json({ message: 'Document not found or access denied.' }, { status: 404 });
        }

        // 3. Authorization Check
        const { data: roleData } = await adminClient
            .from('app_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();

        const isAdmin = !!roleData || user.email === 'admin@neilussolutions.com';
        const isOwner = asset.profile_id === user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ message: 'Access Denied: You do not own this asset.' }, { status: 403 });
        }

        // 4. Binary Conversion
        let buffer: Buffer;
        if (typeof asset.file_data === 'string' && asset.file_data.startsWith('\\x')) {
            buffer = Buffer.from(asset.file_data.substring(2), 'hex');
        } else if (typeof asset.file_data === 'string') {
            buffer = Buffer.from(asset.file_data, 'base64');
        } else {
            // Postgres node driver might return it as a Buffer directly
            buffer = Buffer.from(asset.file_data as any);
        }

        return new Response(buffer, {
            headers: {
                'Content-Type': asset.mime_type,
                'Content-Disposition': `inline; filename="${asset.file_name}"`,
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'private, max-age=3600'
            }
        });

    } catch (error: any) {
        console.error('[DB_VIEW_ERROR] FATAL:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
