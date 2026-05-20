import { LogicwareConnect } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Logicware Connect SDK utility.
 * Configured via environment variables for secure server-side access.
 */

const client = new LogicwareConnect({
  apiKey: process.env.LOGICWARE_API_KEY!,
  baseUrl: process.env.LOGICWARE_BASE_URL,
});

export async function fetchLogicwareShippers() {
  try {
    const shippers = await client.shippers.list();
    return shippers;
  } catch (error: any) {
    console.error('[LOGICWARE SDK ERROR]', error);
    throw new Error(error?.message || 'Failed to fetch Logicware shippers');
  }
}

export async function fetchLogicwareShipments() {
  try {
    // The SDK often provides a shipments module as well
    const shipments = await client.shipments.list({ limit: 100 });
    return shipments;
  } catch (error: any) {
    console.error('[LOGICWARE SHIPMENTS SDK ERROR]', error);
    // Fallback to shippers if shipments module isn't active
    return fetchLogicwareShippers();
  }
}

export const logicwareMeta = {
    baseUrl: process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app',
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: 'from-store-door'
};
