import { createContext, type ReactNode, useContext } from "react";
import type {
  ITransactionService,
  ICategoryService,
  IAccountService,
  ICategoryGroupService,
  IStatisticsService,
  IDebtService,
  ISyncService,
  IAuthService,
} from "@money-insight/ui/adapters/factory/interfaces";

/**
 * Platform services interface for dependency injection
 * Different platforms (Tauri, Web) provide different implementations
 */
export interface IPlatformServices {
  transaction: ITransactionService;
  category: ICategoryService;
  categoryGroup: ICategoryGroupService;
  account: IAccountService;
  statistics: IStatisticsService;
  debt: IDebtService;
  auth: IAuthService;
  sync: ISyncService;
}

/**
 * Platform context for injecting platform-specific services
 */
export const PlatformContext = createContext<IPlatformServices | null>(null);

/**
 * Hook to access platform services
 * @throws Error if used outside of PlatformProvider
 */
export const usePlatformServices = (): IPlatformServices => {
  const services = useContext(PlatformContext);
  if (!services) {
    throw new Error(
      "usePlatformServices must be used within a PlatformProvider",
    );
  }
  return services;
};

/**
 * Platform provider props
 */
export interface PlatformProviderProps {
  services: IPlatformServices;
  children: ReactNode;
}

/**
 * Platform provider component
 * Wrap your app with this and provide platform-specific service implementations
 */
export const PlatformProvider = ({
  services,
  children,
}: PlatformProviderProps) => {
  return (
    <PlatformContext.Provider value={services}>
      {children}
    </PlatformContext.Provider>
  );
};
