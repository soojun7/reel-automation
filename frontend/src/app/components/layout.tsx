import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { SettingsModal } from "./settings-modal";
import { useState } from "react";

export function Layout() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar
        onSettingsClick={() => setIsSettingsOpen(true)}
      />
      <main className="ml-72">
        <Outlet />
      </main>
      <SettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}