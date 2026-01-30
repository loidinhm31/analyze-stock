import { getSessionToken, WEB_APP_PORT } from "@/utils/platform";

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Base class for HTTP-based adapters that communicate with the desktop SQLite backend.
 */
export class HttpAdapter {
  protected baseUrl = `http://localhost:${WEB_APP_PORT}/api`;

  protected getToken(): string | null {
    return getSessionToken();
  }

  protected async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No session token. Please open from desktop app.");
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("token", token);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === "object") {
            url.searchParams.append(key, JSON.stringify(value));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data as T;
  }

  protected async post<T>(endpoint: string, body: unknown): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No session token. Please open from desktop app.");
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("token", token);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data as T;
  }

  protected async put<T>(endpoint: string, body: unknown): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No session token. Please open from desktop app.");
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("token", token);

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data as T;
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No session token. Please open from desktop app.");
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append("token", token);

    const response = await fetch(url.toString(), {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data as T;
  }
}
