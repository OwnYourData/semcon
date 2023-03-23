import { i18nObject } from "vaultifier";

// currently vaultifier only supports English
const language = 'en';

export const getTranslation = (obj: i18nObject | string) => {
  if (typeof obj === 'string')
    return obj;

  return obj[language];
}