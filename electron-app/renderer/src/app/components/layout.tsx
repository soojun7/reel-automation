import { Outlet, useNavigate } from "react-router";
import { Sidebar } from "./sidebar";

export function Layout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar
        onSettingsClick={() => navigate("/settings")}
      />
      <main className="ml-72">
        <Outlet />
      </main>
    </div>
  );
}