import { Redis } from "@upstash/redis";
import { z } from "zod";

const SESSION_KEY = "next_session";
const NZ_TZ = "Pacific/Auckland";

export const ticketStatusValues = ["not_yet", "on_sale", "sold_out"] as const;
export type TicketStatus = (typeof ticketStatusValues)[number];

export const sessionSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  venue: z.string().min(1),
  ticketUrl: z.string().url().or(z.literal("")).optional(),
  ticketStatus: z.enum(ticketStatusValues),
  notes: z.string().optional(),
});

export type SessionEntry = z.infer<typeof sessionSchema>;

function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

export async function getNextSession(): Promise<SessionEntry | null> {
  const redis = getRedis();
  const stored = await redis.get<SessionEntry>(SESSION_KEY);
  return stored ?? null;
}

export async function setNextSession(entry: SessionEntry): Promise<void> {
  const redis = getRedis();
  const validated = sessionSchema.parse(entry);
  await redis.set(SESSION_KEY, validated);
}

export async function clearNextSession(): Promise<void> {
  const redis = getRedis();
  await redis.del(SESSION_KEY);
}

// Returns the current calendar date in Auckland as YYYY-MM-DD.
// Storing/comparing in NZ local time avoids "session looks past" bugs
// when the Vercel function runs in UTC.
function todayInAuckland(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: NZ_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function isSessionUpcoming(session: SessionEntry): boolean {
  return session.date >= todayInAuckland();
}

export async function getUpcomingSession(): Promise<SessionEntry | null> {
  const session = await getNextSession();
  if (!session || !isSessionUpcoming(session)) return null;
  return session;
}

function formatHumanDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // Use UTC to avoid shifting the date — we only display the calendar date.
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
}

function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

export type TimeSensitiveCategory = "Schedule" | "Tickets" | "Ticket Release";

export function isTimeSensitiveCategory(
  category: string
): category is TimeSensitiveCategory {
  return (
    category === "Schedule" ||
    category === "Tickets" ||
    category === "Ticket Release"
  );
}

// Build a session-aware reply for the time-sensitive categories.
// Returns null if there's no upcoming session — caller should fall back
// to the static FAQ answer.
export function composeSessionAnswer(
  category: TimeSensitiveCategory,
  session: SessionEntry
): string {
  const dateStr = formatHumanDate(session.date);
  const timeStr = formatTimeRange(session.startTime, session.endTime);
  const ticketLine = session.ticketUrl
    ? ` Tickets: ${session.ticketUrl}`
    : "";

  if (category === "Schedule") {
    return `Our next session is ${dateStr}, ${timeStr} at ${session.venue}.${ticketLine}`;
  }

  if (category === "Tickets") {
    if (session.ticketStatus === "on_sale") {
      return `Tickets for ${dateStr} at ${session.venue} are on sale now —${ticketLine || " check @spike_volleyball for the link."}`;
    }
    if (session.ticketStatus === "sold_out") {
      return `Sorry, ${dateStr} is sold out! We'll post the next session on @spike_volleyball soon.`;
    }
    // not_yet
    return `Tickets for ${dateStr} aren't on sale yet — they go live Wednesday on TryBooking. Follow @spike_volleyball so you don't miss it.`;
  }

  // Ticket Release
  if (session.ticketStatus === "on_sale") {
    return `Tickets for ${dateStr} are already on sale —${ticketLine || " check @spike_volleyball for the link."}`;
  }
  if (session.ticketStatus === "sold_out") {
    return `${dateStr} is sold out — keep an eye on @spike_volleyball for the next release.`;
  }
  return `Tickets for ${dateStr} go on sale Wednesday on TryBooking. Follow @spike_volleyball so you don't miss the drop.`;
}
