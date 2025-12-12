"use client";

import { VehicleProvider } from "@/contexts/vehicle-context";
import { cn } from "@/lib/utils";
import { SidebarRail } from "./sidebar-rail";
import { TopBar } from "./top-bar";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  return (
    <VehicleProvider>
      <div
        className={cn(
          "grid grid-cols-[auto_1fr] gap-6",
          "h-[calc(100dvh-2rem)] overflow-hidden p-4",
          className,
        )}
      >
        {/* Sidebar Rail */}
        <SidebarRail />

        {/* Main Area */}
        <div className="flex flex-col min-w-0 h-full">
          {/* Top Bar */}
          <TopBar />

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </VehicleProvider>
  );
}
