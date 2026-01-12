import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface RoleRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export const RoleRoute = ({ allowedRoles, children }: RoleRouteProps) => {
  const user = localStorage.getItem("user");

  if (!user) {
    return <Navigate to="/login" />;
  }

  const parsedUser = JSON.parse(user);
  if (!allowedRoles.includes(parsedUser.role)) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
};
