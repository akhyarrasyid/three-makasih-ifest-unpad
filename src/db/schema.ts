import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

/**
 * Operational alert state. Alerts are seeded from the simulation engine and
 * then mutated by operators (acknowledge / resolve / snooze / assign).
 */
export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  severity: text("severity").notNull(), // CRITICAL | WARNING | INFO | DATA_QUALITY | MODEL
  title: text("title").notNull(),
  description: text("description").notNull(),
  stationId: text("station_id"),
  source: text("source").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN | ACKNOWLEDGED | SNOOZED | RESOLVED
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  assignedTo: text("assigned_to"),
  snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
  correlationId: text("correlation_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  fromScenario: boolean("from_scenario").notNull().default(false),
});

/**
 * Enterprise audit trail. Every operator action and system event is appended.
 */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  actor: text("actor").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  requestId: text("request_id").notNull(),
  ipAddress: text("ip_address").notNull(),
  environment: text("environment").notNull().default("production"),
  status: text("status").notNull(), // SUCCESS | FAILURE | DENIED
  durationMs: integer("duration_ms"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
});

export type AlertRow = typeof alerts.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
