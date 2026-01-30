import { isTauri } from "@/utils/platform";

// Interfaces
import type {
  ITransactionService,
  ICategoryService,
  IAccountService,
  IStatisticsService,
} from "./interfaces";

// Tauri Adapters
import {
  TauriTransactionAdapter,
  TauriCategoryAdapter,
  TauriAccountAdapter,
  TauriStatisticsAdapter,
} from "./tauri";

// HTTP Adapters (browser debug mode via desktop server)
import {
  HttpTransactionAdapter,
  HttpCategoryAdapter,
  HttpAccountAdapter,
  HttpStatisticsAdapter,
} from "./http";

// IndexedDB Adapters (standalone web mode)
import {
  IndexedDBTransactionAdapter,
  IndexedDBCategoryAdapter,
  IndexedDBAccountAdapter,
  IndexedDBStatisticsAdapter,
} from "./web";

// Singleton instances (lazy initialized or injected via setters)
let transactionService: ITransactionService | null = null;
let categoryService: ICategoryService | null = null;
let accountService: IAccountService | null = null;
let statisticsService: IStatisticsService | null = null;

// Setter functions for dependency injection from embed component
export const setTransactionService = (svc: ITransactionService): void => {
  transactionService = svc;
};

export const setCategoryService = (svc: ICategoryService): void => {
  categoryService = svc;
};

export const setAccountService = (svc: IAccountService): void => {
  accountService = svc;
};

export const setStatisticsService = (svc: IStatisticsService): void => {
  statisticsService = svc;
};

/**
 * Auto-detect platform and create appropriate adapter.
 * Priority: Tauri > HTTP (desktop browser mode) > IndexedDB (standalone web)
 */
function autoCreateTransactionService(): ITransactionService {
  if (isTauri()) return new TauriTransactionAdapter();
  // Default to IndexedDB for standalone web
  return new IndexedDBTransactionAdapter();
}

function autoCreateCategoryService(): ICategoryService {
  if (isTauri()) return new TauriCategoryAdapter();
  return new IndexedDBCategoryAdapter();
}

function autoCreateAccountService(): IAccountService {
  if (isTauri()) return new TauriAccountAdapter();
  return new IndexedDBAccountAdapter();
}

function autoCreateStatisticsService(): IStatisticsService {
  if (isTauri()) return new TauriStatisticsAdapter();
  return new IndexedDBStatisticsAdapter();
}

export const getTransactionService = (): ITransactionService => {
  if (!transactionService) {
    transactionService = autoCreateTransactionService();
  }
  return transactionService;
};

export const getCategoryService = (): ICategoryService => {
  if (!categoryService) {
    categoryService = autoCreateCategoryService();
  }
  return categoryService;
};

export const getAccountService = (): IAccountService => {
  if (!accountService) {
    accountService = autoCreateAccountService();
  }
  return accountService;
};

export const getStatisticsService = (): IStatisticsService => {
  if (!statisticsService) {
    statisticsService = autoCreateStatisticsService();
  }
  return statisticsService;
};

export const getAllServices = () => ({
  transaction: getTransactionService(),
  category: getCategoryService(),
  account: getAccountService(),
  statistics: getStatisticsService(),
});

export const resetServices = (): void => {
  transactionService = null;
  categoryService = null;
  accountService = null;
  statisticsService = null;
};
