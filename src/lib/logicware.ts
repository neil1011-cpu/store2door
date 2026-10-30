import { LogicwareConnect } from '@logicware.app/connect-sdk';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Logicware Connect SDK utility.
 * Standard client factory aligned with SDK v0.2.0.
 */

export async function getLogicwareClient(apiKeyOverride?: string) {
  let apiKey = apiKeyOverride;
  let baseUrl = process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app';

  try {
    const adminClient = await createAdminClient();
    const { data: configDoc } = await adminClient
        .from('system_configs')
        .select('config_value')
        .eq('config_key', 'logicware')
        .maybeSingle();
    
    if (configDoc?.config_value) {
        if (!apiKey && configDoc.config_value.apiKey && configDoc.config_value.apiKey !== '********') {
            apiKey = configDoc.config_value.apiKey;
        }
        if (configDoc.config_value.baseUrl) baseUrl = configDoc.config_value.baseUrl;
    }
  } catch (err) {
    console.warn('[LOGICWARE_CLIENT] Using env fallbacks.');
  }

  const finalKey = apiKey || process.env.LOGICWARE_API_KEY;
  if (!finalKey) return null;

  return new LogicwareConnect({
    apiKey: finalKey,
    baseUrl: baseUrl,
  });
}

export async function fetchLogicwareShippers(apiKey?: string) {
  try {
    const client = await getLogicwareClient(apiKey);
    if (!client?.shippers) return [];
    // SDK v0.2.0 uses pageSize instead of limit
    const response = await client.shippers.list({ pageSize: 100 });
    return Array.isArray(response) ? response : ((response as any).data || []);
  } catch (error: any) {
    console.error('[LOGICWARE SHIPPERS ERROR]', error.message);
    return [];
  }
}

export async function fetchLogicwarePackages(apiKey?: string) {
  try {
    const client = await getLogicwareClient(apiKey);
    // SDK v0.2.0 uses packages instead of shipments
    if (!client?.packages) return [];
    const response = await client.packages.list({ pageSize: 100 });
    return Array.isArray(response) ? response : ((response as any).data || []);
  } catch (error: any) {
    console.error('[LOGICWARE PACKAGES ERROR]', error.message);
    return [];
  }
}

export async function fetchLogicwareManifests(apiKey?: string) {
    try {
        const client = await getLogicwareClient(apiKey);
        if (!client?.manifests) return [];
        // SDK v0.2.0 uses pageSize instead of limit
        const response = await client.manifests.list({ pageSize: 100 });
        return Array.isArray(response) ? response : ((response as any).data || []);
    } catch (error: any) {
        console.error('[LOGICWARE MANIFESTS ERROR]', error.message);
        return [];
    }
}

export const logicwareMeta = {
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: 'from-store-door'
};