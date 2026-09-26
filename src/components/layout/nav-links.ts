// Classrooms (F52), Library (F55) and Schedule (F53) are unticked in roadmap.md §3 —
// no page will exist for them in this build, so they're left out of the sidebar
// entirely rather than linking to a 404.
export const NAV_LINKS = [
  { href: "/dashboard", label: { en: "Dashboard", hi: "डैशबोर्ड" } },
  { href: "/kits/new", label: { en: "New lesson kit", hi: "नई किट" } },
  { href: "/kits", label: { en: "My kits", hi: "मेरी किट्स" } },
  { href: "/notes", label: { en: "Class notes", hi: "कक्षा नोट्स" } },
  { href: "/settings", label: { en: "Settings", hi: "सेटिंग्स" } },
] as const;
