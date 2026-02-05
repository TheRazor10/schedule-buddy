/**
 * Shift utility functions for calculating hours and determining extended shifts
 */

/**
 * Calculate the duration of a shift in hours from start and end times
 * Handles overnight shifts (e.g., 19:00 - 06:00)
 */
export function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  let durationMinutes: number;
  
  if (endMinutes > startMinutes) {
    // Same day shift (e.g., 08:00 - 16:00)
    durationMinutes = endMinutes - startMinutes;
  } else {
    // Overnight shift (e.g., 19:00 - 06:00)
    durationMinutes = (24 * 60 - startMinutes) + endMinutes;
  }
  
  return durationMinutes / 60;
}

/**
 * Determine if a shift is considered an "extended shift" (≥10 hours)
 * Extended shifts have stricter scheduling rules:
 * - Maximum 2 consecutive days
 * - Mandatory 1-2 day rest after
 */
export function isExtendedShift(startTime: string, endTime: string): boolean {
  const hours = calculateShiftHours(startTime, endTime);
  return hours >= 10;
}

/**
 * Get shift duration display string
 */
export function formatShiftDuration(startTime: string, endTime: string): string {
  const hours = calculateShiftHours(startTime, endTime);
  return `${hours}ч`;
}

/**
 * Calculate net shift hours (raw duration minus break time)
 * This is the actual working time that counts toward contract hours
 */
export function calculateNetShiftHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const rawHours = calculateShiftHours(startTime, endTime);
  return rawHours - (breakMinutes / 60);
}

/**
 * Calculate overtime hours (net shift hours - contract hours)
 * Returns 0 if no overtime
 */
export function calculateOvertime(shiftHours: number, contractHours: number): number {
  return Math.max(0, shiftHours - contractHours);
}

/**
 * Format time range for display (e.g., "19:00 - 06:00")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}
