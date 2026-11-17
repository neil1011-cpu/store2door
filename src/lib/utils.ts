import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ShippingRates = {
    tiers: Record<string, number>;
    base_rate_30lb: number;
    increment_above_30lb: number;
};

/**
 * Official Shipping Pricing Tiers (JMD) - Default Fallback
 */
export const pricingTiers: Record<number, number> = {
    1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550,
    6: 3000, 7: 3450, 8: 3900, 9: 4350, 10: 4850,
    11: 5300, 12: 5750, 13: 6200, 14: 6650, 15: 7100,
    16: 7550, 17: 8000, 18: 8450, 19: 8900, 20: 9350,
    21: 9800, 22: 10250, 23: 9900, 24: 10200, 25: 10500, 
    26: 10850, 27: 11200, 28: 11550, 29: 11900, 30: 12250
};

/**
 * Official Jamaica Customs Rates & Constants
 */
export const CUSTOMS_RATES = {
  GENERAL: { duty: 0.20 },
  LAPTOPS_TABLETS: { duty: 0 },
  COMPUTERS: { duty: 0 },
  CELL_PHONES: { duty: 0.20 },
  CLOTHING: { duty: 0.20 },
  SHOES: { duty: 0.20 },
  AUTO_PARTS: { duty: 0.30 },
  COSMETICS: { duty: 0.20 },
  BOOKS: { duty: 0 },
  ELECTRONICS_OTHER: { duty: 0.20 },
};

export type CustomsCategory = keyof typeof CUSTOMS_RATES;

export const USD_TO_JMD_RATE = 156; 
export const DE_MINIMIS_THRESHOLD = 100;
export const INSURANCE_RATE = 0.015;
export const SCF_RATE = 0.003;

/**
 * Calculates the shipping cost based on weight (lbs).
 * Supports optional dynamic rates from the database registry.
 */
export function calculateShippingCost(weight: number, customRates?: ShippingRates | null): number {
    if (!weight || weight <= 0) return 0;
    const roundedWeight = Math.ceil(weight);
    
    const activeTiers = customRates?.tiers || pricingTiers;
    const base30 = customRates?.base_rate_30lb ?? pricingTiers[30];
    const increment = customRates?.increment_above_30lb ?? 400;

    // 1. Check mapped tiers (1-30)
    if (roundedWeight.toString() in activeTiers) return Number((activeTiers as any)[roundedWeight.toString()]);
    if (roundedWeight in activeTiers) return Number((activeTiers as any)[roundedWeight]);
    
    // 2. 31+ lbs bracket
    if (roundedWeight > 30) {
        return base30 + (roundedWeight - 30) * increment;
    }
    
    // Fallback to highest known tier or baseline
    return base30;
}

/**
 * Calculates Jamaica Customs Duty based on item value and category.
 */
export function calculateCustomsDuty({ 
  category, 
  customsValueUsd, 
  shippingJmd 
}: { 
  category: CustomsCategory; 
  customsValueUsd: number; 
  shippingJmd: number;
}) {
    if (customsValueUsd <= DE_MINIMIS_THRESHOLD) {
        return {
            importDuty: 0,
            scf: 0,
            caf: 0,
            totalDutyJmd: 0
        };
    }

    const insurance = customsValueUsd * INSURANCE_RATE;
    const shippingUsd = shippingJmd / USD_TO_JMD_RATE;
    const cif = customsValueUsd + insurance + shippingUsd;
    
    const rates = CUSTOMS_RATES[category];
    const importDuty = cif * rates.duty;
    const scf = cif * SCF_RATE;
    
    const getCAF = (val: number) => {
        if (val <= 500) return 2500;
        if (val <= 1000) return 5000;
        if (val <= 2500) return 10000;
        if (val <= 5000) return 20000;
        return 40000;
    };
    
    const cafJmd = getCAF(customsValueUsd);
    const totalDutyJmd = Math.ceil((importDuty + scf) * USD_TO_JMD_RATE + cafJmd);

    return {
        importDuty,
        scf,
        caf: cafJmd / USD_TO_JMD_RATE, // Returning in USD to match pattern if needed
        cafJmd,
        totalDutyJmd
    };
}

/**
 * Determines if a price should be shown based on shipment status.
 * STRICT RULE: Only show price when strictly in 'Ready for pick up' status.
 * This is used to hide prices for items in transit or processing.
 */
export function shouldShowPrice(status: string | undefined): boolean {
    const s = (status || '').toLowerCase().trim();
    // Strict match to prevent leaking amounts for "In transit" or "Received"
    return s === 'ready for pick up' || s === 'ready for pickup';
}

/**
 * Robustly determines the site origin for redirects.
 * PRIORITIZES NEXT_PUBLIC_SITE_URL if defined in the environment.
 */
export function getSiteOrigin(request?: Request): string {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    if (request) {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        if (host) return `${protocol}://${host}`;
    }
    return 'http://localhost:3000';
}

/**
 * Maps Logicware Hub status names to internal FromStore2Door statuses.
 */
export function mapLogicwareStatus(hubStatus: string): string {
  const s = hubStatus.toLowerCase();
  if (s === 'prealert') return 'Pre-alert';
  if (s === 'readytoship') return 'Received in Florida Warehouse';
  if (s === 'atcustoms') return 'In transit';
  if (s === 'atheadoffice' || s === 'atlocaloffice') return 'Ready for pick up';
  if (s.includes('pickup') || s.includes('destination') || s.includes('jamaica')) return 'Ready for pick up';
  if (s.includes('transit') || s.includes('departed') || s.includes('shipped') || s.includes('flight') || s.includes('voyage')) return 'In transit';
  if (s.includes('received') || s.includes('arrived') || s.includes('warehouse') || s.includes('intake')) return 'Received in Florida Warehouse';
  if (s.includes('delivery')) return 'Out for delivery';
  if (s.includes('delivered') || s.includes('picked up')) return 'Delivered';
  return hubStatus;
}

/**
 * Defines status priority to prevent "downgrading" (e.g. overwriting 'Ready for pick up' with 'Received').
 */
export const STATUS_PRIORITY: Record<string, number> = {
    'Pending': 0,
    'Pre-alert': 0,
    'Processed': 1,
    'Received': 2,
    'Received in Florida Warehouse': 2,
    'Processing': 2,
    'In transit': 3,
    'Out for delivery': 4,
    'Ready for pick up': 5,
    'Delivered': 6,
    'Returned': 7,
    'On Hold': 1
};
