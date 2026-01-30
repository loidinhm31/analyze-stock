import type { Account } from "../types";

export interface IAccountService {
  getAccounts(): Promise<Account[]>;
}
