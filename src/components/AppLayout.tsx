import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, AlertTriangle } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI RiskGuard</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            Hi, {displayName}
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
