import { staffApiClient } from "./staff-client.api";
import type { EmergencyFeedItem } from "@vitare/core-typings";

export const staffEmergenciesApi = {
  findRecent: (limit = 50) =>
    staffApiClient.get<EmergencyFeedItem[]>("/staff/emergencies", {
      params: { limit },
    }),
  accept: (id: string) =>
    staffApiClient.post<{ id: string; status: string; assignedStaffId: string | null; acceptedAt: string | null }>(`/staff/emergencies/${id}/accept`),
  resolve: (id: string) =>
    staffApiClient.post<{ id: string; status: string; assignedStaffId: string | null; resolvedAt: string | null; alreadyResolved: boolean }>(`/staff/emergencies/${id}/resolve`),
  updateLocation: (latitude: number, longitude: number) =>
    staffApiClient.post<{ updated: boolean; geospatialIndexAvailable: boolean }>("/staff/emergencies/location", { latitude, longitude }),
};
