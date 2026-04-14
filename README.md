# Volleyball Club Chatbot

Automated FAQ chatbot for social volleyball club inquiries on Facebook Messenger and Instagram DMs. Built with Next.js, Google Gemini AI, and hosted on Vercel.

## How It Works

1. A user sends a message on Facebook Messenger or Instagram
2. Meta delivers the message to our webhook endpoint
3. Google Gemini classifies the message into an FAQ category
4. The bot replies with the matching FAQ answer
5. If no match is found, the message is logged and an admin is notified via email

## Tech Stack

- **Next.js 16** (App Router) on Vercel
- **Google Gemini 2.0 Flash** via Vercel AI SDK (free tier)
- **Upstash Redis** for FAQ storage (free tier)
- **Resend** for admin email notifications (free tier)
- **Meta Graph API** for Messenger & Instagram messaging

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd chatbot
npm install
```

### 2. Get API keys

| Service | Where to get it | Free tier |
|---------|----------------|-----------|
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | 1,500 req/day |
| Resend | [resend.com](https://resend.com) | 100 emails/day |
| Meta Developer | [developers.facebook.com](https://developers.facebook.com) | Free |

### 3. Set up Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com) and create an App (type: "Business")
2. Add the **Messenger** product
3. Connect your Facebook Page and generate a **Page Access Token**
4. Add the **Instagram** product (your IG must be linked to the FB Page)
5. Subscribe to webhook events: `messages`, `messaging_postbacks`

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

### 5. Deploy to Vercel

```bash
npx vercel
```

Then add Upstash Redis via Vercel Marketplace:

```bash
npx vercel integration add upstash
```

Pull the auto-provisioned environment variables:

```bash
npx vercel env pull .env.local
```

Add the remaining environment variables in the Vercel dashboard or via CLI:

```bash
npx vercel env add META_PAGE_ACCESS_TOKEN
npx vercel env add META_VERIFY_TOKEN
npx vercel env add META_APP_SECRET
npx vercel env add GOOGLE_GENERATIVE_AI_API_KEY
npx vercel env add RESEND_API_KEY
npx vercel env add ADMIN_EMAIL
npx vercel env add ADMIN_PASSWORD
```

### 6. Configure Meta Webhook

In your Meta Developer App settings:

- **Callback URL**: `https://your-app.vercel.app/api/webhook`
- **Verify Token**: The value you set for `META_VERIFY_TOKEN`
- Subscribe to: `messages`, `messaging_postbacks`

### 7. Seed FAQ data

After deploying, seed the initial FAQ entries:

```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
```

Or add FAQs manually via the admin page at `/admin`.

## Admin Dashboard

Visit `/admin` on your deployed app to:

- Add, edit, and delete FAQ entries
- Toggle FAQs on/off
- Review unanswered questions
- Clear the unanswered log

## Local Development

```bash
npm run dev
```

The app runs at `http://localhost:3000`. The webhook won't receive real Meta messages locally, but you can test the admin page and FAQ management.

## Project Structure

```
app/
  api/
    webhook/route.ts    – Meta webhook (GET verify + POST messages)
    seed/route.ts       – Seed initial FAQ data
  admin/
    page.tsx            – Admin UI
    actions.ts          – Server Actions for FAQ CRUD
  layout.tsx
  page.tsx              – Landing page
lib/
  classify.ts           – Gemini intent classification
  faq.ts                – FAQ CRUD with Upstash Redis
  meta.ts               – Meta Graph API messaging
  notify.ts             – Admin email notifications
  seed.ts               – Default FAQ data
```
