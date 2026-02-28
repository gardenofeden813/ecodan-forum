// Ecodan-specific categories
export type Category = "installation" | "commissioning" | "troubleshooting" | "spec_consultation"

// Equipment tags (multi-select)
export type Tag = "outdoor_unit" | "hydrobox" | "remote" | "wiring" | "heating" | "hot_water" | "cooling"

export type ThreadStatus = "open" | "closed"

export interface User {
  id: string
  name: string
  displayName: string
  avatarUrl?: string
  isOnline: boolean
  role: "admin" | "member"
}

export interface Attachment {
  id: string
  type: "image" | "voice"
  url: string
  name: string
  duration?: number // for voice in seconds
}

export interface Reply {
  id: string
  threadId: string
  author: User
  body: string
  createdAt: Date
  mentions: string[]
  attachments?: Attachment[]
}

export interface Thread {
  id: string
  title: string
  body: string
  author: User
  category: Category
  tags: Tag[]
  status: ThreadStatus
  createdAt: Date
  replies: Reply[]
  mentions: string[]
}

// Mock users
export const users: User[] = [
  {
    id: "u1",
    name: "tanaka_yuki",
    displayName: "Yuki Tanaka",
    isOnline: true,
    role: "admin",
  },
  {
    id: "u2",
    name: "sarah_chen",
    displayName: "Sarah Chen",
    isOnline: true,
    role: "member",
  },
  {
    id: "u3",
    name: "mike_ross",
    displayName: "Mike Ross",
    isOnline: false,
    role: "member",
  },
  {
    id: "u4",
    name: "yamada_ken",
    displayName: "Ken Yamada",
    isOnline: true,
    role: "member",
  },
  {
    id: "u5",
    name: "emily_wang",
    displayName: "Emily Wang",
    isOnline: false,
    role: "member",
  },
]

export const currentUser = users[0]

const now = new Date()

export const mockThreads: Thread[] = [
  {
    id: "t1",
    title: "Hydrobox piping connection best practices",
    body: "@sarah_chen, I have a question about piping connections during Hydrobox installation. Is there a specific order for connecting refrigerant and water pipes?\n\nAlso, any tips for connecting to existing heating systems would be appreciated.",
    author: users[1],
    category: "installation",
    tags: ["hydrobox", "wiring", "heating"],
    status: "open",
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    mentions: ["sarah_chen"],
    replies: [
      {
        id: "r1",
        threadId: "t1",
        author: users[0],
        body: "@sarah_chen, I recommend connecting the water pipes first, then the refrigerant pipes. When connecting to existing heating systems, make sure to perform proper air bleeding.",
        createdAt: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        mentions: ["sarah_chen"],
      },
    ],
  },
  {
    id: "t2",
    title: "E3 error code on outdoor unit",
    body: "Getting an E3 error code on the outdoor unit during commissioning. @mike_ross reported similar symptoms. Outdoor temperature is around 41F (5C).",
    author: users[3],
    category: "troubleshooting",
    tags: ["outdoor_unit", "heating"],
    status: "open",
    createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
    mentions: ["mike_ross"],
    replies: [
      {
        id: "r3",
        threadId: "t2",
        author: users[2],
        body: "E3 indicates high pressure abnormality. Please check if the piping length is within spec and verify refrigerant charge is correct. @tanaka_yuki, any additional advice?",
        createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        mentions: ["tanaka_yuki"],
      },
    ],
  },
  {
    id: "t3",
    title: "Cannot change hot water temperature on remote",
    body: "After installation, I cannot change the hot water temperature from the remote controller. Heating settings work fine. Firmware is up to date.",
    author: users[4],
    category: "troubleshooting",
    tags: ["remote", "hot_water"],
    status: "closed",
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    mentions: [],
    replies: [
      {
        id: "r4",
        threadId: "t3",
        author: users[0],
        body: "Please verify that the hot water mode is enabled. If the hot water function is set to OFF in system settings, temperature changes won't be available.",
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        mentions: [],
      },
      {
        id: "r5",
        threadId: "t3",
        author: users[4],
        body: "Found it - the hot water mode was indeed OFF. Turned it ON and everything works now. Thank you!",
        createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000),
        mentions: [],
      },
    ],
  },
  {
    id: "t4",
    title: "Recommended settings for cooling operation",
    body: "What are the recommended settings (chilled water temperature, flow rate, etc.) for cooling operation with Ecodan? Planning to use it with fan coil units.",
    author: users[2],
    category: "spec_consultation",
    tags: ["cooling", "hydrobox"],
    status: "open",
    createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    mentions: [],
    replies: [],
  },
  {
    id: "t5",
    title: "Commissioning checklist for new installations",
    body: "Looking for guidance on commissioning procedures after a new installation. @yamada_ken, could you share the essential checklist items?",
    author: users[1],
    category: "commissioning",
    tags: ["outdoor_unit", "hydrobox", "remote"],
    status: "open",
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    mentions: ["yamada_ken"],
    replies: [
      {
        id: "r7",
        threadId: "t5",
        author: users[3],
        body: "Here's our commissioning checklist:\n1. Verify power supply voltage\n2. Check all piping connections\n3. Confirm refrigerant charge\n4. Test water pressure and flow\n5. Verify remote controller communication",
        createdAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
        mentions: [],
      },
    ],
  },
]

// Category colors - unified green tones (like Ecodan leaf icon)
export function getCategoryColor(category: Category): string {
  switch (category) {
    case "installation":
      return "bg-green-600/10 text-green-700 dark:text-green-400"
    case "commissioning":
      return "bg-green-500/10 text-green-600 dark:text-green-300"
    case "troubleshooting":
      return "bg-green-700/10 text-green-800 dark:text-green-500"
    case "spec_consultation":
      return "bg-green-400/10 text-green-600 dark:text-green-400"
  }
}

// Tag colors - neutral/subtle (no distinct colors)
export function getTagColor(_tag: Tag): string {
  return "bg-muted text-muted-foreground"
}

// Helpers
export function getTimeAgo(date: Date): { key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo"; n?: number } {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return { key: "justNow" }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return { key: "minutesAgo", n: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { key: "hoursAgo", n: hours }
  const days = Math.floor(hours / 24)
  return { key: "daysAgo", n: days }
}

export function parseMentions(text: string): string[] {
  const regex = /@(\w+)/g
  const mentions: string[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1])
  }
  return mentions
}
