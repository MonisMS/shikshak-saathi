// Classrooms (F52), Library (F55) and Schedule (F53) are unticked in roadmap.md §3 —
// no page exists for them in this build, so they're left out of the sidebar.
export const NAV_LINKS = [
  { href: "/dashboard", group: "menu", label: { en: "Dashboard", hi: "डैशबोर्ड" } },
  { href: "/kits/new", group: "menu", label: { en: "New lesson kit", hi: "नई किट" } },
  { href: "/kits", group: "menu", label: { en: "My kits", hi: "मेरी किट्स" } },
  { href: "/notes", group: "menu", label: { en: "Class notes", hi: "कक्षा नोट्स" } },
  { href: "/settings", group: "general", label: { en: "Settings", hi: "सेटिंग्स" } },
] as const;
