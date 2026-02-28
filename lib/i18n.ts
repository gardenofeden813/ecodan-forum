export type Locale = "en" | "ja"

export const translations = {
  en: {
    // General
    appName: "Ecodan Forum",
    search: "Search threads...",
    newThread: "New Thread",
    reply: "Reply",
    replies: "Replies",
    noReplies: "No replies yet",
    postReply: "Post Reply",
    cancel: "Cancel",
    create: "Create",
    close: "Close",
    back: "Back",
    online: "Online",
    offline: "Offline",

    // Sidebar
    threads: "Threads",
    allThreads: "All Threads",
    myThreads: "My Threads",
    mentioned: "Mentioned",
    categories: "Categories",

    // Ecodan Categories
    installation: "Installation",
    commissioning: "Commissioning",
    troubleshooting: "Troubleshooting",
    spec_consultation: "Spec Consultation",

    // Equipment Tags
    tags: "Equipment Tags",
    outdoor_unit: "Outdoor Unit",
    hydrobox: "Hydrobox",
    remote: "Remote",
    wiring: "Wiring",
    heating: "Heating",
    hot_water: "Hot Water",
    cooling: "Cooling",

    // Thread Status
    statusLabel: "Status",
    statusOpen: "Open",
    statusClosed: "Resolved",
    markResolved: "Mark as Resolved",
    reopenThread: "Reopen Thread",

    // Thread
    threadTitle: "Title",
    threadTitlePlaceholder: "What's your question?",
    threadBody: "Description",
    threadBodyPlaceholder: "Describe your question in detail... Use @username to mention someone",
    category: "Category",
    selectTags: "Select equipment tags",
    startedBy: "Started by",
    replyPlaceholder: "Write a reply... Use @username to mention someone",

    // User
    profile: "Profile",
    settings: "Settings",
    signOut: "Sign Out",

    // Time
    justNow: "just now",
    minutesAgo: "{n}m ago",
    hoursAgo: "{n}h ago",
    daysAgo: "{n}d ago",

    // Empty
    noThreads: "No threads found",
    noThreadsDesc: "Be the first to start a discussion!",
    noResults: "No results found",
    noResultsDesc: "Try a different search term",

    // Attachments
    attachImage: "Attach image",
    attachVoice: "Attach voice",
    recording: "Recording...",
    recordingTime: "{n}s",
    tapToStop: "Tap to stop",
    voiceMessage: "Voice message",
    removeAttachment: "Remove",
    imageAttached: "{n} image(s) attached",
    remainingTime: "{n}s remaining",
    play: "Play",
    pause: "Pause",

    // Translation
    translate: "Translate",
    translating: "Translating...",
    showOriginal: "Show original",
  },
  ja: {
    // General
    appName: "Ecodan Forum",
    search: "スレッドを検索...",
    newThread: "新規スレッド",
    reply: "返信",
    replies: "件の返信",
    noReplies: "まだ返信がありません",
    postReply: "返信する",
    cancel: "キャンセル",
    create: "作成",
    close: "閉じる",
    back: "戻る",
    online: "オンライン",
    offline: "オフライン",

    // Sidebar
    threads: "スレッド",
    allThreads: "すべてのスレッド",
    myThreads: "自分のスレッド",
    mentioned: "メンションされた",
    categories: "カテゴリ",

    // Ecodan Categories
    installation: "施工",
    commissioning: "試運転",
    troubleshooting: "故障対応",
    spec_consultation: "仕様相談",

    // Equipment Tags
    tags: "機器タグ",
    outdoor_unit: "室外機",
    hydrobox: "Hydrobox",
    remote: "リモコン",
    wiring: "配線",
    heating: "暖房",
    hot_water: "給湯",
    cooling: "冷房",

    // Thread Status
    statusLabel: "ステータス",
    statusOpen: "質問中",
    statusClosed: "解決済み",
    markResolved: "解決済みにする",
    reopenThread: "再オープン",

    // Thread
    threadTitle: "タイトル",
    threadTitlePlaceholder: "質問を入力してください",
    threadBody: "説明",
    threadBodyPlaceholder: "詳細を記入してください... @ユーザー名でメンションできます",
    category: "カテゴリ",
    selectTags: "機器タグを選択",
    startedBy: "投稿者",
    replyPlaceholder: "返信を書く... @ユーザー名でメンションできます",

    // User
    profile: "プロフィール",
    settings: "設定",
    signOut: "ログアウト",

    // Time
    justNow: "たった今",
    minutesAgo: "{n}分前",
    hoursAgo: "{n}時間前",
    daysAgo: "{n}日前",

    // Empty
    noThreads: "スレッドが見つかりません",
    noThreadsDesc: "最初のディスカッションを始めましょう！",
    noResults: "結果が見つかりません",
    noResultsDesc: "別のキーワードで検索してください",

    // Attachments
    attachImage: "画像を添付",
    attachVoice: "声を添付",
    recording: "録音中...",
    recordingTime: "{n}秒",
    tapToStop: "タップで停止",
    voiceMessage: "音声メッセージ",
    removeAttachment: "削除",
    imageAttached: "画像{n}件添付",
    remainingTime: "残り{n}秒",
    play: "再生",
    pause: "一時停止",

    // Translation
    translate: "翻訳",
    translating: "翻訳中...",
    showOriginal: "原文を表示",
  },
} as const

export type TranslationKey = keyof typeof translations.en

export function t(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[locale][key] || translations.en[key] || key
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }
  return text
}
