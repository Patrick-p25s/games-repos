
"use client"
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import es from '@/locales/es.json';
import mg from '@/locales/mg.json';

export type Language = 'en' | 'fr' | 'es' | 'mg';

type Translations = {
  [key: string]: any;
};

const translations: Record<Language, Translations> = {
  en,
  fr,
  es,
  mg,
};

interface LocaleContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem('language') as Language;
    if (storedLang && ['en', 'fr', 'es', 'mg'].includes(storedLang)) {
      setLanguage(storedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = useCallback((key: string, replacements?: Record<string, string | number>) => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            // Fallback to English if key not found
            result = en;
            for (const fk of keys) {
                 if (result && typeof result === 'object' && fk in result) {
                    result = result[fk];
                 } else {
                    return key; // return key if not found in fallback
                 }
            }
            break;
        }
    }
    
    let str = String(result || key);

    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            str = str.replace(`{${rKey}}`, String(replacements[rKey]));
        });
    }

    return str;
  }, [language]);

  return (
    <LocaleContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
