import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@vitare/ui-components";
import { StaffSidebar } from "../../components/staff-sidebar";
import { StaffEmergenciesFeed } from "../../components/staff-emergencies-feed";

export default function StaffEmergenciesPage() {
  return (
    <SidebarProvider>
      <StaffSidebar />

      <SidebarInset className="flex flex-1 flex-col  w-full">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-800  px-4">
          <SidebarTrigger className="text-black" />
          <span className="text-md font-semibold text-black">
            Painel de Monitoramento
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <StaffEmergenciesFeed />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}