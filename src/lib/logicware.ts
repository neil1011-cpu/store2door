import { LogicwareConnect } from '@logicware.app/connect-sdk';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * @fileOverview Logicware Connect SDK utility.
 * Authoritative client factory that pulls configuration from the Supabase registry.
 */

/**
 * Factory function to create a Logicware client instance asynchronously.
 * Fetches API Key and Base URL from system_configs to ensure environment consistency.
 */
export async function getLogicwareClient(apiKeyOverride?: string) {
  let apiKey = apiKeyOverride;
  let baseUrl = process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app';

  // Attempt to load authoritative config from Registry
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
        if (configDoc.config_value.baseUrl) {
            baseUrl = configDoc.config_value.baseUrl;
        }
    }
  } catch (err) {
    console.warn('[LOGICWARE_CLIENT] Could not load registry config, using environment fallbacks.');
  }

  const finalKey = apiKey || process.env.LOGICWARE_API_KEY;
  
  if (!finalKey) {
    return null;
  }

  return new LogicwareConnect({
    apiKey: finalKey,
    baseUrl: baseUrl,
  });
}

export async function fetchLogicwareShippers(apiKey?: string) {
  try {
    const client = await getLogicwareClient(apiKey);
    if (!client?.shippers) return [];
    const shippers = await client.shippers.list({ pageSize: 100 });
    return Array.isArray(shippers) ? shippers : (shippers as any).data || (shippers as any).shippers || [];
  } catch (error: any) {
    console.error('[LOGICWARE SHIPPERS ERROR]', error);
    return [];
  }
}

export async function fetchLogicwareShipments(apiKey?: string) {
  try {
    const client = await getLogicwareClient(apiKey);
    if (!client?.shipments) return [];
    const shipments = await client.shipments.list({ limit: 100 });
    return Array.isArray(shipments) ? shipments : (shipments as any).data || (shipments as any).shipments || [];
  } catch (error: any) {
    console.error('[LOGICWARE SHIPMENTS ERROR]', error);
    return [];
  }
}

export async function fetchLogicwareManifests(apiKey?: string) {
    try {
        const client = await getLogicwareClient(apiKey);
        if (!client?.manifests) return [];
        const manifests = await client.manifests.list({ pageSize: 100 });
        return Array.isArray(manifests) ? manifests : (manifests as any).data || (manifests as any).manifests || [];
    } catch (error) {
        console.error('[LOGICWARE MANIFESTS ERROR]', error);
        return [];
    }
}

export const logicwareMeta = {
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: 'from-store-door'
};
