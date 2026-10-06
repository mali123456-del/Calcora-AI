import { getTutorLanguage } from '../ai/tutorLanguages';

/** Resolve a selected/automatic browser speech locale to a locale the Tutor knows. */
export function resolveSpeechRecognitionLocale(
  selectedLanguage: string,
  browserLocale = 'en-US',
): string {
  if (selectedLanguage !== 'auto') return getTutorLanguage(selectedLanguage).mathLocale;

  const browserLanguage = browserLocale.split('-')[0].toLowerCase();
  return getTutorLanguage(browserLanguage).mathLocale;
}
