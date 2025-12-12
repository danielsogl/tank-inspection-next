"use client";

import { Home, LogOut, Menu, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarRailProps {
  className?: string;
  onMenuClick?: () => void;
  onLogout?: () => void;
}

export function SidebarRail({
  className,
  onMenuClick,
  onLogout,
}: SidebarRailProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className={cn(
          "flex flex-col items-center justify-between",
          "bg-card border-2 border-border rounded-lg",
          "p-2 w-[60px] h-full",
          className,
        )}
      >
        {/* Top section - Menu button */}
        <div className="flex flex-col items-center gap-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMenuClick}
                className="hover:bg-sidebar-accent"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Menu</TooltipContent>
          </Tooltip>
        </div>

        {/* Middle section - Navigation */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-sidebar-accent"
              >
                <Home className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Home</TooltipContent>
          </Tooltip>
        </div>

        {/* Bottom section - Avatar + Logout */}
        <div className="flex flex-col items-center gap-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="hover:bg-sidebar-accent"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
