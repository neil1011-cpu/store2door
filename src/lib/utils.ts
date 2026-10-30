import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Official Shipping Pricing Tiers (JMD)
 */
export const pricingTiers: Record<number, number> = {
    1: 750, 2: 1200, 3: 1650, 4: 2100, 5: 2550,
    6: 3000, 7: 3450, 8: 3900, 9: 4350, 10: 4850,
    23: 9900, 24: 10200, 25: 10500, 26: 10850, 
    27: 11200, 28: 11550, 29: 11900, 30: 12250
};

/**
 * Calculates the shipping cost based on weight (lbs).
 */
export function calculateShippingCost(weight: number): number {
    if (!weight || weight <= 0) return 0;
    const roundedWeight = Math.ceil(weight);
    
    // 1. Check exact tiers
    if (roundedWeight in pricingTiers) return pricingTiers[roundedWeight];
    
    // 2. 11-22 lbs bracket
    if (roundedWeight > 10 && roundedWeight < 23) {
        return 4850 + (roundedWeight - 10) * 450;
    }
    
    // 3. 31+ lbs bracket
    if (roundedWeight > 30) {
        return 12250 + (roundedWeight - 30) * 400;
    }
    
    // Fallback to highest known tier or baseline
    return 12250;
}

/**
 * Determines if a price should be shown based on shipment status.
 */
export function shouldShowPrice(status: string | undefined): boolean {
    const s = (status || '').toLowerCase();
    // Don't show price for pre-alert stages where weight/cost isn't confirmed
    if (s === 'pending' || s === 'pre-alert' || s === 'cancelled') return false;
    return true;
}

/**
 * Robustly determines the site origin for redirects.
 */
export function getSiteOrigin(request?: Request): string {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    }
    if (request) {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        if (host) return `${proto}://${host}`;
    }
    return 'http://localhost:3000';
}

/**
 * Maps Logicware Hub status names to internal FromStore2Door statuses.
 */
export function mapLogicwareStatus(hubStatus: string): string {
  const s = hubStatus.toLowerCase();
  if (s === 'prealert') return 'Pre-alert';
  if (s === 'readytoship') return 'Received';
  if (s === 'atcustoms') return 'In transit';
  if (s === 'atheadoffice' || s === 'atlocaloffice') return 'Ready for pick up';
  if (s.includes('pickup') || s.includes('destination') || s.includes('jamaica')) return 'Ready for pick up';
  if (s.includes('transit') || s.includes('departed') || s.includes('shipped') || s.includes('flight') || s.includes('voyage')) return 'In transit';
  if (s.includes('received') || s.includes('arrived') || s.includes('warehouse') || s.includes('intake')) return 'Received';
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
    'Processing': 2,
    'In transit': 3,
    'Out for delivery': 4,
    'Ready for pick up': 5,
    'Delivered': 6,
    'Returned': 7,
    'On Hold': 1
};
