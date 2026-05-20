
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

export const logicwareMeta = {
    baseUrl: process.env.LOGICWARE_BASE_URL || 'https://from-store-to-door-api.logicware.app',
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: 'from-store-door'
};

export async function fetchLogicwareShipments() {
  try {
    const response = await fetch(
      `${process.env.LOGICWARE_BASE_URL}/shipments`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LOGICWARE_API_KEY}`,
        },
        cache: 'no-store',
      }
    );

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || `Logicware API Error (${response.status})`);
    }

    return data;
  } catch (error: any) {
    console.error('[LOGICWARE ERROR]', error);
    throw new Error(error?.message || 'Failed to fetch Logicware data');
  }
}
