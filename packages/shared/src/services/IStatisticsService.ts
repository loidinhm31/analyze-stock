import type { Statistics, TransactionFilter } from "../types";

export interface IStatisticsService {
  getStatistics(filter?: TransactionFilter): Promise<Statistics>;
}
