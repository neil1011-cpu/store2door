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