import { PrismaClient, type User } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

type DemoUser = { name: string; email: string; userId: string };

const demoUsers: DemoUser[] = [
  { name: "Aarav Mehta", email: "aarav@splittrack.demo", userId: "aarav_4821" },
  { name: "Bhavya Rao", email: "bhavya@splittrack.demo", userId: "bhavya_7314" },
  { name: "Chirag Nair", email: "chirag@splittrack.demo", userId: "chirag_2096" },
  { name: "Diya Kapoor", email: "diya@splittrack.demo", userId: "diya_9182" },
];

async function createOrUpdateUser(input: DemoUser): Promise<User> {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      userId: input.userId,
      passwordHash,
      emailVerified: new Date(),
      remindersOptOut: false,
    },
    create: {
      name: input.name,
      email: input.email,
      userId: input.userId,
      passwordHash,
      emailVerified: new Date(),
      reminderHour: 9,
    },
  });
}

async function main() {
  console.log("Seeding SplitTrack demo data…");

  const users = await Promise.all(demoUsers.map(createOrUpdateUser));
  const [aarav, bhavya, chirag, diya] = users as [User, User, User, User];

  // Connect all four users as accepted friends (both directions are not needed —
  // the service layer treats an accepted friendship as symmetric).
  const pairs: Array<[User, User]> = [
    [aarav, bhavya],
    [aarav, chirag],
    [aarav, diya],
    [bhavya, chirag],
    [bhavya, diya],
    [chirag, diya],
  ];

  for (const [a, b] of pairs) {
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: a.id, addresseeId: b.id },
          { requesterId: b.id, addresseeId: a.id },
        ],
      },
    });
    if (existing) {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
    } else {
      await prisma.friendship.create({
        data: {
          requesterId: a.id,
          addresseeId: b.id,
          status: "ACCEPTED",
          respondedAt: new Date(),
        },
      });
    }
  }

  let group = await prisma.group.findFirst({ where: { name: "Demo Gang", createdById: aarav.id } });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: "Demo Gang",
        createdById: aarav.id,
        members: {
          create: [
            { userId: aarav.id, role: "OWNER" },
            { userId: bhavya.id },
            { userId: chirag.id },
            { userId: diya.id },
          ],
        },
      },
    });
  }

  // Idempotent: remove previous demo expenses (cascades shares + audit logs).
  await prisma.expense.deleteMany({ where: { description: { startsWith: "Demo:" } } });
  await prisma.settlement.deleteMany({ where: { note: { startsWith: "Demo:" } } });
  await prisma.reminderLog.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });

  const everyone = [aarav, bhavya, chirag, diya];
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  async function seedExpense(input: {
    payer: User;
    totalPaise: number;
    description: string;
    daysAgo: number;
    category: string;
  }) {
    const sharePaise = Math.floor(input.totalPaise / everyone.length);
    const remainder = input.totalPaise - sharePaise * everyone.length;
    const shares = everyone.map((user, index) => ({
      userId: user.id,
      sharePaise: sharePaise + (index < remainder ? 1 : 0),
    }));

    const expense = await prisma.expense.create({
      data: {
        payerId: input.payer.id,
        createdById: input.payer.id,
        groupId: group!.id,
        totalPaise: input.totalPaise,
        description: input.description,
        category: input.category,
        date: new Date(now - input.daysAgo * day),
        shares: { create: shares },
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "EXPENSE",
        entityId: expense.id,
        action: "CREATED",
        actorId: input.payer.id,
        expenseId: expense.id,
        diff: {
          after: {
            description: input.description,
            totalPaise: input.totalPaise,
            payerId: input.payer.id,
            shares,
          },
        },
      },
    });
  }

  await seedExpense({
    payer: aarav,
    totalPaise: 10000,
    description: "Demo: Dominos round 1",
    daysAgo: 3,
    category: "Food",
  });
  await seedExpense({
    payer: aarav,
    totalPaise: 10000,
    description: "Demo: Dominos round 2",
    daysAgo: 2,
    category: "Food",
  });
  await seedExpense({
    payer: bhavya,
    totalPaise: 20000,
    description: "Demo: Sushi night",
    daysAgo: 1,
    category: "Food",
  });

  console.log("Seed complete.");
  console.log("Demo login: aarav@splittrack.demo / Password123! (same for bhavya/chirag/diya)");
  console.log("Expected net: B↔A ₹0, C owes A ₹50 & B ₹50, D owes A ₹50 & B ₹50");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
