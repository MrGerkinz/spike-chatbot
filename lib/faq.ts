import { Redis } from "@upstash/redis";

const FAQS_KEY = "faqs";
const UNANSWERED_KEY = "unanswered";

export interface FaqEntry {
  id: string;
  category: string;
  keywords: string[];
  question: string;
  answer: string;
  enabled: boolean;
}

export interface UnansweredEntry {
  id: string;
  senderId: string;
  platform: "messenger" | "instagram";
  message: string;
  timestamp: string;
}

function getRedis() {
  return Redis.fromEnv();
}

export async function listFaqs(): Promise<FaqEntry[]> {
  const redis = getRedis();
  const faqs = await redis.get<FaqEntry[]>(FAQS_KEY);
  return faqs ?? [];
}

export async function getFaq(id: string): Promise<FaqEntry | undefined> {
  const faqs = await listFaqs();
  return faqs.find((f) => f.id === id);
}

export async function getEnabledCategories(): Promise<string[]> {
  const faqs = await listFaqs();
  return faqs.filter((f) => f.enabled).map((f) => f.category);
}

export async function findFaqByCategory(
  category: string
): Promise<FaqEntry | undefined> {
  const faqs = await listFaqs();
  return faqs.find(
    (f) => f.enabled && f.category.toLowerCase() === category.toLowerCase()
  );
}

export async function createFaq(
  entry: Omit<FaqEntry, "id">
): Promise<FaqEntry> {
  const redis = getRedis();
  const faqs = await listFaqs();
  const newEntry: FaqEntry = { ...entry, id: crypto.randomUUID() };
  faqs.push(newEntry);
  await redis.set(FAQS_KEY, faqs);
  return newEntry;
}

export async function updateFaq(
  id: string,
  updates: Partial<Omit<FaqEntry, "id">>
): Promise<FaqEntry | null> {
  const redis = getRedis();
  const faqs = await listFaqs();
  const idx = faqs.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  faqs[idx] = { ...faqs[idx], ...updates };
  await redis.set(FAQS_KEY, faqs);
  return faqs[idx];
}

export async function deleteFaq(id: string): Promise<boolean> {
  const redis = getRedis();
  const faqs = await listFaqs();
  const filtered = faqs.filter((f) => f.id !== id);
  if (filtered.length === faqs.length) return false;
  await redis.set(FAQS_KEY, filtered);
  return true;
}

export async function logUnanswered(
  entry: Omit<UnansweredEntry, "id" | "timestamp">
): Promise<void> {
  const redis = getRedis();
  const log: UnansweredEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  await redis.lpush(UNANSWERED_KEY, log);
  await redis.ltrim(UNANSWERED_KEY, 0, 199);
}

export async function listUnanswered(): Promise<UnansweredEntry[]> {
  const redis = getRedis();
  const entries = await redis.lrange<UnansweredEntry>(UNANSWERED_KEY, 0, -1);
  return entries;
}

export async function clearUnanswered(): Promise<void> {
  const redis = getRedis();
  await redis.del(UNANSWERED_KEY);
}
