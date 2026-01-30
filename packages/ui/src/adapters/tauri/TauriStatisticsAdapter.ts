import { invoke } from "@tauri-apps/api/core";
import type { IStatisticsService } from "@/adapters/interfaces";
import type { Statistics, TransactionFilter } from "@/types";

/**
 * Tauri adapter for statistics operations using invoke() calls
 */
export class TauriStatisticsAdapter implements IStatisticsService {
  async getStatistics(filter?: TransactionFilter): Promise<Statistics> {
    return invoke("get_statistics", { filter });
  }
}
