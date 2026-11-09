import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const { count } = await db.user.updateMany({ where: { email }, data: { role: "ADMIN" } });
  if (count === 0) {
    console.error(`No user with email ${email}. Sign up on the site first.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now an admin.`);
  }
} finally {
  await db.$disconnect();
}
