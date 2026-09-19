import { NextResponse } from 'next/server';
import { fetchLogicwareShippers } from '@/lib/logicware';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Logicware API bridge using Supabase registry config.
 */

export async function GET() {
  try {
    let apiKey;
    const adminClient = await createAdminClient();
    const { data: configDoc } = await adminClient
        .from('system_configs')
        .select('config_value')
        .eq('config_key', 'logicware')
        .maybeSingle();
    
    if (configDoc?.config_value?.apiKey) {
        apiKey = configDoc.config_value.apiKey;
    }

    const shippers = await fetchLogicwareShippers(apiKey);

    return NextResponse.json({
      success: true,
      shippers,
    });
  } catch (error: any) {
    console.error('[LOGICWARE API ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Logicware fetch failed',
      },
      { status: 500 }
    );
  }
}
