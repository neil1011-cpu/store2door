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
    if (roundedWeight in pricingTiers) return pricingTiers[roundedWeight];
    if (roundedWeight > 10 && roundedWeight < 23) return 4850 + (roundedWeight - 10) * 450;
    if (roundedWeight > 30) return 12250 + (roundedWeight - 30) * 400;
    return 12250;
}

/**
 * Robustly determines the site origin for redirects.
 * Updated to trust production headers and environment variables over localhost defaults.
 */
export function getSiteOrigin(request?: Request): string {
    // 1. Environment variable is the absolute source of truth
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
    }

    // 2. Client-side fallback
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // 3. Server-side proxy header detection
    if (request) {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        
        if (host) {
            return `${proto}://${host}`;
        }
    }

    // 4. Local Development Fallback
    return 'http://localhost:3000';
}
