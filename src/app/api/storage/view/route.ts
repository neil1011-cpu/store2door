import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { Buffer } from 'node:buffer';

/**
 * @fileOverview Secure Database Documentation Proxy.
 * Retrieves binary data from PostgreSQL and serves it to the browser.
 * Hardened to handle various PostgreSQL bytea output formats and prevent cross-origin redirect blocks.
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
            // NOTE: In-browser iframes often block cross-origin redirects. 
            // The frontend now handles this by loading directly, but we keep this for direct browser hits.
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
            console.error('[STORAGE_VIEW] Asset lookup failed:', fetchError);
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

        // 4. Binary Conversion (Hardened for various PostgreSQL/Supabase formats)
        let buffer: Buffer;
        const rawData = asset.file_data;

        if (!rawData) {
            throw new Error('Asset record exists but contains no binary data.');
        }

        // Handle hex format (\x...), raw Uint8Arrays, and standard buffers
        if (Buffer.isBuffer(rawData)) {
            buffer = rawData;
        } else if (typeof rawData === 'string' && rawData.startsWith('\\x')) {
            buffer = Buffer.from(rawData.substring(2), 'hex');
        } else if (typeof rawData === 'string') {
            const isHex = /^[0-9a-fA-F]+$/.test(rawData);
            buffer = Buffer.from(rawData, isHex ? 'hex' : 'base64');
        } else if (rawData instanceof Uint8Array) {
            buffer = Buffer.from(rawData);
        } else {
            // Fallback for objects or other stream types
            buffer = Buffer.from(rawData as any);
        }

        if (buffer.length === 0) {
            throw new Error('Extracted binary buffer is empty.');
        }

        // 5. Build authoritative response
        const headers = new Headers();
        headers.set('Content-Type', asset.mime_type || 'application/pdf');
        headers.set('Content-Disposition', `inline; filename="${asset.file_name || 'document.pdf'}"`);
        headers.set('Content-Length', buffer.length.toString());
        headers.set('Cache-Control', 'private, max-age=3600');
        headers.set('X-Content-Type-Options', 'nosniff');
        
        // Ensure browser doesn't block the preview if it's served as an iframe
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(buffer, {
            status: 200,
            headers
        });

    } catch (error: any) {
        console.error('[DB_VIEW_ERROR] FATAL:', error.message);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
