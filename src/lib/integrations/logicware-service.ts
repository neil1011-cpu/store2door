
import { LogicwareConnect } from '@logicware.app/connect-sdk';

export type LogicwareConfig = {
    apiKey: string;
    baseUrl: string;
};

/**
 * @fileOverview Server-side Logicware Service.
 * Standardized for SDK v0.2.0.
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
        // SDK v0.2.0 uses pageSize instead of limit and packages/shippers resources
        if (client.packages) {
            await client.packages.list({ pageSize: 1 });
        } else if (client.shippers) {
            await client.shippers.list({ pageSize: 1 });
        }
        
        return { success: true, message: 'Logistics Hub Synchronized.' };
    } catch (error: any) {
        console.error('[LOGICWARE_TEST_ERROR]', error);
        return { success: false, message: error.message || 'API Key rejected.' };
    }
}
