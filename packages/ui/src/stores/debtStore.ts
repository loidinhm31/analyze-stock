import { create } from "zustand";
import type {
  Debt,
  DebtSettlement,
  DebtSettlementInput,
  NewDebt,
} from "@money-insight/ui/types";
import * as debtService from "@money-insight/ui/services/debtService";

interface DebtSections {
  active: Debt[];
  completed: Debt[];
}

interface DebtStore {
  debts: Debt[];
  payableDebts: Debt[];
  receivableDebts: Debt[];
  payableSections: DebtSections;
  receivableSections: DebtSections;
  settlementsByDebtId: Record<string, DebtSettlement[]>;
  selectedDebtId: string | null;
  selectedDebt: Debt | null;
  selectedDebtSettlements: DebtSettlement[];
  isLoading: boolean;
  isDbReady: boolean;
  error: string | null;

  initFromDatabase: () => Promise<void>;
  loadDebts: () => Promise<void>;
  addDebt: (input: NewDebt) => Promise<Debt>;
  updateDebt: (debt: Debt) => Promise<Debt>;
  deleteDebt: (id: string) => Promise<void>;
  selectDebt: (id: string | null) => Promise<void>;
  loadSettlements: (debtId: string) => Promise<DebtSettlement[]>;
  addSettlement: (
    debtId: string,
    input: DebtSettlementInput,
  ) => Promise<DebtSettlement>;
  deleteSettlement: (id: string) => Promise<void>;
  refreshDebt: (id: string) => Promise<void>;
  reset: () => void;
}

function buildSections(debts: Debt[]): {
  payableDebts: Debt[];
  receivableDebts: Debt[];
  payableSections: DebtSections;
  receivableSections: DebtSections;
} {
  const payableDebts = debts.filter((debt) => debt.debtType === "payable");
  const receivableDebts = debts.filter(
    (debt) => debt.debtType === "receivable",
  );

  return {
    payableDebts,
    receivableDebts,
    payableSections: partitionByCompletion(payableDebts),
    receivableSections: partitionByCompletion(receivableDebts),
  };
}

function partitionByCompletion(debts: Debt[]): DebtSections {
  return {
    active: debts.filter((debt) => debt.remainingAmount > 0),
    completed: debts.filter((debt) => debt.remainingAmount <= 0),
  };
}

function applyDebtState(debts: Debt[]) {
  return {
    debts,
    ...buildSections(debts),
  };
}

async function refreshSpendingStore(): Promise<void> {
  const { useSpendingStore } =
    await import("@money-insight/ui/stores/spendingStore");
  const spendingStore = useSpendingStore.getState();
  if (spendingStore.isDbReady) {
    await spendingStore.initFromDatabase();
  }
}

export const useDebtStore = create<DebtStore>()((set, get) => ({
  debts: [],
  payableDebts: [],
  receivableDebts: [],
  payableSections: { active: [], completed: [] },
  receivableSections: { active: [], completed: [] },
  settlementsByDebtId: {},
  selectedDebtId: null,
  selectedDebt: null,
  selectedDebtSettlements: [],
  isLoading: false,
  isDbReady: false,
  error: null,

  initFromDatabase: async () => {
    await get().loadDebts();
  },

  loadDebts: async () => {
    set({ isLoading: true, error: null });

    try {
      const debts = await debtService.getDebts();
      set({
        ...applyDebtState(debts),
        selectedDebt: get().selectedDebtId
          ? (debts.find((debt) => debt.id === get().selectedDebtId) ?? null)
          : null,
        isLoading: false,
        isDbReady: true,
      });
    } catch (error) {
      set({
        isLoading: false,
        isDbReady: false,
        error: error instanceof Error ? error.message : "Failed to load debts",
      });
      throw error;
    }
  },

  addDebt: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const debt = await debtService.createDebt(input);
      const debts = [debt, ...get().debts];
      set({ ...applyDebtState(debts), isLoading: false, isDbReady: true });
      await refreshSpendingStore();
      return debt;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to add debt",
      });
      throw error;
    }
  },

  updateDebt: async (debt) => {
    set({ isLoading: true, error: null });

    try {
      const updated = await debtService.updateDebt(debt);
      const debts = get().debts.map((item) =>
        item.id === updated.id ? updated : item,
      );
      set({
        ...applyDebtState(debts),
        selectedDebt:
          get().selectedDebtId === updated.id ? updated : get().selectedDebt,
        isLoading: false,
      });
      return updated;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to update debt",
      });
      throw error;
    }
  },

  deleteDebt: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await debtService.deleteDebt(id);
      const debts = get().debts.filter((debt) => debt.id !== id);
      const selectedDebtId = get().selectedDebtId;
      const settlementsByDebtId = { ...get().settlementsByDebtId };
      delete settlementsByDebtId[id];
      set({
        ...applyDebtState(debts),
        settlementsByDebtId,
        selectedDebtId: selectedDebtId === id ? null : selectedDebtId,
        selectedDebt: selectedDebtId === id ? null : get().selectedDebt,
        selectedDebtSettlements:
          selectedDebtId === id ? [] : get().selectedDebtSettlements,
        isLoading: false,
      });
      await refreshSpendingStore();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to delete debt",
      });
      throw error;
    }
  },

  selectDebt: async (id) => {
    if (!id) {
      set({
        selectedDebtId: null,
        selectedDebt: null,
        selectedDebtSettlements: [],
      });
      return;
    }

    set({
      selectedDebtId: id,
      selectedDebt: get().debts.find((debt) => debt.id === id) ?? null,
    });
    await get().loadSettlements(id);
  },

  loadSettlements: async (debtId) => {
    set({ isLoading: true, error: null });

    try {
      const settlements = await debtService.getSettlements(debtId);
      set((state) => ({
        settlementsByDebtId: {
          ...state.settlementsByDebtId,
          [debtId]: settlements,
        },
        selectedDebtSettlements:
          state.selectedDebtId === debtId
            ? settlements
            : state.selectedDebtSettlements,
        isLoading: false,
      }));
      return settlements;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to load settlements",
      });
      throw error;
    }
  },

  addSettlement: async (debtId, input) => {
    set({ isLoading: true, error: null });

    try {
      const settlement = await debtService.addSettlement(debtId, input);
      await get().refreshDebt(debtId);
      await get().loadSettlements(debtId);
      await refreshSpendingStore();
      set({ isLoading: false });
      return settlement;
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : "Failed to add settlement",
      });
      throw error;
    }
  },

  deleteSettlement: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const selectedDebtId = get().selectedDebtId;
      const debtId =
        Object.entries(get().settlementsByDebtId).find(([, items]) =>
          items.some((settlement) => settlement.id === id),
        )?.[0] ?? selectedDebtId;

      await debtService.deleteSettlement(id);
      if (debtId) {
        await get().refreshDebt(debtId);
        await get().loadSettlements(debtId);
      } else {
        await get().loadDebts();
      }
      await refreshSpendingStore();
      set({ isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete settlement",
      });
      throw error;
    }
  },

  refreshDebt: async (id) => {
    const debt = await debtService.getDebt(id);
    const existingDebts = get().debts;
    const debts = debt
      ? existingDebts.some((item) => item.id === id)
        ? existingDebts.map((item) => (item.id === id ? debt : item))
        : [debt, ...existingDebts]
      : existingDebts.filter((item) => item.id !== id);

    set({
      ...applyDebtState(debts),
      selectedDebt:
        get().selectedDebtId === id ? (debt ?? null) : get().selectedDebt,
    });
  },

  reset: () => {
    set({
      debts: [],
      payableDebts: [],
      receivableDebts: [],
      payableSections: { active: [], completed: [] },
      receivableSections: { active: [], completed: [] },
      settlementsByDebtId: {},
      selectedDebtId: null,
      selectedDebt: null,
      selectedDebtSettlements: [],
      isLoading: false,
      isDbReady: false,
      error: null,
    });
  },
}));
