"use server";

import { cookies } from "next/headers";
import {
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  listUnanswered,
  clearUnanswered,
  type FaqEntry,
} from "@/lib/faq";

const SESSION_COOKIE = "admin_session";
const SESSION_DURATION = 60 * 60 * 24; // 24 hours in seconds

export async function login(
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: "Invalid password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === "authenticated";
}

export async function getFaqs(): Promise<FaqEntry[]> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  return listFaqs();
}

export async function addFaq(data: {
  category: string;
  keywords: string[];
  question: string;
  answer: string;
}): Promise<FaqEntry> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  return createFaq({ ...data, enabled: true });
}

export async function editFaq(
  id: string,
  data: Partial<Omit<FaqEntry, "id">>
): Promise<FaqEntry | null> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  if (id.startsWith("default-")) throw new Error("Cannot edit default entries");
  return updateFaq(id, data);
}

export async function removeFaq(id: string): Promise<boolean> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  if (id.startsWith("default-")) throw new Error("Cannot delete default entries");
  return deleteFaq(id);
}

export async function getUnanswered() {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  return listUnanswered();
}

export async function clearAllUnanswered(): Promise<void> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  await clearUnanswered();
}
