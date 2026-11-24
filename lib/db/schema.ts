/**
 * CODI·DOOH database schema (Drizzle / Postgres).
 * Money is stored in centavos (integers). Times are timestamptz.
 * Business tables carry `isDemo` so seeded pitch data can be filtered out.
 */
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** host | advertiser | both */
  kind: text("kind", { enum: ["host", "advertiser", "both"] }).notNull(),
  legalName: text("legal_name"),
  clabe: text("clabe"),
  clabeHolder: text("clabe_holder"),
  bankCode: text("bank_code"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  /** Sessions issued before this are rejected (set when the password is reset). */
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] })
      .notNull()
      .default("owner"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orgId] })],
);

export const sites = pgTable(
  "sites",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    kind: text("kind", {
      enum: ["parking", "restroom", "laundry", "vending"],
    }).notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("sites_org_idx").on(t.orgId)],
);

/**
 * A physical DOOH screen (kiosk). Legacy demo kiosks (bathroom / parking /
 * laundry) live here too with no org, site or token.
 */
export const screens = pgTable(
  "screens",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").references(() => sites.id, {
      onDelete: "cascade",
    }),
    orgId: text("org_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    location: text("location").notNull().default(""),
    profile: text("profile", {
      enum: ["bathroom", "parking", "laundry"],
    }).notNull(),
    /**
     * Kiosk secret = HMAC(server secret, id + version). Rotating bumps the
     * version, which invalidates the old URL. null = cannot report plays.
     */
    tokenVersion: integer("token_version"),
    tokenRotatedAt: timestamp("token_rotated_at", { withTimezone: true }),
    /** null = platform default price. */
    spotPriceCents: integer("spot_price_cents"),
    /** Host's estimate of people paying at this machine per day (null = default). */
    dailyPayers: integer("daily_payers"),
    acceptsAds: boolean("accepts_ads").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("screens_org_idx").on(t.orgId)],
);

export const creatives = pgTable(
  "creatives",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    blobUrl: text("blob_url").notNull(),
    posterUrl: text("poster_url"),
    durationMs: integer("duration_ms").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    codec: text("codec").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: text("status", { enum: ["active", "paused", "rejected"] })
      .notNull()
      .default("active"),
    moderationNote: text("moderation_note"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("creatives_org_idx").on(t.orgId)],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    creativeId: text("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    billing: text("billing", { enum: ["paid", "pilot", "house"] })
      .notNull()
      .default("paid"),
    status: text("status", { enum: ["draft", "active", "paused", "ended"] })
      .notNull()
      .default("draft"),
    /** Price per spot per screen per month frozen at publish time. */
    spotPriceCents: integer("spot_price_cents").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("campaigns_org_idx").on(t.orgId)],
);

export const campaignScreens = pgTable(
  "campaign_screens",
  {
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    screenId: text("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    spots: integer("spots").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.screenId] }),
    index("campaign_screens_screen_idx").on(t.screenId),
  ],
);

/** Proof of play reported by kiosks. */
export const plays = pgTable(
  "plays",
  {
    id: text("id").primaryKey(),
    screenId: text("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    creativeId: text("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id").references(() => campaigns.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("plays_screen_started_uq").on(t.screenId, t.startedAt),
    index("plays_creative_started_idx").on(t.creativeId, t.startedAt),
  ],
);

/** CoDi payments (QR created → paid). machineId = screen id or legacy profile id. */
export const payments = pgTable(
  "payments",
  {
    qrId: text("qr_id").primaryKey(),
    machineId: text("machine_id"),
    status: text("status", { enum: ["PENDING", "PAID"] }).notNull(),
    amountCents: integer("amount_cents"),
    transactionId: text("transaction_id"),
    concept: text("concept"),
    createdAt: createdAt(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isDemo: boolean("is_demo").notNull().default(false),
  },
  (t) => [index("payments_machine_created_idx").on(t.machineId, t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/** "Agenda una demo" requests from the cobten.com landing page. */
export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    business: text("business").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    city: text("city"),
    spaces: integer("spaces"),
    message: text("message"),
    status: text("status", { enum: ["new", "contacted"] }).notNull().default("new"),
    source: text("source").notNull().default("landing"),
    createdAt: createdAt(),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);

/** One-time "recuperar contraseña" links. Only the SHA-256 of the token is stored. */
export const passwordResets = pgTable(
  "password_resets",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("password_resets_user_idx").on(t.userId)],
);
