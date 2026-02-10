import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasRoleAccess = user.roles?.some((role) => allowedRoles.includes(role));
  const hasApprovalAccess =
    !requireCanApproveSubcontracts || Boolean(user.canApproveSubcontracts);
  if (!hasRoleAccess || !hasApprovalAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
