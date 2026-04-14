import { NextRequest, NextResponse } from "next/server";
import { listFaqs, createFaq } from "@/lib/faq";
import { DEFAULT_FAQS } from "@/lib/seed";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.ADMIN_PASSWORD}`;

  if (!process.env.ADMIN_PASSWORD || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await listFaqs();
  if (existing.length > 0) {
    return NextResponse.json(
      {
        message: `Database already has ${existing.length} FAQ entries. Delete them first or use the admin page.`,
        count: existing.length,
      },
      { status: 409 }
    );
  }

  const created = [];
  for (const faq of DEFAULT_FAQS) {
    const entry = await createFaq(faq);
    created.push(entry);
  }

  return NextResponse.json({
    message: `Seeded ${created.length} FAQ entries`,
    count: created.length,
  });
}
