/**
 * Everything the screens say about Henox.
 *
 * Kept as data rather than JSX so the same content drives the 3D surfaces, the
 * DOM fallback and the OG image without three copies drifting apart.
 */

export const PROFILE = {
  name: "Henox",
  role: "Full-stack geliştirici",
  location: "İstanbul, Türkiye",
  links: [
    { label: "GitHub", href: "https://github.com/Henox77", handle: "Henox77" },
    { label: "Site", href: "https://henox.dev", handle: "henox.dev" },
  ],
  /**
   * Two short paragraphs. The monitor is 27 inches, not a page — anything
   * longer stops being read and starts being skipped.
   */
  bio: [
    "Doğru ve kararlı çalışması gereken sistemler geliştiriyorum: modern web arayüzleri, API'ler ve backend servisleri.",
    "Commit geçmişi canlıdır: Repolara gerçekte ne gönderildiyse o görünür, özet değildir ve düzenlenemez.",
  ],
  githubSince: 2022,
} as const;

/** The stack, grouped the way it's actually used rather than alphabetically. */
export const SKILLS: { group: string; items: string[] }[] = [
  {
    group: "Frontend",
    items: ["HTML5", "CSS3", "JavaScript", "React", "Next.js", "Vite", "Tailwind CSS"],
  },
  {
    group: "Backend & API",
    items: ["Node.js", "PHP", "Laravel", "ASP.NET Core", "Python"],
  },
  {
    group: "Veritabanı & DevOps",
    items: ["SQL / DB", "PostgreSQL", "Docker"],
  },
];
