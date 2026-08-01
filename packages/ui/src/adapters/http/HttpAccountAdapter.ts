import { HttpAdapter } from "./HttpAdapter";
import type { IAccountService } from "@money-insight/ui/adapters/factory/interfaces";
import type {
  Account,
  CreditCardPaymentConfirmationInput,
  CreditCardPaymentConfirmationResult,
  NewAccount,
} from "@money-insight/ui/types";

/**
 * HTTP adapter for account operations
 */
export class HttpAccountAdapter extends HttpAdapter implements IAccountService {
  async getAccounts(): Promise<Account[]> {
    return this.get<Account[]>("/accounts");
  }

  async addAccount(account: NewAccount): Promise<Account> {
    return this.post<Account>("/accounts", account);
  }

  async updateAccount(account: Account): Promise<Account> {
    return this.put<Account>("/accounts", account);
  }

  async deleteAccount(id: string): Promise<void> {
    return this.delete<void>(`/accounts/${id}`);
  }

  async confirmCreditCardPayment(
    _input: CreditCardPaymentConfirmationInput,
  ): Promise<CreditCardPaymentConfirmationResult> {
    throw new Error(
      "Credit card payment confirmation requires the IndexedDB account adapter",
    );
  }
}
