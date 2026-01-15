import { Outlet } from "react-router-dom";
import TopBar from "./Topbar";
import StaffSidebar from "./StaffSidebar";

export default function StaffLayout() {
  return (
    <>
      <TopBar />
      <div style={{ display: "flex" }}>
        <StaffSidebar />
        <div style={{ padding: "16px", flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </>
  );
}
