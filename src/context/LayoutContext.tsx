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
  customNavButtons: CustomSidebarButton[];
  setCustomNavButtons: (buttons: CustomSidebarButton[]) => void;
  customAdminButtons: CustomSidebarButton[];
  setCustomAdminButtons: (buttons: CustomSidebarButton[]) => void;
};

// Create the context with default values
const LayoutContext = createContext<LayoutContextType>({
  activePage: "",
  setActivePage: () => {},
  customNavButtons: [],
  setCustomNavButtons: () => {},
  customAdminButtons: [],
  setCustomAdminButtons: () => {},
});

// Custom hook to access the layout context
export function useLayout() {
  return useContext(LayoutContext);
}

// Provider component to wrap around your app
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState("");
  const [customNavButtons, setCustomNavButtons] = useState<
    CustomSidebarButton[]
  >([]);
  const [customAdminButtons, setCustomAdminButtons] = useState<
    CustomSidebarButton[]
  >([]);

  return (
    <LayoutContext.Provider
      value={{
        activePage,
        setActivePage,
        customNavButtons,
        setCustomNavButtons,
        customAdminButtons,
        setCustomAdminButtons,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
