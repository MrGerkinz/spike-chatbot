import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const classificationSchema = z.object({
  category: z.string().describe("The matched FAQ category, or 'unknown'"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score between 0 and 1"),
});

export type Classification = z.infer<typeof classificationSchema>;

const CONFIDENCE_THRESHOLD = 0.6;

export async function classifyMessage(
  message: string,
  categories: string[]
): Promise<Classification> {
  if (categories.length === 0) {
    return { category: "unknown", confidence: 0 };
  }

  const result = await generateText({
    model: google("gemini-2.0-flash"),
    output: Output.object({ schema: classificationSchema }),
    prompt: `You are a helpful assistant for a social volleyball club. A person has sent a message and you need to classify it into one of the following FAQ categories.

Categories: ${categories.join(", ")}

If the message does not clearly match any category, set category to "unknown".

Set confidence to a value between 0 and 1 indicating how confident you are in the classification. Only use high confidence (>0.8) if the message clearly matches a category.

Message: "${message}"`,
  });

  if (!result.output) {
    return { category: "unknown", confidence: 0 };
  }

  return result.output;
}

export function isConfident(classification: Classification): boolean {
  return (
    classification.category !== "unknown" &&
    classification.confidence >= CONFIDENCE_THRESHOLD
  );
}
