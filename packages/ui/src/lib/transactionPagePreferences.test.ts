import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultTransactionPagePreferences,
  resolveTransactionPagePreferences,
  saveTransactionPagePreferences,
  TRANSACTION_PAGE_PREFERENCES_STORAGE_KEY,
} from "./transactionPagePreferences";

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.get(key) ?? null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

describe("transactionPagePreferences", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads defaults when storage is missing", () => {
    expect(resolveTransactionPagePreferences(["Cash"])).toEqual(
      getDefaultTransactionPagePreferences(),
    );
  });

  it("ignores malformed JSON", () => {
    localStorage.setItem(
      TRANSACTION_PAGE_PREFERENCES_STORAGE_KEY,
      "{not-valid-json",
    );

    expect(resolveTransactionPagePreferences(["Cash"])).toEqual(
      getDefaultTransactionPagePreferences(),
    );
  });

  it("accepts valid stored periodMode", () => {
    saveTransactionPagePreferences({
      periodMode: "quarter",
      selectedAccount: "__all__",
    });

    expect(resolveTransactionPagePreferences(["Cash"])).toEqual({
      periodMode: "quarter",
      selectedAccount: "__all__",
    });
  });

  it("resets unsupported periodMode to default", () => {
    localStorage.setItem(
      TRANSACTION_PAGE_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        periodMode: "decade",
        selectedAccount: "__all__",
      }),
    );

    expect(resolveTransactionPagePreferences(["Cash"])).toEqual({
      periodMode: "month",
      selectedAccount: "__all__",
    });
  });

  it("resets missing saved account to __all__", () => {
    saveTransactionPagePreferences({
      periodMode: "week",
      selectedAccount: "Closed Account",
    });

    expect(resolveTransactionPagePreferences(["Cash", "Bank"])).toEqual({
      periodMode: "week",
      selectedAccount: "__all__",
    });
  });
});
