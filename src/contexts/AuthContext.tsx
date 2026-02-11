import { createContext, ReactNode, useContext, useState } from "react";
import { UserRole } from "@/components/RoleSwitcher";

interface DemoUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  roles: string[];
  canApproveSubcontracts: boolean;
  departmentIds?: string[];
  primaryDepartmentId?: string | null;
}

const demoUsers: DemoUser[] = [
  { id: "user-1", fullName: "Иванов Иван Иванович", email: "admin@project.com", role: "admin", roles: ["admin"], canApproveSubcontracts: true, primaryDepartmentId: "dept-1" },
  { id: "user-2", fullName: "Петров Пётр Петрович", email: "gip@project.com", role: "gip", roles: ["gip"], canApproveSubcontracts: false, primaryDepartmentId: "dept-1" },
  { id: "user-3", fullName: "Сидорова Анна Сергеевна", email: "executor@project.com", role: "executor", roles: ["executor"], canApproveSubcontracts: false, primaryDepartmentId: "dept-1" },
  { id: "user-5", fullName: "Морозова Елена Андреевна", email: "accountant@project.com", role: "accountant", roles: ["accountant"], canApproveSubcontracts: false, primaryDepartmentId: "dept-4" },
];

interface AuthContextType {
  user: DemoUser;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser>(demoUsers[0]);

  const switchRole = (role: UserRole) => {
    const found = demoUsers.find((u) => u.role === role);
    if (found) setUser(found);
  };

  return (
    <AuthContext.Provider value={{ user, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}
