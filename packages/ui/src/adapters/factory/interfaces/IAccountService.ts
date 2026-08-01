import type {
  Account,
  CreditCardPaymentConfirmationInput,
  CreditCardPaymentConfirmationResult,
  NewAccount,
} from "@money-insight/ui/types";

/**
 * Account service interface
 */
export interface IAccountService {
  /**
   * Get all accounts
   */
  getAccounts(): Promise<Account[]>;

  /**
   * Add a new account
   */
  addAccount(account: NewAccount): Promise<Account>;

  /**
   * Update an existing account
   */
  updateAccount(account: Account): Promise<Account>;

  /**
   * Delete an account
   */
  deleteAccount(id: string): Promise<void>;

  confirmCreditCardPayment(
    input: CreditCardPaymentConfirmationInput,
  ): Promise<CreditCardPaymentConfirmationResult>;
}
