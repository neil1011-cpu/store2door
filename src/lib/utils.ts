
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
 * Implements standard tiers + linear interpolation for mid-ranges.
 */
export function calculateShippingCost(weight: number): number {
    if (!weight || weight <= 0) return 0;
    const roundedWeight = Math.ceil(weight);
    
    // Exact Tier Match
    if (roundedWeight in pricingTiers) {
        return pricingTiers[roundedWeight];
    }
    
    // Range: 11 - 22 lbs
    if (roundedWeight > 10 && roundedWeight < 23) {
        return 4850 + (roundedWeight - 10) * 450;
    }
    
    // Range: 31+ lbs
    if (roundedWeight > 30) {
        return 12250 + (roundedWeight - 30) * 400;
    }

    return 12250; // Fallback to max tier
}
