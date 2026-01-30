import { useState, useEffect } from "react";
import {
  isOpenedFromDesktop,
  getSessionToken,
  WEB_APP_PORT,
} from "@/utils/platform";

interface ServerConnectionState {
  isConnected: boolean;
  isDisconnected: boolean;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Hook to maintain SSE connection to desktop server for shutdown detection.
 * Only active when running in browser mode opened from desktop.
 */
export function useServerConnection() {
  const [state, setState] = useState<ServerConnectionState>({
    isConnected: false,
    isDisconnected: false,
    error: null,
    reconnectAttempts: 0,
  });

  useEffect(() => {
    // Only connect if we're in browser mode opened from desktop
    if (!isOpenedFromDesktop()) {
      return;
    }

    const token = getSessionToken();
    if (!token) {
      setState((prev) => ({ ...prev, error: "No session token" }));
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      const url = `http://localhost:${WEB_APP_PORT}/api/events?token=${encodeURIComponent(token)}`;

      try {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          if (!isMounted) return;
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isDisconnected: false,
            error: null,
            reconnectAttempts: 0,
          }));
        };

        eventSource.addEventListener("connected", () => {
          if (!isMounted) return;
          console.log("[SSE] Connected to desktop server");
        });

        eventSource.addEventListener("ping", () => {
          // Keepalive - no action needed
        });

        eventSource.addEventListener("shutdown", () => {
          if (!isMounted) return;
          console.log("[SSE] Server shutdown notification received");
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isDisconnected: true,
          }));
          eventSource?.close();
        });

        eventSource.onerror = (error) => {
          if (!isMounted) return;
          console.error("[SSE] Connection error:", error);

          eventSource?.close();

          setState((prev) => {
            const newAttempts = prev.reconnectAttempts + 1;

            // If we were connected before and lost connection, it's a disconnect
            if (prev.isConnected) {
              return {
                ...prev,
                isConnected: false,
                isDisconnected: true,
                error: "Connection lost",
                reconnectAttempts: newAttempts,
              };
            }

            // If we haven't connected yet and have tried multiple times, show error
            if (newAttempts >= 3) {
              return {
                ...prev,
                isConnected: false,
                isDisconnected: true,
                error: "Could not connect to desktop app",
                reconnectAttempts: newAttempts,
              };
            }

            // Try to reconnect
            reconnectTimeout = setTimeout(connect, 2000);

            return {
              ...prev,
              error: "Reconnecting...",
              reconnectAttempts: newAttempts,
            };
          });
        };
      } catch (err) {
        console.error("[SSE] Failed to create EventSource:", err);
        setState((prev) => ({
          ...prev,
          error: "Failed to connect",
          isDisconnected: true,
        }));
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return state;
}
