// Bulgarian labor law break time calculations

/**
 * Get break duration based on contract hours (Bulgarian labor law)
 * - 6+ hours: minimum 30 minutes
 * - 8 hours: typically 1 hour
 */
export function getBreakDuration(contractHours: number): number {
  if (contractHours >= 8) return 1; // 1 hour break
  if (contractHours >= 6) return 0.5; // 30 min break
  return 0; // No mandatory break for shorter contracts
}

/**
 * Get total presence time (work hours + break)
 * e.g., 8h contract = 9h presence (8h work + 1h break)
 */
export function getTotalPresenceHours(contractHours: number): number {
  return contractHours + getBreakDuration(contractHours);
}

/**
 * Format presence time as a string
 * e.g., "8ч + 1ч почивка = 9ч"
 */
export function formatPresenceTime(contractHours: number): string {
  const breakTime = getBreakDuration(contractHours);
  if (breakTime === 0) {
    return `${contractHours}ч`;
  }
  const total = contractHours + breakTime;
  const breakStr = breakTime === 1 ? '1ч' : '30мин';
  return `${contractHours}ч + ${breakStr} почивка = ${total}ч`;
}

/**
 * Calculate example work span based on operating hours and contract
 * e.g., start 09:00, 8h contract with 1h break → 09:00-18:00
 */
export function calculateWorkSpan(
  startTime: string,
  contractHours: number
): { start: string; end: string } {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalPresence = getTotalPresenceHours(contractHours);
  
  const endHours = hours + Math.floor(totalPresence);
  const endMinutes = minutes + (totalPresence % 1) * 60;
  
  const finalHours = endHours + Math.floor(endMinutes / 60);
  const finalMinutes = endMinutes % 60;
  
  return {
    start: startTime,
    end: `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`,
  };
}
