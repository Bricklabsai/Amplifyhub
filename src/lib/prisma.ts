import { PrismaClient } from "../generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = 
  globalForPrisma.prisma ??
  new PrismaClient({
<<<<<<< Updated upstream
    log: process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"],
=======
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
>>>>>>> Stashed changes
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
