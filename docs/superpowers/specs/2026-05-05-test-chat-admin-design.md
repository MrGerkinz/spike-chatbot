# Test Chat in Admin — Design

## Problem

The bot pipeline (classify → match FAQ → build session-aware reply) can currently only be exercised end-to-end by sending a real DM to the connected Instagram/Facebook account. That's slow and noisy: every test polls Meta, hits the Resend admin email, and adds rows to the unanswered queue.

We want a way to type a message inside the admin and see what the bot would do, without touching Meta and without polluting state.

## Goals

- Type any message in the admin and see the would-be reply.
- See **why** the bot picked that reply (category, confidence, match path) so misclassifications are obvious.
- Zero side effects: no Meta send, no `unanswered` log entry, no admin notification email.

## Non-goals

- Conversation memory / multi-turn context. The webhook handler is stateless per-message; the test should match.
- Persistence of test history across page reloads.
- Platform-specific simulation (`messenger` vs `instagram`). The platform field only affects the `logUnanswered` payload, and we're skipping that.
- Authoring or mutating FAQs/sessions from the test UI — those tabs already exist.

## UX

A new **Test Chat** tab in the admin, sibling to FAQs / Session / Unanswered. Single-shot form (no scrollback):

- Text input + "Send" button
- Disabled state while server action is in flight
- Below the form, a result card appears after each send showing:
  - **Your message** (echoed back)
  - **Reply** — the exact text the bot would send
  - **Classification** — category name + confidence score
  - **Match path** — one of:
    - `FAQ matched` (with FAQ category)
    - `Session-aware reply` (time-sensitive category with an upcoming session)
    - `Default reply (no match)` (fell to fallback)
- Sending again replaces the previous result.

## Architecture

### Server action — `testChat(text)` in `app/admin/actions.ts`

Auth-gated using the same `requireAuth()` pattern as the other admin actions. Mirrors `handleMessage` from `app/api/webhook/route.ts` but:

- Returns the would-be reply instead of calling `sendMessage`.
- Does **not** call `logUnanswered`.
- Does **not** call `notifyAdmin`.

Returns:

```ts
type TestChatResult = {
  reply: string;
  category: string | null;        // null if classifier wasn't confident
  confidence: number;             // raw classifier confidence
  matchPath: "faq" | "session" | "fallback";
  matchedFaqCategory?: string;    // present when matchPath === "faq" or "session"
};
```

### Reuse of webhook logic

`handleMessage` in `app/api/webhook/route.ts` currently bundles classification, FAQ lookup, reply building, and side effects into one function. To avoid duplicating logic in the server action, extract a pure `composeReply(text)` helper that returns `TestChatResult`-shaped data without performing any side effects. Both the webhook and the test action call it; the webhook then performs send + log + notify on top of the result.

This keeps the test path and the production path on the same code, so the test stays honest as the bot logic evolves.

Suggested location: a new `lib/reply.ts` module (or co-locate with `lib/classify.ts`). The webhook handler shrinks to: call `composeReply`, then on `matchPath === "fallback"` perform `logUnanswered` + `notifyAdmin`, and always call `sendMessage`.

### Client — Test Chat tab

Add `Tab` value `"test"` to the existing union, a `<TabButton>` in the dashboard header, and a `<TestChat>` component rendered when the tab is active. State is local to the component (one `lastResult` and a `sending` flag). Component is dropped into `app/admin/page.tsx` alongside the existing tab components.

## Data flow

```
user types → handleSubmit → testChat(text) [server action]
                                  ↓
                           requireAuth()
                                  ↓
                          composeReply(text)
                                  ↓
                  classifyMessage → findFaqByCategory → buildReply (session-aware)
                                  ↓
                          TestChatResult ← returned to client → rendered as card
```

## Testing

- Manual smoke test: type a phrase that matches a default FAQ category (e.g., "when do you guys play?") → see `matchPath: "faq"` or `"session"`, correct reply.
- Type gibberish ("asdfqwerty") → see `matchPath: "fallback"` and the default fallback reply.
- Verify side effects are clean: after running multiple tests, the Unanswered tab shows no new entries and no admin email arrives.
- Time-sensitive path: with an upcoming session set, ask "when's the next session?" → reply should be the composed session message, not the static FAQ answer.

## Out of scope / future

- Add a **platform toggle** if/when platform-specific reply logic is introduced.
- Add a **classification override** (force a category) to test session-aware replies without retraining the classifier.
- Add a **session preview** that lets you edit a draft session in-memory and test against it before saving.
