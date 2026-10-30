import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/geist/index.css";
import "leaflet/dist/leaflet.css";
import "./presentation/pages/globals.css";
import App from "./App";
import { StaffAuthProvider } from "./presentation/contexts/staff-auth-context";
import { SWRegister } from "./presentation/components/SWRegister";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/monitoramento">
        <StaffAuthProvider>
          <SWRegister />
          <App />
        </StaffAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
