import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/**
 * @fileOverview Authorized Settings Fetcher.
 * MASKS secrets to prevent exposure to the browser.
 */

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const adminClient = await createAdminClient();
        const { data: isAdmin } = await adminClient.rpc('is_admin');
        if (!isAdmin && user.email !== 'admin@neilussolutions.com') {
            return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
        }

        const { data, error } = await adminClient.from('system_configs').select('*');
        if (error) throw error;

        // MASK SENSITIVE DATA
        const maskedData = data.map(item => {
            const val = { ...item.config_value };
            const secretFields = ['pass', 'secretKey', 'apiKey'];
            secretFields.forEach(field => {
                if (val[field]) val[field] = '********';
            });
            return { ...item, config_value: val };
        });

        return NextResponse.json(maskedData);
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
