import { Link } from "react-router-dom"
import { AppSidebar } from "../../components/app-sidebar"
import { Medications } from "../../components/medications"
import { EmergencyFab } from "../../components/emergency-fab"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@vitare/ui-components"
import { Separator } from "@vitare/ui-components"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@vitare/ui-components"

export default function MedicationsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 bg-white border-b border-gray-100 px-4">
          <SidebarTrigger className="-ml-1 text-gray-600" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink
                  asChild
                  className="text-[#52AF7A] hover:text-[#458f63]"
                >
                  <Link to="/dashboard">Início</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground font-medium">
                  Medicamentos
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 bg-gray-50/50 p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Medicamentos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus medicamentos permitidos e não permitidos
            </p>
          </div>
          <Medications />
        </main>
        <EmergencyFab />
      </SidebarInset>
    </SidebarProvider>
  )
}
