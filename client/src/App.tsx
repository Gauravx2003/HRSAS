import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RoleRoute } from "./auth/RoleRoute";
import AdminLayout from "./layout/AdminLayout";
import StaffLayout from "./layout/StaffLayout";
import ResidentLayout from "./layout/ResidentLayout";
import ResidentDashboard from "./pages/resident/ResidentDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NoticeList from "./pages/notices/NoticeList";
import EscalatedComplaints from "./pages/admin/EscalatedComplaints";
import LostFoundApprovals from "./pages/admin/LostFoundApprovals";
import MyComplaints from "./pages/resident/MyComplaints";
import MyLostItems from "./pages/resident/MyLostItems";
import AssignedComplaints from "./pages/staff/AssignedComplaints";
import FoundItems from "./pages/resident/FoundItems";
import MessIssues from "./pages/resident/MessIssues";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ADMIN*/}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="notices" element={<NoticeList />} />
          <Route path="escalations" element={<EscalatedComplaints />} />
          <Route path="lost-found" element={<LostFoundApprovals />} />
        </Route>

        {/* STAFF */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["STAFF"]}>
                <StaffLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffDashboard />} />
          <Route path="notices" element={<NoticeList />} />
          <Route path="complaints" element={<AssignedComplaints />} />
        </Route>

        {/* RESIDENT */}
        <Route
          path="/resident"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={["RESIDENT"]}>
                <ResidentLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<ResidentDashboard />} />
          <Route path="notices" element={<NoticeList />} />
          <Route path="complaints" element={<MyComplaints />} />
          <Route path="lost-items" element={<MyLostItems />} />
          <Route path="found-items" element={<FoundItems />} />
          <Route path="mess-issues" element={<MessIssues />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
