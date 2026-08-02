import { getLocalIsoDate } from "./credit-card-payment-reminder";

export type CreditCardPaymentDueStatus =
  | "upcoming"
  | "overdue"
  | "confirmed"
  | "not-configured";

export interface CreditCardPaymentStatusInput {
  nextPaymentDueDate?: string;
  lastPaymentConfirmedDueDate?: string;
  todayIso?: string;
}

/**
 * Compares date-only ISO values, avoiding locale-dependent rendered strings.
 */
export function getCreditCardPaymentDueStatus({
  nextPaymentDueDate,
  lastPaymentConfirmedDueDate,
  todayIso = getLocalIsoDate(),
}: CreditCardPaymentStatusInput): CreditCardPaymentDueStatus {
  if (!nextPaymentDueDate) return "not-configured";
  if (lastPaymentConfirmedDueDate === nextPaymentDueDate) return "confirmed";
  return nextPaymentDueDate < todayIso ? "overdue" : "upcoming";
}

export function getCreditCardPaymentDueStatusLabel(
  status: CreditCardPaymentDueStatus,
): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "confirmed":
      return "Confirmed";
    case "upcoming":
      return "Upcoming";
    default:
      return "Not configured";
  }
}
