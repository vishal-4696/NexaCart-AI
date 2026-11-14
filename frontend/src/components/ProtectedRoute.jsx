import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  // Check whether the user is logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check user role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Allow access
  return <Outlet />;
}
