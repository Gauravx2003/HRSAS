import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import LibrarianSidebar from "./LibrarianSidebar";
import { ToastProvider } from "../components/common/Toast";

export default function LibrarianLayout() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TopBar />
        <div className="flex flex-1">
          <LibrarianSidebar />
          <main className="flex-1 p-6 lg:p-8 w-full">
            <div className="max-w-6xl mx-auto space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
