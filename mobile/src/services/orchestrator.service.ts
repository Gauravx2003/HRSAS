import { api } from "./api";

// ─── Types ─────────────────────────────────────────────
export interface Resource {
  id: string;
  hostelId: string;
  name: string;
  type: "LAUNDRY" | "BADMINTON";
  isOperational: boolean | null;
  liveStatus: "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "FULLY_BOOKED";
  currentUser: string | null;
  availableAt: string | null; // ISO timestamp
  slotsLeft?: number;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
}

export interface Booking {
  id: string;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  hostelId: string;
  userId: string;
  type: "LAUNDRY" | "BADMINTON";
  status: "WAITING" | "FULFILLED" | "EXPIRED";
  joinedAt: string;
}

export interface QueueData {
  bookings: Booking[];
  waitlists: WaitlistEntry[];
}

// ─── Service ───────────────────────────────────────────
export const orchestratorService = {
  getResources: async (): Promise<Resource[]> => {
    const response = await api.get<Resource[]>("/orchestrator/resources");
    return response.data;
  },

  getAvailableSlots: async (resourceId: string): Promise<TimeSlot[]> => {
    const response = await api.get<TimeSlot[]>(
      `/orchestrator/resources/${resourceId}/slots`,
    );
    return response.data;
  },

  getMyQueue: async (): Promise<QueueData> => {
    const response = await api.get<QueueData>("/orchestrator/my-queue");
    return response.data;
  },

  bookSlot: async (
    resourceId: string,
    startTime: string,
    endTime: string,
  ): Promise<{ message: string; booking: Booking }> => {
    const response = await api.post("/orchestrator/book", {
      resourceId,
      startTime,
      endTime,
    });
    return response.data;
  },

  joinWaitlist: async (
    type: "LAUNDRY" | "BADMINTON",
  ): Promise<{ message: string; waitlist: WaitlistEntry }> => {
    const response = await api.post("/orchestrator/waitlist", { type });
    return response.data;
  },

  cancelBooking: async (bookingId: string): Promise<{ message: string }> => {
    const response = await api.post(`/orchestrator/cancel/${bookingId}`);
    return response.data;
  },
};
