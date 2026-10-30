const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EPOCH_DATE = '1970-01-01';

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function timeStringToDate(time: string): Date {
  if (!isValidTimeString(time)) {
    throw new Error(`Formato de horário inválido: "${time}". Use HH:mm.`);
  }
  return new Date(`${EPOCH_DATE}T${time}:00.000Z`);
}

export function dateToTimeString(date: Date): string {
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const mm = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function timeStringsToDates(times: string[]): Date[] {
  return times.map(timeStringToDate);
}

export function datesToTimeStrings(dates: Date[]): string[] {
  return dates.map(dateToTimeString);
}
