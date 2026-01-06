/**
 * Standardized Text Size System
 * 
 * Use these consistent text size classes across all components and pages
 * to ensure readability and visual consistency.
 * 
 * Mobile-first approach: Base size for mobile, then scale up for larger screens
 */

export const textSizes = {
  // Headings
  h1: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl', // 20px → 24px → 30px → 36px
  h2: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',   // 18px → 20px → 24px → 30px
  h3: 'text-base sm:text-lg md:text-xl lg:text-2xl',   // 16px → 18px → 20px → 24px
  h4: 'text-sm sm:text-base md:text-lg lg:text-xl',   // 14px → 16px → 18px → 20px
  
  // Body text
  body: 'text-sm sm:text-base md:text-lg',             // 14px → 16px → 18px
  bodySmall: 'text-xs sm:text-sm md:text-base',        // 12px → 14px → 16px
  bodyTiny: 'text-[10px] sm:text-xs md:text-sm',      // 10px → 12px → 14px
  
  // Labels and captions
  label: 'text-xs sm:text-sm md:text-base',            // 12px → 14px → 16px
  labelSmall: 'text-[10px] sm:text-xs md:text-sm',    // 10px → 12px → 14px
  caption: 'text-[9px] sm:text-[10px] md:text-xs',     // 9px → 10px → 12px
  captionTiny: 'text-[8px] sm:text-[9px] md:text-[10px]', // 8px → 9px → 10px
  
  // Card-specific (for compact spaces)
  cardTitle: 'text-[11px] sm:text-xs md:text-sm',      // 11px → 12px → 14px
  cardSubtitle: 'text-[9px] sm:text-[10px] md:text-xs', // 9px → 10px → 12px
  cardLabel: 'text-[8px] sm:text-[9px] md:text-[10px]', // 8px → 9px → 10px
  cardValue: 'text-xs sm:text-sm md:text-base',        // 12px → 14px → 16px
  cardValueLarge: 'text-sm sm:text-base md:text-lg',   // 14px → 16px → 18px
  
  // Button text
  button: 'text-sm sm:text-base',                       // 14px → 16px
  buttonSmall: 'text-xs sm:text-sm',                   // 12px → 14px
  buttonLarge: 'text-base sm:text-lg',                  // 16px → 18px
} as const;

/**
 * Helper function to get text size classes
 */
export function getTextSize(size: keyof typeof textSizes): string {
  return textSizes[size];
}

