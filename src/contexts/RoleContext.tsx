import { createContext, useContext, ReactNode } from "react";
import { UserRole } from "@/components/RoleSwitcher";

interface RoleContextType {
  currentRole: UserRole;
  currentUserName: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

interface RoleProviderProps {
  children: ReactNode;
  currentRole: UserRole;
  currentUserName: string;
}

export function RoleProvider({ children, currentRole, currentUserName }: RoleProviderProps) {
  return (
    <RoleContext.Provider value={{ currentRole, currentUserName }}>
      {children}
    </RoleContext.Provider>
  );
}