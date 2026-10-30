import { describe, it, expect } from 'vitest';

// Test formatting functions
describe('Web Staff Formatters', () => {
  it('should format coordinates correctly', () => {
    const formatCoords = (lat: number, lon: number): string => {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    };

    expect(formatCoords(-23.5505, -46.6333)).toBe('-23.5505, -46.6333');
    expect(formatCoords(0, 0)).toBe('0.0000, 0.0000');
  });

  it('should determine action buttons correctly', () => {
    const canAccept = (status: string) => status === 'TRIGGERED' || status === 'NOTIFIED';
    const canResolve = (status: string) => status === 'ACCEPTED';

    expect(canAccept('TRIGGERED')).toBe(true);
    expect(canAccept('NOTIFIED')).toBe(true);
    expect(canAccept('ACCEPTED')).toBe(false);
    expect(canAccept('RESOLVED')).toBe(false);

    expect(canResolve('ACCEPTED')).toBe(true);
    expect(canResolve('TRIGGERED')).toBe(false);
    expect(canResolve('NOTIFIED')).toBe(false);
    expect(canResolve('RESOLVED')).toBe(false);
  });

  it('should format timestamps for display', () => {
    const formatTimestamp = (value: string): string => {
      return new Date(value).toLocaleString('pt-BR');
    };

    const result = formatTimestamp('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
