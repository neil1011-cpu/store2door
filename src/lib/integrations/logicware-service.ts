import { LogicwareConnect } from '@logicware.app/connect-sdk';

export type LogicwareConfig = {
    apiKey: string;
    baseUrl: string;
};

/**
 * @fileOverview Server-side Logicware Service.
 */

export function getLogicwareInstance(config: LogicwareConfig) {
    if (!config.apiKey) throw new Error('Logicware API Key required.');

    return new LogicwareConnect({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl || 'https://from-store-to-door-api.logicware.app',
    });
}

export async function testLogicwareConnection(config: LogicwareConfig) {
    try {
        const client = getLogicwareInstance(config);
        // Simple ping via module check
        if (client.shippers) {
            await client.shippers.list({ limit: 1 });
        } else if (client.shipments) {
            await client.shipments.list({ limit: 1 });
        }
        return { success: true, message: 'Logistics Hub Synchronized.' };
    } catch (error: any) {
        console.error('[LOGICWARE_TEST_ERROR]', error);
        return { success: false, message: error.message || 'API Key rejected by hub.' };
    }
}
