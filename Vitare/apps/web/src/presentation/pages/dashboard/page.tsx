import { Link } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@vitare/ui-components";
import { AppSidebar } from "../../components/app-sidebar";
import { UserInfoCards } from "../../components/user-info-cards";
import { EmergencyFab } from "../../components/emergency-fab";
import { Separator } from "@vitare/ui-components";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@vitare/ui-components";
import { useAuth } from "../../hooks/use-auth";

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.fullName?.trim().split(/\s+/)[0] ?? "";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-white">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 text-[#52AF7A]" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink
                  asChild
                  className="text-[#52AF7A] hover:text-[#52AF7A]/80"
                >
                  <Link to="/dashboard">Vitare</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Painel de Saúde</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-slate-50/50">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {firstName ? `Olá, ${firstName}!` : "Olá!"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo ao seu painel de saúde
            </p>
          </div>
          <UserInfoCards />
        </main>
      </SidebarInset>
      <EmergencyFab size="lg"/>
    </SidebarProvider>
  );
}
