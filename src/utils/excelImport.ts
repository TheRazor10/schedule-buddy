import * as XLSX from 'xlsx';
import { Employee, Position } from '@/types/schedule';
import { validateEGN, extractBirthDateFromEGN, isMinorFromEGN } from '@/utils/egnUtils';

interface ImportResult {
  employees: Employee[];
  errors: string[];
  skipped: number;
}

const VALID_CONTRACT_HOURS = [2, 4, 6, 7, 8, 10, 12] as const;

function findClosestContractHours(hours: number): 2 | 4 | 6 | 7 | 8 | 10 | 12 {
  let closest = VALID_CONTRACT_HOURS[0];
  let minDiff = Math.abs(hours - closest);

  for (const valid of VALID_CONTRACT_HOURS) {
    const diff = Math.abs(hours - valid);
    if (diff < minDiff) {
      minDiff = diff;
      closest = valid;
    }
  }

  return closest;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  // First word = firstName, rest = lastName
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function findColumnIndex(headerRow: unknown[], patterns: string[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const cellValue = String(headerRow[i] || '').toLowerCase().trim();
    for (const pattern of patterns) {
      if (cellValue.includes(pattern.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

export function parseEmployeesFromExcel(
  file: File,
  existingPositions: Position[],
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          resolve({ employees: [], errors: ['Файлът е празен или няма данни'], skipped: 0 });
          return;
        }

        // Search for each column independently across the first 10 rows.
        // This handles multi-row headers with merged group cells like
        // "Лични данни" / "Данни за назначение" spanning above the actual columns.
        let nameCol = -1, nameRow = -1;
        let egnCol = -1, egnRow = -1;
        let hoursCol = -1, hoursRow = -1;
        let positionCol = -1, positionRow = -1;

        const maxScan = Math.min(rows.length, 10);
        for (let i = 0; i < maxScan; i++) {
          const row = rows[i];
          if (!row) continue;

          if (nameCol === -1) {
            const idx = findColumnIndex(row, ['име, презиме', 'име', 'имена', 'name']);
            if (idx !== -1) { nameCol = idx; nameRow = i; }
          }
          if (egnCol === -1) {
            const idx = findColumnIndex(row, ['егн', 'egn']);
            if (idx !== -1) { egnCol = idx; egnRow = i; }
          }
          if (hoursCol === -1) {
            const idx = findColumnIndex(row, ['e-mail', 'email', 'часове', 'hours']);
            if (idx !== -1) { hoursCol = idx; hoursRow = i; }
          }
          if (positionCol === -1) {
            const idx = findColumnIndex(row, ['длъжност', 'позиция', 'position']);
            if (idx !== -1) { positionCol = idx; positionRow = i; }
          }
        }

        if (nameCol === -1 || egnCol === -1) {
          resolve({
            employees: [],
            errors: ['Не са намерени задължителните колони "Име" и "ЕГН"'],
            skipped: 0,
          });
          return;
        }

        // Data starts after the last header row found
        const headerRowIndex = Math.max(nameRow, egnRow, hoursRow, positionRow);

        const employees: Employee[] = [];
        const errors: string[] = [];
        let skipped = 0;

        // Process data rows (after header)
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(cell => !cell)) continue; // Skip empty rows

          const fullName = String(row[nameCol] || '').trim();
          const egnValue = String(row[egnCol] || '').trim().replace(/\D/g, '');
          const hoursValue = hoursCol >= 0 ? Number(row[hoursCol]) || 0 : 8;
          const positionName = positionCol >= 0 ? String(row[positionCol] || '').trim() : '';

          // Skip rows without name or EGN
          if (!fullName || !egnValue) {
            if (fullName || egnValue) {
              skipped++;
            }
            continue;
          }

          // Validate EGN
          const egnValidation = validateEGN(egnValue);
          if (!egnValidation.valid) {
            errors.push(`Ред ${i + 1}: "${fullName}" — ${egnValidation.error}`);
            skipped++;
            continue;
          }

          // Split name
          const { firstName, lastName } = splitName(fullName);

          // Find or note the position
          let positionId = '';
          if (positionName) {
            const existingPos = existingPositions.find(
              p => p.name.toLowerCase() === positionName.toLowerCase()
            );
            if (existingPos) {
              positionId = existingPos.id;
            }
            // If position doesn't exist, leave empty — user can assign manually
          }

          // Contract hours
          const contractHours = hoursValue > 0
            ? findClosestContractHours(hoursValue)
            : 8;

          // Check if minor and adjust hours
          const isMinor = isMinorFromEGN(egnValue, new Date(2026, 0, 1));
          const finalContractHours = isMinor && contractHours > 7
            ? 7 as const
            : contractHours;

          const birthDate = extractBirthDateFromEGN(egnValue);

          employees.push({
            id: crypto.randomUUID(),
            firstName,
            lastName,
            egn: egnValue,
            positionId,
            contractHours: finalContractHours,
            isMinor,
            birthDate: birthDate || new Date(),
          });
        }

        resolve({ employees, errors, skipped });
      } catch (err) {
        reject(new Error('Грешка при четене на файла'));
      }
    };

    reader.onerror = () => reject(new Error('Грешка при отваряне на файла'));
    reader.readAsArrayBuffer(file);
  });
}
