import { z } from "zod";

export const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email is too long");

export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Use at least 8 characters")
  .max(72, "Password must be 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const nameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name is too long");

export const publicUserIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,24}$/,
    "Use 3–24 characters: lowercase letters, numbers and underscores only",
  );

export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  inviteToken: z.string().trim().min(8).max(128).optional(),
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["SIGNUP", "RESET"]).default("SIGNUP"),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72),
});

export const friendRequestSchema = z.object({
  userId: z.string().min(1, "Choose a person"),
});

export const friendRespondSchema = z.object({
  friendshipId: z.string().min(1),
  action: z.enum(["accept", "reject"]),
});

export const inviteSchema = z.object({
  email: emailSchema.optional(),
});

export const groupSchema = z.object({
  name: z.string().trim().min(2, "Group name is too short").max(40, "Group name is too long"),
  memberIds: z.array(z.string().min(1)).min(1, "Add at least one friend").max(50),
});

export const groupUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  memberIds: z.array(z.string().min(1)).min(1).max(50).optional(),
});

export const expenseSchema = z.object({
  description: z.string().trim().min(1, "Add a description").max(120, "Description is too long"),
  totalPaise: z.number().int().positive().max(2_000_000_000, "Amount is too large"),
  date: z.string().min(1, "Choose a date"),
  category: z.string().trim().max(40).optional().nullable(),
  payerId: z.string().min(1, "Choose who paid"),
  participantIds: z
    .array(z.string().min(1))
    .min(2, "Add at least one friend")
    .max(50, "Too many people"),
  splitMode: z.enum(["equal", "exact", "percent"]).default("equal"),
  customShares: z
    .array(
      z.object({
        userId: z.string().min(1),
        value: z.number().int().nonnegative().max(2_000_000_000),
      }),
    )
    .optional(),
  groupId: z.string().min(1).nullish(),
});

export const settlementSchema = z.object({
  toUserId: z.string().min(1, "Choose who you paid"),
  amountPaise: z.number().int().positive().max(2_000_000_000, "Amount is too large"),
  note: z.string().trim().max(200, "Note is too long").optional(),
});

export const settlementActionSchema = z.object({
  action: z.enum(["confirm", "reject"]),
});

export const reminderSchema = z.object({
  toUserId: z.string().min(1),
});

export const settingsSchema = z.object({
  name: nameSchema.optional(),
  userId: publicUserIdSchema.optional(),
  upiId: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9._-]{2,60}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID (name@bank)"),
    ])
    .optional(),
  notifyExpense: z.boolean().optional(),
  notifySettlement: z.boolean().optional(),
  notifyFriendRequest: z.boolean().optional(),
  notifyDailyCreditor: z.boolean().optional(),
  remindersOptOut: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordSchema,
});

export const avatarUploadSchema = z.object({
  image: z
    .string({ error: "Choose a photo" })
    .min(1, "Choose a photo")
    .max(900_000, "Photo is too large"),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
});

export const activityFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  personId: z.string().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type PublicUser = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
};
