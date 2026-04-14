import type { FaqEntry } from "./faq";

export const DEFAULT_FAQS: Omit<FaqEntry, "id">[] = [
  {
    category: "Schedule",
    keywords: ["when", "time", "day", "schedule", "play", "session"],
    question: "When do you play / what time?",
    answer:
      "We play every Tuesday and Thursday evening from 7:00 PM to 9:00 PM. Doors open at 6:45 PM for warm-ups. Sessions run year-round — just show up and have fun!",
    enabled: true,
  },
  {
    category: "Location",
    keywords: ["where", "location", "venue", "address", "gym", "court"],
    question: "Where do you play?",
    answer:
      "We play at the local community sports centre. Check our Facebook page for the exact address and any venue changes.",
    enabled: true,
  },
  {
    category: "Skill Level",
    keywords: [
      "level",
      "skill",
      "beginner",
      "intermediate",
      "advanced",
      "experience",
      "ability",
    ],
    question: "What skill level is required?",
    answer:
      "All skill levels are welcome! We're a social club first and foremost. Whether you're a complete beginner or an experienced player, you'll fit right in.",
    enabled: true,
  },
  {
    category: "Joining",
    keywords: ["join", "sign up", "register", "membership", "member", "how to"],
    question: "How do I join?",
    answer:
      "Just show up to one of our sessions! Your first visit is free so you can see if you like it. After that, you can sign up for a membership. Message us if you have any questions.",
    enabled: true,
  },
  {
    category: "Cost",
    keywords: ["cost", "price", "fee", "money", "pay", "much", "expensive"],
    question: "How much does it cost?",
    answer:
      "We try to keep costs low. Drop-in sessions are available and membership gives you a discount. Contact us for current pricing details.",
    enabled: true,
  },
  {
    category: "Tickets",
    keywords: ["ticket", "tickets", "buy", "purchase", "event", "tournament", "find", "get", "where"],
    question: "Where do I find / buy tickets?",
    answer:
      "Tickets for our events and tournaments are available on our website and through our Facebook events page. You can also grab them at the door on the day, but we recommend buying online in advance as popular events sell out quickly!",
    enabled: true,
  },
  {
    category: "Ticket Release",
    keywords: ["release", "released", "available", "sale", "on sale", "when", "tickets"],
    question: "When are tickets released?",
    answer:
      "Tickets are usually released 2–3 weeks before each event. We announce release dates on our Facebook page and send reminders to members. Turn on notifications so you don't miss out!",
    enabled: true,
  },
  {
    category: "Equipment",
    keywords: [
      "bring",
      "wear",
      "equipment",
      "gear",
      "shoes",
      "knee pads",
      "ball",
    ],
    question: "What do I need to bring?",
    answer:
      "Just bring comfortable sportswear, indoor court shoes (non-marking soles), and water. We provide the volleyballs and nets. Knee pads are optional but recommended.",
    enabled: true,
  },
  {
    category: "Social Events",
    keywords: [
      "social",
      "drinks",
      "party",
      "hangout",
      "off-court",
      "after",
    ],
    question: "Do you have social events?",
    answer:
      "Absolutely! We regularly organise social events like post-game drinks, BBQs, and end-of-season parties. Follow our Facebook page to stay in the loop.",
    enabled: true,
  },
];
