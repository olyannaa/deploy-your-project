import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RequireRoleProps {
  allowedRoles: string[];
  children: ReactNode;
  redirectTo?: string;
  requireCanApproveSubcontracts?: boolean;
}

export default function RequireRole({
  allowedRoles,
  children,
  redirectTo = "/projects",
  requireCanApproveSubcontracts = false,
}: RequireRoleProps) {
  const { user } = useAuth();

  const hasRoleAccess = user.roles.some((role) => allowedRoles.includes(role));
  const hasApprovalAccess = !requireCanApproveSubcontracts || user.canApproveSubcontracts;

  if (!hasRoleAccess || !hasApprovalAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
