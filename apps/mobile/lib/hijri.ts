// ============================================
// Hijri (Islamic) Date Conversion Utility
// Converts Gregorian dates to Hijri calendar
// ============================================

export function toHijri(date: Date): { day: number; month: number; year: number; monthName: string } {
  const HIJRI_MONTHS = [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Shaban',
    'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'
  ];
  
  const jd = Math.floor((1461 * (date.getFullYear() + 4800 + Math.floor((date.getMonth() + 1 - 14) / 12))) / 4) +
    Math.floor((367 * (date.getMonth() + 1 - 2 - 12 * Math.floor((date.getMonth() + 1 - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((date.getFullYear() + 4900 + Math.floor((date.getMonth() + 1 - 14) / 12)) / 100)) / 4) +
    date.getDate() - 32075;
  
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remaining = l - 10631 * n + 354;
  const j = Math.floor((10985 - remaining) / 5316) * Math.floor((50 * remaining) / 17719) +
    Math.floor(remaining / 5670) * Math.floor((43 * remaining) / 15238);
  const remAfterJ = remaining - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * remAfterJ) / 709);
  const day = remAfterJ - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  
  return { day, month, year, monthName: HIJRI_MONTHS[month - 1] || '' };
}
