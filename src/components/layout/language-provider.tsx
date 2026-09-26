"use client";

import { createContext, useContext, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { t, type Lang, type DictKey } from "@/lib/i18n";

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

/** F29: wraps the (app) shell so the topbar toggle updates everything instantly,
 * with the choice persisted to the teacher's `uiLanguage` field. */
export function LanguageProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return initialLang;
    const stored = window.localStorage.getItem("ui-lang");
    return stored === "en" || stored === "hi" ? stored : initialLang;
  });

  function setLang(next: Lang) {
    setLangState(next);
    try {
      window.localStorage.setItem("ui-lang", next);
    } catch {
      // localStorage can throw in private-browsing mode — the in-memory state still works.
    }
    void authClient.updateUser({ uiLanguage: next });
  }

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const { lang } = useLanguage();
  return (key: DictKey) => t(key, lang);
}
