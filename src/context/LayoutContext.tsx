"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type LayoutContextType = {
  activePage: string;
  setActivePage: (page: string) => void;
};

export const LayoutContext = createContext<LayoutContextType>({
  activePage: "",
  setActivePage: () => {},
});

export function useLayout() {
  return useContext(LayoutContext);
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState("");

  return (
    <LayoutContext.Provider value={{ activePage, setActivePage }}>
      {children}
    </LayoutContext.Provider>
  );
}
