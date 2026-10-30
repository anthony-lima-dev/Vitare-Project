import { Link } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@vitare/ui-components";
import { AppSidebar } from "../../components/app-sidebar";
import { Allergies } from "../../components/allergies";
import { Separator } from "@vitare/ui-components";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@vitare/ui-components";
import { EmergencyFab } from "../../components/emergency-fab";

export default function AllergiesPage() {
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
                <BreadcrumbPage>Alergias</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-slate-50/50">
          <Allergies />
        </main>
        <EmergencyFab />
      </SidebarInset>
    </SidebarProvider>
  );
}
