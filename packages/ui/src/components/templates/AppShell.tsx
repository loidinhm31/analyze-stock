import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@money-insight/ui/components/pages";
import { Spinner, ErrorBoundary } from "@money-insight/ui/components/atoms";
import {
  BrowserSyncInitializer,
  Sidebar,
  BottomNavigation,
} from "@money-insight/ui/components/organisms";
import { useAuth, useNav } from "@money-insight/ui/hooks";
import { useSpendingStore } from "@money-insight/ui/stores";
import {
  isOpenedFromDesktop,
  initializeSessionToken,
} from "@money-insight/ui/utils";

const SIDEBAR_COLLAPSED_KEY = "money-insight-sidebar-collapsed";

const DashboardPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.DashboardPage,
  })),
);
const AddTransactionPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.AddTransactionPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.SettingsPage,
  })),
);
const InitialSetupPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.InitialSetupPage,
  })),
);
const ReportsPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.ReportsPage,
  })),
);
const TransactionPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.TransactionPage,
  })),
);
const DebtPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.DebtPage,
  })),
);
const CategorySetupPage = lazy(() =>
  import("@money-insight/ui/components/pages").then((m) => ({
    default: m.CategorySetupPage,
  })),
);

export interface AppShellProps {
  skipAuth?: boolean;
  embedded?: boolean;
  onLogoutRequest?: () => void;
}

export function AppShell({
  skipAuth: skipAuthProp = false,
  onLogoutRequest,
}: AppShellProps) {
  const { to, navigate } = useNav();
  const [localSkipAuth, setLocalSkipAuth] = useState(false);
  const { transactions, initFromDatabase } = useSpendingStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    }
    return false;
  });

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const { isLoading: isAuthLoading, checkAuthStatus } = useAuth({
    skipInitialCheck: skipAuthProp,
  });

  const skipAuth = skipAuthProp || localSkipAuth;

  // CRITICAL: Initialize session token FIRST, then database
  useEffect(() => {
    const initialize = async () => {
      if (isOpenedFromDesktop()) {
        const token = initializeSessionToken();
        if (!token) {
          console.error("[AppShell] Failed to initialize session token");
        }
      }
      try {
        await initFromDatabase();
      } catch (error) {
        console.error("[AppShell] Failed to initialize database:", error);
      }
    };
    initialize();
  }, [initFromDatabase]);

  const handleLogout = () => {
    if (onLogoutRequest) {
      onLogoutRequest();
    }
    setLocalSkipAuth(false);
    checkAuthStatus();
  };

  const hasTransactions = transactions.length > 0;

  if (isAuthLoading && !skipAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg-app)" }}
      >
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <BrowserSyncInitializer>
      <div
        className="min-h-screen font-body antialiased"
        style={{ background: "var(--color-bg-app)" }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          hasTransactions={hasTransactions}
        />

        <div
          className={`transition-all duration-300 pb-24 md:pb-6 ${
            sidebarCollapsed ? "md:ml-16" : "md:ml-64"
          }`}
        >
          <ErrorBoundary>
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center min-h-screen"
                  style={{ background: "var(--color-bg-app)" }}
                >
                  <Spinner className="w-8 h-8 text-primary" />
                </div>
              }
            >
              <main>
                <Routes>
                  <Route
                    index
                    element={<Navigate to={to("/dashboard")} replace />}
                  />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="add" element={<AddTransactionPage />} />
                  <Route
                    path="settings"
                    element={<SettingsPage onLogout={handleLogout} />}
                  />
                  <Route
                    path="login"
                    element={
                      <LoginPage
                        onLoginSuccess={() => {
                          checkAuthStatus();
                          navigate("/dashboard");
                        }}
                        onSkip={() => {
                          setLocalSkipAuth(true);
                          navigate("/dashboard");
                        }}
                      />
                    }
                  />
                  <Route path="setup" element={<InitialSetupPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="transactions" element={<TransactionPage />} />
                  <Route path="debt" element={<DebtPage />} />
                  <Route path="categories" element={<CategorySetupPage />} />
                  <Route
                    path="*"
                    element={<Navigate to={to("/dashboard")} replace />}
                  />
                </Routes>
              </main>
            </Suspense>
          </ErrorBoundary>
        </div>

        <BottomNavigation hasTransactions={hasTransactions} />
      </div>
    </BrowserSyncInitializer>
  );
}
