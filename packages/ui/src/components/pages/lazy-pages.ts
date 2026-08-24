// Route-owned lazy entrypoint. Keep the public pages barrel out of AppShell's
// import graph while allowing Rollup to share page dependencies in one nested
// route chunk. Per-page splitting is deferred until a measured Phase 05
// boundary can reduce bytes without increasing route requests.
export { DashboardPage } from "./DashboardPage";
export { AddTransactionPage } from "./AddTransactionPage";
export { SettingsPage } from "./SettingsPage";
export { InitialSetupPage } from "./InitialSetupPage";
export { ReportsPage } from "./ReportsPage";
export { TransactionPage } from "./TransactionPage";
export { CategorySetupPage } from "./CategorySetupPage";
export { DebtPage } from "./DebtPage";
export { BudgetPage } from "./BudgetPage";
