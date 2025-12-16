export const formatDateEsDO = (
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) => {
  if (value == null || value === '') return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    return d.toLocaleDateString('es-DO', options);
  } catch {
    return typeof value === 'string' ? value : '';
  }
};
