const STORAGE_KEY = "money-insight:last-form-values";

interface LastFormValues {
  date: string;        // ISO string
  account: string;     // for TransactionForm
  fromAccount: string; // for TransferForm
  toAccount: string;   // for TransferForm
}

export function useLastFormValues(accountNames: string[]) {
  const accountSet = new Set(accountNames);

  function load(): Partial<LastFormValues> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function save(values: Partial<LastFormValues>) {
    try {
      const current = load();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...values }));
    } catch {
      // quota exceeded or private browsing — silent fail
    }
  }

  function getLastDate(): Date {
    const saved = load().date;
    return saved ? new Date(saved) : new Date();
  }

  function getLastAccount(): string {
    const saved = load().account ?? "";
    return accountSet.has(saved) ? saved : "";
  }

  function getLastFromAccount(): string {
    const saved = load().fromAccount ?? "";
    return accountSet.has(saved) ? saved : "";
  }

  function getLastToAccount(): string {
    const saved = load().toAccount ?? "";
    return accountSet.has(saved) ? saved : "";
  }

  return { save, getLastDate, getLastAccount, getLastFromAccount, getLastToAccount };
}
