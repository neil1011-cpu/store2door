
import { LogicwareConnect } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Logicware Connect SDK utility.
 * Refactored to prevent runtime crashes by using a factory function.
 */

/**
 * Factory function to create a Logicware client instance.
 * @param apiKey Optional API key. If not provided, it falls back to the server-side environment variable.
 */
export function getLogicwareClient(apiKey?: string) {
  const finalKey = apiKey || process.env.LOGICWARE_API_KEY;
  
  if (!finalKey) {
    // Only throw if on server side to prevent browser crashes during import
    if (typeof window === 'undefined') {
      throw new Error('Logicware API key is required on server side.');
    }
    return null;
  }

  return new LogicwareConnect({
    apiKey: finalKey,
    baseUrl: process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app',
  });
}

export async function fetchLogicwareShippers() {
  try {
    const client = getLogicwareClient();
    if (!client?.shippers) return [];
    const shippers = await client.shippers.list({ limit: 100 });
    return Array.isArray(shippers) ? shippers : (shippers as any).data || (shippers as any).shippers || [];
  } catch (error: any) {
    console.error('[LOGICWARE SHIPPERS ERROR]', error);
    return [];
  }
}

export async function fetchLogicwareShipments() {
  try {
    const client = getLogicwareClient();
    if (!client?.shipments) return [];
    const shipments = await client.shipments.list({ limit: 100 });
    return Array.isArray(shipments) ? shipments : (shipments as any).data || (shipments as any).shipments || [];
  } catch (error: any) {
    console.error('[LOGICWARE SHIPMENTS ERROR]', error);
    return [];
  }
}

export async function fetchLogicwareManifests() {
    try {
        const client = getLogicwareClient();
        if (!client?.manifests) return [];
        const manifests = await client.manifests.list({ limit: 100, sort: 'desc' });
        return Array.isArray(manifests) ? manifests : (manifests as any).data || (manifests as any).manifests || [];
    } catch (error) {
        console.error('[LOGICWARE MANIFESTS ERROR]', error);
        return [];
    }
}

export const logicwareMeta = {
    baseUrl: process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app',
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: 'from-store-door'
};
