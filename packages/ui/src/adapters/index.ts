// Re-export interfaces
export type {
  ITransactionService,
  ICategoryService,
  IAccountService,
  IStatisticsService,
} from "./interfaces";

// Re-export factory functions and setters
export {
  getTransactionService,
  getCategoryService,
  getAccountService,
  getStatisticsService,
  getAllServices,
  resetServices,
  setTransactionService,
  setCategoryService,
  setAccountService,
  setStatisticsService,
} from "./ServiceFactory";

// Re-export Tauri adapters
export {
  TauriTransactionAdapter,
  TauriCategoryAdapter,
  TauriAccountAdapter,
  TauriStatisticsAdapter,
} from "./tauri";

// Re-export HTTP adapters
export {
  HttpAdapter,
  HttpTransactionAdapter,
  HttpCategoryAdapter,
  HttpAccountAdapter,
  HttpStatisticsAdapter,
} from "./http";

// Re-export IndexedDB adapters
export {
  IndexedDBTransactionAdapter,
  IndexedDBCategoryAdapter,
  IndexedDBAccountAdapter,
  IndexedDBStatisticsAdapter,
} from "./web";
