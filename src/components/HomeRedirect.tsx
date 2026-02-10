import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getHomeRouteForRoles } from "@/lib/routes";

export default function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={getHomeRouteForRoles(user.roles, user.canApproveSubcontracts)}
      replace
    />
  );
}
