// lib/reply.ts
import { classifyMessage, isConfident } from "./classify";
import { findFaqByCategory, getEnabledCategories } from "./faq";
import {
  composeSessionAnswer,
  getUpcomingSession,
  isTimeSensitiveCategory,
} from "./sessions";

export const FALLBACK_REPLY =
  "Thanks for reaching out! I wasn't able to find an answer to your question. A team member will get back to you shortly.";

export type MatchPath = "faq" | "session" | "fallback";

export interface ComposedReply {
  reply: string;
  category: string | null;
  confidence: number;
  matchPath: MatchPath;
  matchedFaqCategory?: string;
}

export async function composeReply(text: string): Promise<ComposedReply> {
  const categories = await getEnabledCategories();
  const classification = await classifyMessage(text, categories);

  if (isConfident(classification)) {
    const faq = await findFaqByCategory(classification.category);
    if (faq) {
      if (isTimeSensitiveCategory(faq.category)) {
        const session = await getUpcomingSession();
        if (session) {
          return {
            reply: composeSessionAnswer(faq.category, session),
            category: classification.category,
            confidence: classification.confidence,
            matchPath: "session",
            matchedFaqCategory: faq.category,
          };
        }
      }
      return {
        reply: faq.answer,
        category: classification.category,
        confidence: classification.confidence,
        matchPath: "faq",
        matchedFaqCategory: faq.category,
      };
    }
  }

  return {
    reply: FALLBACK_REPLY,
    category: classification.category === "unknown" ? null : classification.category,
    confidence: classification.confidence,
    matchPath: "fallback",
  };
}
