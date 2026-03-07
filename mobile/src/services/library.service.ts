import { api } from "./api";

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  coverUrl?: string;
  isDigital: boolean;
  format: "PHYSICAL" | "EBOOK" | "AUDIOBOOK";
  status: "AVAILABLE" | "BORROWED" | "LOST" | "MAINTENANCE";
}

export interface LibraryTransaction extends LibraryBook {
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount: number;
  isFinePaid: boolean;
  transactionStatus: "BORROWED" | "RETURNED" | "OVERDUE";
}

export interface LibraryReservation {
  id: string;
  bookId: string;
  status: "RESERVED" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  reservedAt: string;
  expiresAt: string;
  bookDetails: LibraryBook;
}

export interface GetMyBooksResponse {
  transactions: LibraryTransaction[];
  reservations: LibraryReservation[];
}

export interface LibraryService {
  getAllBooks: () => Promise<LibraryBook[]>;
  getMyBooks: (
    status: "BORROWED" | "RETURNED" | "OVERDUE" | "ALL",
  ) => Promise<GetMyBooksResponse>;
  reserveBook: (bookId: string) => Promise<any>;
  downloadBook: (bookId: string) => Promise<{ downloadUrl: string }>;
}

export const libraryService: LibraryService = {
  getAllBooks: async () => {
    try {
      const response = await api.get("/library");
      return response.data;
    } catch (error) {
      console.error("Error fetching library books:", error);
      throw error;
    }
  },

  getMyBooks: async (status) => {
    try {
      const response = await api.get(`/library/my?status=${status}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching my books:", error);
      throw error;
    }
  },

  reserveBook: async (bookId: string) => {
    try {
      const response = await api.post("/library/reserve", { bookId });
      return response.data;
    } catch (error) {
      console.error("Error reserving book:", error);
      throw error;
    }
  },

  downloadBook: async (bookId: string) => {
    try {
      const response = await api.get(`/library/${bookId}/download`);
      return response.data;
    } catch (error) {
      console.error("Error downloading book:", error);
      throw error;
    }
  },
};
