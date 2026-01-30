import { HttpAdapter } from "./HttpAdapter";
import type { IAccountService } from "@/adapters/interfaces";
import type { Account } from "@/types";

/**
 * HTTP adapter for account operations
 */
export class HttpAccountAdapter extends HttpAdapter implements IAccountService {
  async getAccounts(): Promise<Account[]> {
    return this.get<Account[]>("/accounts");
  }
}
