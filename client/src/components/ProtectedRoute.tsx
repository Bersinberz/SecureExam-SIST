import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, isStoredTokenExpired, getUserTypeFromStoredToken } from "../utils/tokenHelper";

interface Props {
  children: React.ReactNode;
  role?: "student" | "staff";
}

const ProtectedRoute: React.FC<Props> = ({ children, role }) => {
  const token = getToken();

  if (!token || isStoredTokenExpired()) {
    return <Navigate to="/" replace />;
  }

  if (role) {
    const userType = getUserTypeFromStoredToken();
    if (userType !== role) {
      // Wrong role — send back to login
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
