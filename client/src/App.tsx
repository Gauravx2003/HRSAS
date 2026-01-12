import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleRoute } from "./auth/RoleRoute";
import NotificationPanel from "./components/NotificationPanel";
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";

function AdminDashboard() {
  return (
    <>
      <h1>Admin Dashboard</h1>
      <NotificationPanel />
    </>
  );
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resident"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["RESIDENT"]}>
                <ResidentDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["STAFF"]}>
                <StaffDashboard />
              </RoleRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
