import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://sealedbid:sealedbid@localhost:5432/sealedbid",
    },
  },
  log: ["error"],
});

export { prisma };
export default prisma;
export * from "./rls.js";
