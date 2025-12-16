const DEFAULT_LOCALE = 'en-US';

export type FormatNumberOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export const formatNumber = (
  value: number | string | null | undefined,
  options?: FormatNumberOptions,
): string => {
  if (value == null || value === '') return '';

  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return '';

  const locale = options?.locale || DEFAULT_LOCALE;
  const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numeric);
};

export const formatAmount = (value: number | string | null | undefined): string => {
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatMoney = (
  value: number | string | null | undefined,
  currencyLabel: string = 'RD$',
): string => {
  const amount = formatAmount(value);
  if (!amount) return '';
  return `${currencyLabel} ${amount}`;
};
