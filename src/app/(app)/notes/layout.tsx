import { Noto_Serif, Noto_Serif_Devanagari } from "next/font/google";

// Wispr-style serif headings for Class Notes (screen + PDF); scoped here so other pages don't load them.
const notoSerif = Noto_Serif({ variable: "--font-note-serif", subsets: ["latin"] });
const notoSerifDevanagari = Noto_Serif_Devanagari({ variable: "--font-note-serif-deva", subsets: ["devanagari"] });

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${notoSerif.variable} ${notoSerifDevanagari.variable}`}>{children}</div>;
}
