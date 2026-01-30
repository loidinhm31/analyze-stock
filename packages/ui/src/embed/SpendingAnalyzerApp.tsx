import { isTauri } from "@/utils/platform";
import { isOpenedFromDesktop } from "@/utils/platform";
import {
  TauriTransactionAdapter,
  TauriCategoryAdapter,
  TauriAccountAdapter,
  TauriStatisticsAdapter,
  HttpTransactionAdapter,
  HttpCategoryAdapter,
  HttpAccountAdapter,
  HttpStatisticsAdapter,
  IndexedDBTransactionAdapter,
  IndexedDBCategoryAdapter,
  IndexedDBAccountAdapter,
  IndexedDBStatisticsAdapter,
  setTransactionService,
  setCategoryService,
  setAccountService,
  setStatisticsService,
} from "@/adapters";
import { useEffect, useMemo } from "react";
import { BrowserRouter, useRoutes, Navigate, useLocation } from "react-router-dom";
import { RootLayout } from "@/components/templates/RootLayout";
import { DashboardPage } from "@/components/pages/DashboardPage";
import { AddTransactionPage } from "@/components/pages/AddTransactionPage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { InitialSetupPage } from "@/components/pages/InitialSetupPage";
import { ReportsPage } from "@/components/pages/ReportsPage";

export interface SpendingAnalyzerAppProps {
  embedded?: boolean;
  useRouter?: boolean;
  basePath?: string;
  className?: string;
}

function RedirectToDashboard() {
  const location = useLocation();
  return <Navigate to={`/dashboard${location.search}`} replace />;
}

function AppRoutes() {
  return useRoutes([
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <RedirectToDashboard /> },
        { path: "dashboard", element: <DashboardPage /> },
        { path: "add", element: <AddTransactionPage /> },
        { path: "settings", element: <SettingsPage /> },
        { path: "setup", element: <InitialSetupPage /> },
        { path: "reports", element: <ReportsPage /> },
      ],
    },
  ]);
}

export function SpendingAnalyzerApp({
  embedded = false,
  useRouter = true,
  basePath,
  className,
}: SpendingAnalyzerAppProps) {
  // Detect platform and create appropriate adapters
  const services = useMemo(() => {
    if (isTauri()) {
      return {
        transaction: new TauriTransactionAdapter(),
        category: new TauriCategoryAdapter(),
        account: new TauriAccountAdapter(),
        statistics: new TauriStatisticsAdapter(),
      };
    }

    if (isOpenedFromDesktop()) {
      return {
        transaction: new HttpTransactionAdapter(),
        category: new HttpCategoryAdapter(),
        account: new HttpAccountAdapter(),
        statistics: new HttpStatisticsAdapter(),
      };
    }

    // Standalone web mode — use IndexedDB
    return {
      transaction: new IndexedDBTransactionAdapter(),
      category: new IndexedDBCategoryAdapter(),
      account: new IndexedDBAccountAdapter(),
      statistics: new IndexedDBStatisticsAdapter(),
    };
  }, []);

  // Inject services into ServiceFactory singletons
  useEffect(() => {
    setTransactionService(services.transaction);
    setCategoryService(services.category);
    setAccountService(services.account);
    setStatisticsService(services.statistics);
  }, [services]);

  const content = <AppRoutes />;

  return (
    <div className={className}>
      {useRouter ? (
        <BrowserRouter basename={basePath}>{content}</BrowserRouter>
      ) : (
        content
      )}
    </div>
  );
}
