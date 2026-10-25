import { createContext, useContext, type ReactNode } from "react";
import type { RouteAdapter } from "./sidebar-route-adapter";

interface RouteAdapterContextValue {
  useLocation: () => { pathname: string };
  Link: any;
}

const RouteAdapterContext = createContext<RouteAdapterContextValue | undefined>(undefined);

export interface RouteAdapterProviderProps {
  children: ReactNode;
  adapter: RouteAdapter;
}

export function RouteAdapterProvider({ children, adapter }: RouteAdapterProviderProps) {
  const value: RouteAdapterContextValue = {
    useLocation: adapter.useLocation,
    Link: adapter.Link,
  };

  return (
    <RouteAdapterContext.Provider value={value}>
      {children}
    </RouteAdapterContext.Provider>
  );
}

export function useRouteAdapter(): RouteAdapterContextValue {
  const context = useContext(RouteAdapterContext);
  if (!context) {
    throw new Error("useRouteAdapter must be used within a RouteAdapterProvider");
  }
  return context;
}
