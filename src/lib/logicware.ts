import { LogicwareConnect } from '@logicware.app/connect-sdk';

/**
 * @fileOverview Logicware Connect SDK utility.
 * Configured with the official FromStore2Door API endpoints and slug.
 */

const LOGICWARE_API_BASE_URL = 'https://from-store-to-door-api.logicware.app';
const COURIER_SLUG = 'from-store-door';

/**
 * Initializes a Logicware client using the provided API Key.
 * @param apiKey The secret API key from the Logicware Courier Portal.
 */
export function getLogicwareClient(apiKey: string) {
  if (!apiKey) {
    throw new Error('Logicware API Key is required for integration.');
  }

  return new LogicwareConnect({
    apiKey,
    baseUrl: LOGICWARE_API_BASE_URL,
  });
}

export const logicwareMeta = {
    baseUrl: LOGICWARE_API_BASE_URL,
    portalUrl: 'https://from-store-to-door-portal.logicware.app',
    shipperUrl: 'https://from-store-to-door.logicware.app',
    slug: COURIER_SLUG
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
      throw new Error(
        data?.message ||
          `Logicware API Error (${response.status})`
      );
    }

    return data;
  } catch (error: any) {
    console.error(
      '[LOGICWARE ERROR]',
      error
    );

    throw new Error(
      error?.message ||
        'Failed to fetch Logicware data'
    );
  }
}
