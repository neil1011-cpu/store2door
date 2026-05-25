
import { LogicwareConnect } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Logicware Connect SDK utility.
 * Optimized to prevent top-level initialization errors in client components.
 */

/**
 * Factory function to create a Logicware client instance.
 * @param apiKey Optional API key. If not provided, it falls back to the server-side environment variable.
 */
export function getLogicwareClient(apiKey?: string) {
  const finalKey = apiKey || process.env.LOGICWARE_API_KEY;
  
  if (!finalKey) {
    // We only throw if we are on the server or if a key was expected to be available.
    // In the browser, this will be caught by individual function calls.
    if (typeof window === 'undefined') {
      throw new Error('Logicware API key is required on server side.');
    }
    throw new Error('Logicware API key is required. Ensure it is set in .env or passed dynamically.');
  }

  return new LogicwareConnect({
    apiKey: finalKey,
    baseUrl: process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app',
  });
}

export async function fetchLogicwareShippers() {
  try {
    const client = getLogicwareClient();
    if (!client.shippers) throw new Error('Shippers module not found in SDK instance.');
    const shippers = await client.shippers.list();
    return shippers;
  } catch (error: any) {
    console.error('[LOGICWARE SDK ERROR]', error);
    throw new Error(error?.message || 'Failed to fetch Logicware shippers');
  }
}

export async function fetchLogicwareShipments() {
  try {
    const client = getLogicwareClient();
    // Defensive checks to prevent "reading list of undefined"
    if (client.shipments) {
        return await client.shipments.list({ limit: 100 });
    } else if (client.shippers) {
        return await client.shippers.list();
    }
    return [];
  } catch (error: any) {
    console.error('[LOGICWARE SHIPMENTS SDK ERROR]', error);
    return [];
  }
}

export const logicwareMeta = {
    baseUrl: process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app',
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: 'from-store-door'
};
