import { invoke } from "@tauri-apps/api/core";
import type { IAccountService } from "@/adapters/interfaces";
import type { Account } from "@/types";

/**
 * Tauri adapter for account operations using invoke() calls
 */
export class TauriAccountAdapter implements IAccountService {
  async getAccounts(): Promise<Account[]> {
    return invoke("get_accounts");
  }
}
