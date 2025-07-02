"use client";
import { createContext, useContext, useState, ReactNode } from "react";

// Type for a single custom sidebar button
type CustomSidebarButton = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  badgeCount?: number;
};

// Layout context type definition
type LayoutContextType = {
  activePage: string;
  setActivePage: (page: string) => void;
  customButtons: CustomSidebarButton[];
  setCustomButtons: (buttons: CustomSidebarButton[]) => void;
};

// Create the context with default values
const LayoutContext = createContext<LayoutContextType>({
  activePage: "",
  setActivePage: () => {},
  customButtons: [],
  setCustomButtons: () => {},
});

// Custom hook to access the layout context
export function useLayout() {
  return useContext(LayoutContext);
}

// Provider component to wrap around your app
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState("");
  const [customButtons, setCustomButtons] = useState<CustomSidebarButton[]>([]);

  return (
    <LayoutContext.Provider
      value={{
        activePage,
        setActivePage,
        customButtons,
        setCustomButtons,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
