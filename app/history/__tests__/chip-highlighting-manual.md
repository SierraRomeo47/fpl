# Manual Testing Guide: Chip Highlighting on History Page

## Overview
This document provides step-by-step instructions for manually testing the chip highlighting feature on the history page.

## Prerequisites
- Development server running (`npm run dev`)
- Valid FPL account session
- Browser Developer Tools open (F12)

## Test Cases

### Test 1: Wildcard Chip Display (Purple)
**Steps:**
1. Navigate to `/history` page
2. Locate a gameweek where Wildcard was used (typically early in season, e.g., GW 4)
3. Verify visual indicators:
   - [ ] Purple circular badge in top-right corner of GW card
   - [ ] Sparkle icon (✨) visible in badge
   - [ ] Purple ring around the entire GW card
   - [ ] "WC" label displayed next to "GW X" text
   - [ ] Purple color theme throughout (border, icon, ring, label)

**Expected Result:** All purple indicators visible and correctly styled

### Test 2: Triple Captain Chip Display (Yellow)
**Steps:**
1. Navigate to `/history` page
2. Locate a gameweek where Triple Captain was used
3. Verify visual indicators:
   - [ ] Yellow circular badge in top-right corner of GW card
   - [ ] Zap icon (⚡) visible in badge
   - [ ] Yellow ring around the entire GW card
   - [ ] "TC" label displayed next to "GW X" text
   - [ ] Yellow color theme throughout (border, icon, ring, label)

**Expected Result:** All yellow indicators visible and correctly styled

### Test 3: Bench Boost Chip Display (Blue)
**Steps:**
1. Navigate to `/history` page
2. Locate a gameweek where Bench Boost was used
3. Verify visual indicators:
   - [ ] Blue circular badge in top-right corner of GW card
   - [ ] Layers icon (☰) visible in badge
   - [ ] Blue ring around the entire GW card
   - [ ] "BB" label displayed next to "GW X" text
   - [ ] Blue color theme throughout (border, icon, ring, label)

**Expected Result:** All blue indicators visible and correctly styled

### Test 4: Free Hit Chip Display (Green)
**Steps:**
1. Navigate to `/history` page
2. Locate a gameweek where Free Hit was used
3. Verify visual indicators:
   - [ ] Green circular badge in top-right corner of GW card
   - [ ] Rotate icon (↻) visible in badge
   - [ ] Green ring around the entire GW card
   - [ ] "FH" label displayed next to "GW X" text
   - [ ] Green color theme throughout (border, icon, ring, label)

**Expected Result:** All green indicators visible and correctly styled

### Test 5: No Chip Display
**Steps:**
1. Navigate to `/history` page
2. Locate gameweeks where no chips were used (majority of GWs)
3. Verify:
   - [ ] No chip badge visible
   - [ ] No ring around card (unless selected)
   - [ ] No chip label next to GW number
   - [ ] Normal card styling applies

**Expected Result:** Cards without chips appear normal, no chip indicators

### Test 6: Chip Badge Tooltip
**Steps:**
1. Navigate to `/history` page
2. Hover over chip badge on any gameweek with a chip
3. Verify tooltip displays:
   - [ ] "Wildcard" for WC badge
   - [ ] "Triple Captain" for TC badge
   - [ ] "Bench Boost" for BB badge
   - [ ] "Free Hit" for FH badge

**Expected Result:** Correct chip name appears in tooltip

### Test 7: Chip Data Loading
**Steps:**
1. Open Browser Developer Tools (F12)
2. Navigate to `/history` page
3. Check Network tab for API calls:
   - [ ] Multiple requests to `/api/fpl/entry/{entryId}/event/{gw}/picks`
   - [ ] Responses include `active_chip` field
   - [ ] No failed requests
4. Check Console tab:
   - [ ] No errors related to chip fetching
   - [ ] No "active_chip is undefined" errors

**Expected Result:** Chip data loads successfully from API

### Test 8: Multiple Chips Across Season
**Steps:**
1. Navigate to `/history` page
2. Scroll through entire gameweek timeline
3. Count chips used:
   - [ ] Wildcard appears once (usually early season)
   - [ ] Triple Captain, Bench Boost, Free Hit appear as used
   - [ ] Each chip type has correct color coding
   - [ ] No duplicate chip badges on same gameweek

**Expected Result:** All chips correctly identified and displayed

### Test 9: Selected Gameweek with Chip
**Steps:**
1. Navigate to `/history` page
2. Click on a gameweek card that has a chip used
3. Verify:
   - [ ] Selected state (orange border/background) visible
   - [ ] Chip badge still visible (not hidden by selection)
   - [ ] Chip ring still visible (may overlap with selection styling)
   - [ ] Chip label still visible

**Expected Result:** Chip indicators remain visible when gameweek is selected

### Test 10: Responsive Design
**Steps:**
1. Navigate to `/history` page
2. Test on different screen sizes:
   - [ ] Mobile (375px width): Chip badge visible, not cut off
   - [ ] Tablet (768px width): Chip badge visible, proper sizing
   - [ ] Desktop (1920px width): Chip badge visible, proper spacing
3. Verify chip badge:
   - [ ] Not overlapping with other elements
   - [ ] Properly sized (not too large/small)
   - [ ] Icon clearly visible

**Expected Result:** Chip badges display correctly on all screen sizes

## Debug Checklist

If chips are not displaying:

1. **Check API Response:**
   - Open Network tab in DevTools
   - Find `/api/fpl/entry/{entryId}/event/{gw}/picks` requests
   - Verify `active_chip` field exists in response
   - Check if `active_chip` is `null` or a valid chip name

2. **Check Console Errors:**
   - Look for JavaScript errors
   - Check for React rendering errors
   - Verify no undefined variable errors

3. **Check State:**
   - Add `console.log(chipUsage)` in component
   - Verify `chipUsage` Map contains expected data
   - Check if `getChipInfo()` returns correct values

4. **Check CSS Classes:**
   - Inspect chip badge element
   - Verify Tailwind classes are applied correctly
   - Check if ring classes are present on card

5. **Check Icon Imports:**
   - Verify all icons (Sparkles, Zap, Layers, RotateCcw) are imported
   - Check if icon components render correctly

## Known Issues to Watch For

1. **Tailwind Dynamic Classes:** Ring colors must use full class names, not template literals
2. **Icon Aliasing:** Ensure Zap icon is imported correctly (not ZapIcon alias)
3. **State Updates:** Chip usage Map must be set before rendering
4. **Null Checks:** Always check if `chipInfo` exists before rendering badge

## Success Criteria

✅ All chip types display with correct colors and icons
✅ Chip badges appear in correct position (top-right)
✅ Chip rings are visible around cards
✅ Chip labels appear next to GW numbers
✅ Tooltips show correct chip names
✅ No console errors
✅ Responsive design works correctly
✅ Performance is acceptable (no lag when rendering many gameweeks)

