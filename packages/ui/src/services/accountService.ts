import { getAccountService } from "@money-insight/ui/adapters";
import type {
  Account,
  CreditCardPaymentConfirmationInput,
  CreditCardPaymentConfirmationResult,
  NewAccount,
} from "@money-insight/ui/types";

export async function getAccounts(): Promise<Account[]> {
  return getAccountService().getAccounts();
}

export async function addAccount(account: NewAccount): Promise<Account> {
  return getAccountService().addAccount(account);
}

export async function updateAccount(account: Account): Promise<Account> {
  return getAccountService().updateAccount(account);
}

export async function deleteAccount(id: string): Promise<void> {
  return getAccountService().deleteAccount(id);
}

export async function confirmCreditCardPayment(
  input: CreditCardPaymentConfirmationInput,
): Promise<CreditCardPaymentConfirmationResult> {
  return getAccountService().confirmCreditCardPayment(input);
}
