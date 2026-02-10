// Bulgarian EGN (ЕГН) and ЛНЧ validation and parsing utilities

import type { IdType } from '@/types/schedule';

/**
 * Validates a Bulgarian EGN (Единен граждански номер)
 * EGN format: YYMMDDXXXC where:
 * - YY: Year (last 2 digits)
 * - MM: Month (01-12, +20 for 1800s, +40 for 2000s)
 * - DD: Day (01-31)
 * - XXX: Birth order number
 * - C: Check digit
 */
export function validateEGN(egn: string): { valid: boolean; error?: string } {
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(egn)) {
    return { valid: false, error: 'ЕГН трябва да бъде точно 10 цифри' };
  }

  const weights = [2, 4, 8, 5, 10, 9, 7, 3, 6];
  const digits = egn.split('').map(Number);

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  const expectedCheckDigit = sum % 11 === 10 ? 0 : sum % 11;

  if (digits[9] !== expectedCheckDigit) {
    return { valid: false, error: 'Невалидна контролна цифра' };
  }

  // Validate date
  const birthDate = extractBirthDateFromEGN(egn);
  if (!birthDate || isNaN(birthDate.getTime())) {
    return { valid: false, error: 'Невалидна дата на раждане' };
  }

  return { valid: true };
}

/**
 * Validates a Bulgarian ЛНЧ (Личен номер на чужденец)
 * ЛНЧ is 10 digits, uses the same checksum as EGN but does NOT encode birth date.
 */
export function validateLNCH(lnch: string): { valid: boolean; error?: string } {
  if (!/^\d{10}$/.test(lnch)) {
    return { valid: false, error: 'ЛНЧ трябва да бъде точно 10 цифри' };
  }

  const weights = [21, 19, 17, 13, 11, 9, 7, 3, 1];
  const digits = lnch.split('').map(Number);

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  const expectedCheckDigit = sum % 10;

  if (digits[9] !== expectedCheckDigit) {
    return { valid: false, error: 'Невалидна контролна цифра' };
  }

  return { valid: true };
}

/**
 * Validates an ID based on its type
 */
export function validateId(id: string, idType: IdType): { valid: boolean; error?: string } {
  if (!id.trim()) {
    return { valid: false, error: 'Полето е задължително' };
  }

  switch (idType) {
    case 'egn':
      return validateEGN(id);
    case 'lnch':
      return validateLNCH(id);
    case 'other':
      return id.trim().length >= 1
        ? { valid: true }
        : { valid: false, error: 'Въведете идентификационен номер' };
  }
}

/**
 * Extracts birth date from EGN
 */
export function extractBirthDateFromEGN(egn: string): Date | null {
  if (egn.length !== 10) return null;

  let year = parseInt(egn.substring(0, 2), 10);
  let month = parseInt(egn.substring(2, 4), 10);
  const day = parseInt(egn.substring(4, 6), 10);

  // Determine century based on month encoding
  if (month > 40) {
    // Born in 2000s
    year += 2000;
    month -= 40;
  } else if (month > 20) {
    // Born in 1800s
    year += 1800;
    month -= 20;
  } else {
    // Born in 1900s
    year += 1900;
  }

  const date = new Date(year, month - 1, day);
  
  // Validate the date is real
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Calculate age from EGN as of a specific date
 */
export function calculateAgeFromEGN(egn: string, asOfDate: Date = new Date()): number | null {
  const birthDate = extractBirthDateFromEGN(egn);
  if (!birthDate) return null;

  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = asOfDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && asOfDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if person is a minor (under 18) based on EGN
 */
export function isMinorFromEGN(egn: string, asOfDate: Date = new Date()): boolean {
  const age = calculateAgeFromEGN(egn, asOfDate);
  return age !== null && age < 18;
}

/**
 * Calculate age from a birth date as of a specific date
 */
export function calculateAgeFromBirthDate(birthDate: Date, asOfDate: Date = new Date()): number {
  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = asOfDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && asOfDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Check if person is a minor (under 18) based on birth date, as of a specific date
 */
export function isMinorFromBirthDate(birthDate: Date, asOfDate: Date = new Date()): boolean {
  return calculateAgeFromBirthDate(birthDate, asOfDate) < 18;
}

/**
 * Get gender from EGN (based on 9th digit - even = male, odd = female)
 */
export function getGenderFromEGN(egn: string): 'male' | 'female' | null {
  if (egn.length !== 10) return null;
  const ninthDigit = parseInt(egn[8], 10);
  return ninthDigit % 2 === 0 ? 'male' : 'female';
}
