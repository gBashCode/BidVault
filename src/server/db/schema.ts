import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // 'admin' | 'vendor'
  organization: text("organization"), // e.g., 'Helios Civil Works AG'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const tenders = sqliteTable("tenders", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  creatorId: text("creator_id").notNull().references(() => users.id),
  revealDeadline: integer("reveal_deadline", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("Draft"), // 'Draft' | 'Open' | 'Sealed' | 'Ready'
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const bids = sqliteTable("bids", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id").notNull().references(() => tenders.id),
  vendorId: text("vendor_id").notNull().references(() => users.id),
  commitHash: text("commit_hash").notNull(),
  sizeMb: real("size_mb").notNull(),
  objectKey: text("object_key").notNull(), // Key for R2 bucket
  status: text("status").notNull().default("Sealed"), // 'Sealed' | 'Revealed'
  submittedAt: integer("submitted_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  event: text("event").notNull(), // e.g., 'bid.seal', 'doc.replace', 'vendor.join'
  actor: text("actor").notNull(),
  hash: text("hash").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});
