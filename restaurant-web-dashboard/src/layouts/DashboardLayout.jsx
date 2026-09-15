import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden p-7">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;