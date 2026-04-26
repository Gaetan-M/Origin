import { DatePrecision } from '@origin/shared-types';

export function formatDate(
  date: string | null | undefined,
  precision: DatePrecision,
  yearApproximate?: number | null,
  dateText?: string | null,
): string {
  if (dateText) return dateText;

  switch (precision) {
    case DatePrecision.EXACT:
      if (!date) return '';
      return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));

    case DatePrecision.MONTH:
      if (!date) return '';
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(date));

    case DatePrecision.YEAR:
      if (yearApproximate) return String(yearApproximate);
      if (date) return String(new Date(date).getFullYear());
      return '';

    case DatePrecision.DECADE:
      if (yearApproximate) return `${Math.floor(yearApproximate / 10) * 10}x`;
      if (date) return `${Math.floor(new Date(date).getFullYear() / 10) * 10}x`;
      return '';

    case DatePrecision.APPROXIMATE:
      if (yearApproximate) return `vers ${yearApproximate}`;
      if (date) return `vers ${new Date(date).getFullYear()}`;
      return '';

    case DatePrecision.UNKNOWN:
    default:
      return '';
  }
}
