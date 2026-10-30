import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@vitare/ui-components";
import { StaffSidebar } from "../../components/staff-sidebar";
import { StaffPatientLookup } from "../../components/staff-patient-lookup";

export default function StaffPatientsPage() {
  return (
    <SidebarProvider>
      <StaffSidebar />
      <SidebarInset className="flex flex-1 flex-col bg-gray-50/50 w-full min-h-screen">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4">
          <SidebarTrigger className="text-gray-700" />
          <span className="text-sm font-semibold text-gray-800">
            Consulta de Pacientes
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <StaffPatientLookup />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
