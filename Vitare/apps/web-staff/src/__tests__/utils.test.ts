import { describe, it, expect } from 'vitest';

// Test utilities used in web-staff
describe('Web Staff Utils', () => {
  it('should format timestamp correctly', () => {
    const formatTimestamp = (value: string): string => {
      return new Date(value).toLocaleString('pt-BR');
    };
    
    const result = formatTimestamp('2024-01-15T10:30:00Z');
    expect(result).toContain('15/01/2024');
  });

  it('should format CPF correctly', () => {
    const formatCpf = (value: string | null | undefined): string => {
      if (!value) return 'CPF não informado';
      const digits = value.replace(/\D/g, '');
      if (digits.length !== 11) return value;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    };

    expect(formatCpf('12345678901')).toBe('123.456.789-01');
    expect(formatCpf('123.456.789-01')).toBe('123.456.789-01');
    expect(formatCpf(null)).toBe('CPF não informado');
    expect(formatCpf('')).toBe('CPF não informado');
    expect(formatCpf('123')).toBe('123');
  });

  it('should get status badge correctly', () => {
    const getStatusBadge = (status: string): string => {
      switch (status) {
        case 'TRIGGERED': return 'ACIONADO';
        case 'NOTIFIED': return 'NOTIFICADO';
        case 'ACCEPTED': return 'ACEITO';
        case 'RESOLVED': return 'ENCERRADO';
        default: return status;
      }
    };

    expect(getStatusBadge('TRIGGERED')).toBe('ACIONADO');
    expect(getStatusBadge('NOTIFIED')).toBe('NOTIFICADO');
    expect(getStatusBadge('ACCEPTED')).toBe('ACEITO');
    expect(getStatusBadge('RESOLVED')).toBe('ENCERRADO');
    expect(getStatusBadge('UNKNOWN')).toBe('UNKNOWN');
  });
});
