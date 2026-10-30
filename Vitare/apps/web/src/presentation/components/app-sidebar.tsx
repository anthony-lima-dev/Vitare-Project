import * as React from "react";
import { useLocation, Link } from "react-router-dom";
import { Activity, Home, Pill, ShieldAlert, Users } from "lucide-react";

import { VitareLogo } from "./vitare-logo";

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
import { useAuth } from "../hooks/use-auth";

const mainNavItems = [
  { title: "Início", icon: Home, href: "/dashboard" },
  { title: "Medicamentos", icon: Pill, href: "/medicamentos" },
  {
    title: "Doenças Crônicas",
    icon: Activity,
    href: "/doencas-cronicas",
  },
  { title: "Alergias", icon: ShieldAlert, href: "/alergias" },
  {
    title: "Contatos de Emergência",
    icon: Users,
    href: "/contatos-emergencia",
  },
];

function getInitials(fullName?: string): string {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = useLocation().pathname;
  const { user } = useAuth();

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <VitareLogo className="size-8 object-contain" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-[#52AF7A]">
                    Vitare
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Saúde Digital
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
              {mainNavItems.map((item) => {
                const isActive = isItemActive(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={
                        isActive ? "text-[#52AF7A] bg-[#52AF7A]/10" : ""
                      }
                      asChild
                    >
                      <Link to={item.href}>
                        <item.icon
                          className={isActive ? "text-[#52AF7A]" : ""}
                        />
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
            <SidebarMenuButton size="lg" asChild>
              <Link to="/perfil">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.avatarUrl ?? undefined}
                    alt="Avatar"
                  />
                  <AvatarFallback className="bg-[#52AF7A] text-white">
                    {getInitials(user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user?.fullName ?? "Carregando..."}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email ?? ""}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
