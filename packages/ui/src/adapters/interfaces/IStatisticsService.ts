import type { Statistics, TransactionFilter } from "@/types";

/**
 * Statistics service interface
 */
export interface IStatisticsService {
  /**
   * Get statistics with optional filter
   */
  getStatistics(filter?: TransactionFilter): Promise<Statistics>;
}
