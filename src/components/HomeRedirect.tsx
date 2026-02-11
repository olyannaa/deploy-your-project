import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeRedirect() {
  const { user } = useAuth();
  const isAccountant = user.roles.includes("accountant") && !user.roles.some(r => ["admin", "gip"].includes(r));
  return <Navigate to={isAccountant ? "/finance" : "/projects"} replace />;
}
