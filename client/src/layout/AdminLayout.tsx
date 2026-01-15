import { Outlet } from "react-router-dom";
import TopBar from "./Topbar";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
  return (
    <>
      <TopBar />
      <div style={{ display: "flex" }}>
        <AdminSidebar />
        <div style={{ padding: "16px", flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </>
  );
}
