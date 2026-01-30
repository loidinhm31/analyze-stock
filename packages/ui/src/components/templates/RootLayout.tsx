import { Outlet } from "react-router-dom";
import { useSpendingStore } from "@/stores/spending-store";
import { BottomNav } from "@/components/molecules";
import { DisconnectedOverlay } from "@/components/organisms";
import { useServerConnection } from "@/hooks/useServerConnection";
import { isWeb, initializeSessionToken } from "@/utils/platform";
import { useEffect } from "react";

/**
 * Root layout component that wraps all pages
 * Handles navigation, server connection status, and global app state
 * IMPORTANT: Initializes session token from URL before any navigation
 */
export function RootLayout() {
  const { transactions, initFromDatabase } = useSpendingStore();
  const { isDisconnected } = useServerConnection();

  // CRITICAL: Initialize session token FIRST, then database
  // This must happen synchronously to avoid race conditions
  useEffect(() => {
    const initialize = async () => {
      // Step 1: For web/browser mode, MUST capture session token first
      if (isWeb()) {
        const token = initializeSessionToken();
        if (!token) {
          console.error("[RootLayout] ❌ Failed to initialize session token");
          console.error(
            "[RootLayout] Database initialization will fail in browser mode",
          );
          // Still try to init database in case we're in Tauri mode
        }
      }

      // Step 2: Now safe to initialize database (session token is available)
      try {
        console.log("[RootLayout] Initializing database...");
        await initFromDatabase();
        console.log("[RootLayout] ✅ Database initialized successfully");
      } catch (error) {
        console.error("[RootLayout] ❌ Failed to initialize database:", error);
        // Show user-friendly error message if needed
      }
    };

    initialize();
  }, [initFromDatabase]); // Run when initFromDatabase changes

  // Determine if we should show navigation
  const hasTransactions = transactions.length > 0;

  return (
    <div
      className="min-h-screen font-body antialiased"
      style={{ backgroundColor: "#F8F9FA" }}
    >
      {/* Disconnected overlay - shown when desktop server closes in browser mode */}
      {isWeb() && isDisconnected && <DisconnectedOverlay />}

      {/* Navigation */}
      <BottomNav hasTransactions={hasTransactions} />

      {/* Page content with bottom padding for mobile nav */}
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
