import type { Account } from "@/types";

/**
 * Account service interface
 */
export interface IAccountService {
  /**
   * Get all accounts
   */
  getAccounts(): Promise<Account[]>;
}
