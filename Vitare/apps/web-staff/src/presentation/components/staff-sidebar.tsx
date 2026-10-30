import * as React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Users, LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@vitare/ui-components";
import { Avatar, AvatarFallback, AvatarImage } from "@vitare/ui-components";
import { useStaffAuth } from "../hooks/use-staff-auth";
import { VitareLogo } from "./vitare-logo";

const staffNavItems = [
  {
    title: "Emergências",
    icon: AlertTriangle,
    href: "/emergencias",
  },
  {
    title: "Pacientes",
    icon: Users,
    href: "/pacientes",
  },
];

function getInitials(fullName?: string): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function StaffSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = useLocation().pathname;
  const { staff, logout } = useStaffAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href.split("?")[0]);
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/emergencias">
                <VitareLogo className="size-8 object-contain" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-red-600">
                    Vitare
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Equipe de resposta
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {staffNavItems.map((item) => {
                const isActive = isItemActive(item.href);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={
                        isActive ? "text-red-600 bg-red-600/10 font-medium" : ""
                      }
                      asChild
                    >
                      <Link to={item.href}>
                        <item.icon className={isActive ? "text-red-600" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <Avatar className="h-8 w-8">
                <AvatarImage alt="Avatar" />
                <AvatarFallback className="bg-red-600 text-white font-medium">
                  {getInitials(staff?.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {staff?.fullName ?? "Socorrista"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {staff?.email ?? "Equipe de resposta"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
