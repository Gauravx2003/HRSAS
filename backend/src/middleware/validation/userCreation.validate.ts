import { z } from "zod";

export const createResidentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"), // Matches varchar(100)

  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .max(150, "Email cannot exceed 150 characters"), // Matches varchar(150)

  roomId: z
    .string()
    .min(1, "Room assignment is required")
    .uuid("Invalid Room ID format"), // Ensures it's a valid PostgreSQL UUID

  phone: z
    .string()
    .min(1, "Phone number is required")
    .max(15, "Phone number cannot exceed 15 characters") // Matches varchar(15)
    .regex(/^\+?[1-9]\d{1,14}$/, "Please provide a valid phone number"), // Basic E.164 phone validation

  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format") // Ensures compatibility with PG 'date' type
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Please provide a valid calendar date",
    }),

  enrollmentNumber: z
    .string()
    .max(50, "Enrollment number cannot exceed 50 characters") // Matches varchar(50)
    .optional(),
});

export const createStaffSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"), // Matches varchar(100)

  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .max(150, "Email cannot exceed 150 characters"), // Matches varchar(150)

  phone: z
    .string()
    .min(1, "Phone number is required")
    .max(15, "Phone number cannot exceed 15 characters") // Matches varchar(15)
    .regex(/^\+?[1-9]\d{1,14}$/, "Please provide a valid phone number"), // Basic E.164 phone validation

  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format") // Ensures compatibility with PG 'date' type
    .refine((date) => !isNaN(Date.parse(date)), {
      message: "Please provide a valid calendar date",
    }),

  specialization: z
    .string()
    .min(1, "Specialization is required")
    .max(100, "Specialization cannot exceed 100 characters"), // Matches varchar(100)

  staffType: z
    .string()
    .min(1, "Staff type is required")
    .max(100, "Staff type cannot exceed 100 characters"), // Matches varchar(100)
});

// Infer the TypeScript type directly from the schema
export type CreateResidentInput = z.infer<typeof createResidentSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
