import type { FaqEntry } from "./faq";

export const DEFAULT_FAQS: Omit<FaqEntry, "id">[] = [
  {
    category: "Schedule",
    keywords: [
      "when",
      "time",
      "day",
      "schedule",
      "play",
      "session",
      "next",
      "weekend",
    ],
    question: "When are sessions / what time?",
    answer:
      "We play Sunday afternoons from 1:00 PM to 4:00 PM. Sessions don't run every weekend — check our latest Instagram post (@spike_volleyball) or TryBooking to see when the next confirmed session is.",
    enabled: true,
  },
  {
    category: "Location",
    keywords: ["where", "location", "venue", "address", "gym", "court"],
    question: "Where do you play?",
    answer:
      "We usually play at Albany Junior High School. The exact venue for each session is listed on its TryBooking ticket — we sometimes move, so always double-check before heading out.",
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
      "Sessions are open to anyone with a ticket — no membership or sign-up needed. Grab a ticket on TryBooking and turn up. We organise teams from whoever's there on the day, and all skill levels are welcome.",
    enabled: true,
  },
  {
    category: "Cost",
    keywords: ["cost", "price", "fee", "money", "pay", "much", "expensive"],
    question: "How much does it cost?",
    answer:
      "$15 per person per session, paid through TryBooking when you book your spot.",
    enabled: true,
  },
  {
    category: "Tickets",
    keywords: [
      "ticket",
      "tickets",
      "buy",
      "purchase",
      "event",
      "tournament",
      "find",
      "get",
      "where",
      "trybooking",
    ],
    question: "Where do I find / buy tickets?",
    answer:
      "Tickets are sold on TryBooking. We post the link on Instagram (@spike_volleyball) every time a new session goes on sale.",
    enabled: true,
  },
  {
    category: "Ticket Release",
    keywords: [
      "release",
      "released",
      "available",
      "sale",
      "on sale",
      "when",
      "tickets",
    ],
    question: "When are tickets released?",
    answer:
      "Tickets go on sale Wednesday for that weekend's Sunday session. Follow @spike_volleyball on Instagram so you don't miss the drop — popular sessions sell out fast.",
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
];
