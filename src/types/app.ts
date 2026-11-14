import type { PublicUser } from "@/lib/validators";

export interface AppUser extends PublicUser {
  email: string;
}

export interface AppGroup {
  id: string;
  name: string;
  createdById: string;
  members: PublicUser[];
  createdAt?: string;
  expenseCount?: number;
}

export interface AppSettlement {
  id: string;
  amountPaise: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  from: PublicUser;
  to: PublicUser;
}

export interface EditableExpense {
  id: string;
  description: string;
  totalPaise: number;
  date: string;
  category: string | null;
  payerId: string;
  participantIds: string[];
  shares: Array<{ userId: string; sharePaise: number }>;
  groupId: string | null;
}
