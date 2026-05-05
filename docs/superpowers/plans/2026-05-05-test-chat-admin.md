# Test Chat in Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Test Chat" tab to the admin that runs the bot's classify→match→reply pipeline against a typed message and shows the would-be reply plus diagnostic info, without sending to Meta or polluting the unanswered queue.

**Architecture:** Extract a pure `composeReply(text)` helper from the webhook handler so the production path and test path share the same logic. The webhook keeps the side effects (Meta send, unanswered log, admin email); the test path returns the result directly to the admin UI.

**Tech Stack:** Next.js 16 App Router, server actions, `@upstash/redis` (already wired), `@ai-sdk/google` for classification (already wired), Tailwind for the UI. No new dependencies.

**Note on testing convention:** This project has no automated test framework configured (no `jest`/`vitest`/test script). Per existing convention, verification is manual smoke testing against the running dev server, captured in each task's verification step.

---

## File Structure

- **Create** `lib/reply.ts` — pure `composeReply(text)` returning `ComposedReply` (reply text + diagnostics). No side effects.
- **Modify** `app/api/webhook/route.ts` — replace `handleMessage` body to call `composeReply`, then layer on `sendMessage` / `logUnanswered` / `notifyAdmin` based on the result.
- **Modify** `app/admin/actions.ts` — add `testChat(text)` server action.
- **Modify** `app/admin/page.tsx` — add `"test"` to the `Tab` union, a `<TabButton>`, and a `<TestChat>` component.

---

## Task 1: Extract `composeReply` to `lib/reply.ts`

**Files:**
- Create: `lib/reply.ts`

- [ ] **Step 1: Create `lib/reply.ts` with the pure compose function**

Write the file:

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. The new file imports only existing modules and uses already-exported types.

- [ ] **Step 3: Commit**

```bash
git add lib/reply.ts
git commit -m "Add composeReply helper for shared classify/match/reply logic"
```

---

## Task 2: Refactor webhook to use `composeReply`

**Files:**
- Modify: `app/api/webhook/route.ts`

- [ ] **Step 1: Replace the imports and `handleMessage`**

The current file imports `classifyMessage`, `isConfident`, `findFaqByCategory`, `getEnabledCategories`, `composeSessionAnswer`, `getUpcomingSession`, `isTimeSensitiveCategory` and defines a local `FALLBACK_REPLY`. After the refactor it only needs Meta + reply + side-effect imports.

Replace the file's content with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { extractMessages, sendMessage, verifyWebhookSignature } from "@/lib/meta";
import { logUnanswered } from "@/lib/faq";
import { composeReply } from "@/lib/reply";
import { notifyAdmin } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  if (process.env.META_APP_SECRET && !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (body.object !== "page" && body.object !== "instagram") {
    return NextResponse.json({ error: "Unsupported object" }, { status: 404 });
  }

  const messages = extractMessages(body);

  after(async () => {
    for (const msg of messages) {
      try {
        await handleMessage(msg.senderId, msg.text, msg.platform);
      } catch (err) {
        console.error("Error handling message:", err);
      }
    }
  });

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function handleMessage(
  senderId: string,
  text: string,
  platform: "messenger" | "instagram"
) {
  const result = await composeReply(text);
  await sendMessage(senderId, result.reply);

  if (result.matchPath === "fallback") {
    await logUnanswered({ senderId, platform, message: text });
    await notifyAdmin(text, senderId, platform).catch((err) =>
      console.error("Failed to notify admin:", err)
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke-test the webhook signature path**

The dev server should already be running (background task `b21ss70v6`). Hit the verify endpoint:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=$(grep '^META_VERIFY_TOKEN=' .env.local | cut -d= -f2)&hub.challenge=test"
```

Expected: `200`. (This only verifies the route still compiles and the GET handler still works — no Meta API call needed.)

- [ ] **Step 4: Commit**

```bash
git add app/api/webhook/route.ts
git commit -m "Refactor webhook handler to use composeReply"
```

---

## Task 3: Add `testChat` server action

**Files:**
- Modify: `app/admin/actions.ts`

- [ ] **Step 1: Add the import and the action**

At the top of `app/admin/actions.ts`, add:

```ts
import { composeReply, type ComposedReply } from "@/lib/reply";
```

Then append the new action at the end of the file (after `clearSession`):

```ts
export async function testChat(text: string): Promise<ComposedReply> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  return composeReply(trimmed);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/actions.ts
git commit -m "Add testChat server action for admin test chat tab"
```

---

## Task 4: Add Test Chat tab to admin UI

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add the import**

Add `testChat` to the imports from `./actions`. Find this block near the top of `app/admin/page.tsx`:

```ts
import {
  login,
  logout,
  isAuthenticated,
  getFaqs,
  addFaq,
  editFaq,
  removeFaq,
  getUnanswered,
  clearAllUnanswered,
  getSession,
  saveSession,
  clearSession,
} from "./actions";
```

Replace with:

```ts
import {
  login,
  logout,
  isAuthenticated,
  getFaqs,
  addFaq,
  editFaq,
  removeFaq,
  getUnanswered,
  clearAllUnanswered,
  getSession,
  saveSession,
  clearSession,
  testChat,
} from "./actions";
```

Also add this import after the existing type imports:

```ts
import type { ComposedReply } from "@/lib/reply";
```

- [ ] **Step 2: Extend the `Tab` union**

Find:

```ts
type Tab = "faqs" | "session" | "unanswered";
```

Replace with:

```ts
type Tab = "faqs" | "session" | "unanswered" | "test";
```

- [ ] **Step 3: Add the tab button and tab body in `Dashboard`**

In the `Dashboard` component, find the tab button row:

```tsx
<div className="flex gap-2 mb-6">
  <TabButton active={tab === "faqs"} onClick={() => setTab("faqs")}>
    FAQ Entries ({faqs.length})
  </TabButton>
  <TabButton
    active={tab === "session"}
    onClick={() => setTab("session")}
  >
    Next Session{session ? " ✓" : ""}
  </TabButton>
  <TabButton
    active={tab === "unanswered"}
    onClick={() => setTab("unanswered")}
  >
    Unanswered ({unanswered.length})
  </TabButton>
</div>
```

Replace with:

```tsx
<div className="flex gap-2 mb-6 flex-wrap">
  <TabButton active={tab === "faqs"} onClick={() => setTab("faqs")}>
    FAQ Entries ({faqs.length})
  </TabButton>
  <TabButton
    active={tab === "session"}
    onClick={() => setTab("session")}
  >
    Next Session{session ? " ✓" : ""}
  </TabButton>
  <TabButton
    active={tab === "unanswered"}
    onClick={() => setTab("unanswered")}
  >
    Unanswered ({unanswered.length})
  </TabButton>
  <TabButton active={tab === "test"} onClick={() => setTab("test")}>
    Test Chat
  </TabButton>
</div>
```

Then find the conditional render block:

```tsx
{loading ? (
  <p className="text-gray-500 text-center py-12">Loading...</p>
) : tab === "faqs" ? (
  <FaqManager faqs={faqs} onRefresh={refresh} />
) : tab === "session" ? (
  <SessionManager session={session} onRefresh={refresh} />
) : (
  <UnansweredLog
    entries={unanswered}
    onRefresh={refresh}
  />
)}
```

Replace with:

```tsx
{loading ? (
  <p className="text-gray-500 text-center py-12">Loading...</p>
) : tab === "faqs" ? (
  <FaqManager faqs={faqs} onRefresh={refresh} />
) : tab === "session" ? (
  <SessionManager session={session} onRefresh={refresh} />
) : tab === "unanswered" ? (
  <UnansweredLog entries={unanswered} onRefresh={refresh} />
) : (
  <TestChat />
)}
```

- [ ] **Step 4: Add the `TestChat` component**

Append this component at the end of `app/admin/page.tsx` (after the last existing component):

```tsx
function TestChat() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sentMessage: string;
    composed: ComposedReply;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setError("");
    setSending(true);
    try {
      const composed = await testChat(trimmed);
      setResult({ sentMessage: trimmed, composed });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Test Chat</h2>
        <p className="text-sm text-gray-500 mt-1">
          Type a message as if you were a user — see what the bot would reply
          and why. Nothing is sent to Meta and no admin alerts fire.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. when do you guys play?"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
        />
        {error && (
          <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            {sending ? "Testing..." : "Send"}
          </button>
        </div>
      </form>

      {result && <TestResultCard result={result} />}
    </div>
  );
}

function TestResultCard({
  result,
}: {
  result: { sentMessage: string; composed: ComposedReply };
}) {
  const { sentMessage, composed } = result;
  const matchLabel =
    composed.matchPath === "faq"
      ? `FAQ matched: ${composed.matchedFaqCategory}`
      : composed.matchPath === "session"
        ? `Session-aware reply: ${composed.matchedFaqCategory}`
        : "Default reply (no match)";
  const matchColor =
    composed.matchPath === "fallback"
      ? "bg-amber-100 text-amber-800"
      : "bg-green-100 text-green-700";
  const confidencePct = Math.round(composed.confidence * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Your message
        </p>
        <p className="text-sm text-gray-800">{sentMessage}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
          Reply
        </p>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">
          {composed.reply}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${matchColor}`}
        >
          {matchLabel}
        </span>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
          Category: {composed.category ?? "unknown"}
        </span>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
          Confidence: {confidencePct}%
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual UI smoke test**

The dev server is running on `http://localhost:3000`. In a browser:

1. Open `http://localhost:3000/admin`, log in.
2. Click the **Test Chat** tab — it should appear in the tab row.
3. Type `when do you guys play?` → click Send.
   - Expected: a reply appears with `Reply` text, a **green** badge saying either `FAQ matched: Schedule` or `Session-aware reply: Schedule` (depending on whether a session is set), `Category: Schedule` (or similar), and a confidence ≥ 60%.
4. Type `asdfqwerty random gibberish` → click Send.
   - Expected: an **amber** badge `Default reply (no match)`, the fallback reply text, low confidence.
5. Click the **Unanswered** tab.
   - Expected: no new entries from the gibberish test (verifies side effects are skipped).

If any step fails, fix the issue before continuing.

- [ ] **Step 7: Commit**

```bash
git add app/admin/page.tsx
git commit -m "Add Test Chat tab to admin"
```

---

## Task 5: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm webhook still works**

Hit the verify endpoint once more:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=$(grep '^META_VERIFY_TOKEN=' .env.local | cut -d= -f2)&hub.challenge=test"
```

Expected: `200`.

- [ ] **Step 2: Confirm clean git state**

Run: `git status`
Expected: working tree clean (all changes committed across Tasks 1–4).

- [ ] **Step 3: Confirm log is sensible**

Run: `git log --oneline -5`
Expected: four new commits in order — `Add composeReply helper...`, `Refactor webhook handler...`, `Add testChat server action...`, `Add Test Chat tab to admin`.

---

## Self-review notes

- **Spec coverage:** Every spec section maps to a task — `composeReply` extraction (Task 1), webhook refactor (Task 2), server action (Task 3), UI tab (Task 4), end-to-end verification (Task 5). The "Out of scope" items in the spec stay out of scope here.
- **Type consistency:** `ComposedReply`, `MatchPath`, and `composeReply` use the same names across `lib/reply.ts`, `app/admin/actions.ts`, and `app/admin/page.tsx`.
- **No placeholders:** All code blocks contain final code, all commands are exact, all expected outputs are concrete.
