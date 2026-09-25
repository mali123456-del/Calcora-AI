export type TutorLanguage = {
  code: string;
  name: string;
  nativeName: string;
  mathLocale: string;
  direction: 'ltr' | 'rtl';
  capability: 'A' | 'B' | 'C';
};

export const TUTOR_LANGUAGES: readonly TutorLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', mathLocale: 'en-US', direction: 'ltr', capability: 'A' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', mathLocale: 'ur-PK', direction: 'rtl', capability: 'A' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', mathLocale: 'hi-IN', direction: 'ltr', capability: 'A' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', mathLocale: 'ar', direction: 'rtl', capability: 'A' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', mathLocale: 'fa-IR', direction: 'rtl', capability: 'C' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', mathLocale: 'bn-BD', direction: 'ltr', capability: 'A' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', mathLocale: 'pa-IN', direction: 'ltr', capability: 'A' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', mathLocale: 'gu-IN', direction: 'ltr', capability: 'A' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', mathLocale: 'mr-IN', direction: 'ltr', capability: 'A' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', mathLocale: 'ta-IN', direction: 'ltr', capability: 'A' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', mathLocale: 'te-IN', direction: 'ltr', capability: 'A' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', mathLocale: 'kn-IN', direction: 'ltr', capability: 'C' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', mathLocale: 'ml-IN', direction: 'ltr', capability: 'C' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', mathLocale: 'tr-TR', direction: 'ltr', capability: 'A' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', mathLocale: 'id-ID', direction: 'ltr', capability: 'A' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', mathLocale: 'ms-MY', direction: 'ltr', capability: 'B' },
  { code: 'fr', name: 'French', nativeName: 'Français', mathLocale: 'fr-FR', direction: 'ltr', capability: 'A' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', mathLocale: 'de-DE', direction: 'ltr', capability: 'A' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', mathLocale: 'es-ES', direction: 'ltr', capability: 'A' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', mathLocale: 'pt-BR', direction: 'ltr', capability: 'A' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', mathLocale: 'it-IT', direction: 'ltr', capability: 'A' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', mathLocale: 'ru-RU', direction: 'ltr', capability: 'A' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', mathLocale: 'uk-UA', direction: 'ltr', capability: 'B' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', mathLocale: 'zh-CN', direction: 'ltr', capability: 'A' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', mathLocale: 'ja-JP', direction: 'ltr', capability: 'A' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', mathLocale: 'ko-KR', direction: 'ltr', capability: 'A' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', mathLocale: 'nl-NL', direction: 'ltr', capability: 'A' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', mathLocale: 'pl-PL', direction: 'ltr', capability: 'A' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', mathLocale: 'cs-CZ', direction: 'ltr', capability: 'B' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', mathLocale: 'sk-SK', direction: 'ltr', capability: 'B' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', mathLocale: 'ro-RO', direction: 'ltr', capability: 'B' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', mathLocale: 'hu-HU', direction: 'ltr', capability: 'B' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', mathLocale: 'el-GR', direction: 'ltr', capability: 'B' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', mathLocale: 'sv-SE', direction: 'ltr', capability: 'B' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', mathLocale: 'da-DK', direction: 'ltr', capability: 'B' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', mathLocale: 'nb-NO', direction: 'ltr', capability: 'B' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', mathLocale: 'fi-FI', direction: 'ltr', capability: 'B' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', mathLocale: 'is-IS', direction: 'ltr', capability: 'C' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', mathLocale: 'bg-BG', direction: 'ltr', capability: 'C' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', mathLocale: 'sr-RS', direction: 'ltr', capability: 'C' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', mathLocale: 'hr-HR', direction: 'ltr', capability: 'C' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', mathLocale: 'sl-SI', direction: 'ltr', capability: 'C' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', mathLocale: 'bs-BA', direction: 'ltr', capability: 'C' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', mathLocale: 'sq-AL', direction: 'ltr', capability: 'C' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', mathLocale: 'mk-MK', direction: 'ltr', capability: 'C' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', mathLocale: 'ka-GE', direction: 'ltr', capability: 'C' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', mathLocale: 'hy-AM', direction: 'ltr', capability: 'C' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', mathLocale: 'az-AZ', direction: 'ltr', capability: 'C' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', mathLocale: 'kk-KZ', direction: 'ltr', capability: 'C' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', mathLocale: 'uz-UZ', direction: 'ltr', capability: 'C' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', mathLocale: 'ky-KG', direction: 'ltr', capability: 'C' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', mathLocale: 'tg-TJ', direction: 'ltr', capability: 'C' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', mathLocale: 'tk-TM', direction: 'ltr', capability: 'C' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', mathLocale: 'mn-MN', direction: 'ltr', capability: 'C' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', mathLocale: 'he-IL', direction: 'rtl', capability: 'C' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', mathLocale: 'sw-KE', direction: 'ltr', capability: 'B' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', mathLocale: 'so-SO', direction: 'ltr', capability: 'C' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', mathLocale: 'am-ET', direction: 'ltr', capability: 'C' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', mathLocale: 'ha-NG', direction: 'ltr', capability: 'C' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', mathLocale: 'yo-NG', direction: 'ltr', capability: 'C' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', mathLocale: 'zu-ZA', direction: 'ltr', capability: 'C' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', mathLocale: 'af-ZA', direction: 'ltr', capability: 'C' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', mathLocale: 'xh-ZA', direction: 'ltr', capability: 'C' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', mathLocale: 'rw-RW', direction: 'ltr', capability: 'C' },
  { code: 'st', name: 'Southern Sotho', nativeName: 'Sesotho', mathLocale: 'st-ZA', direction: 'ltr', capability: 'C' },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', mathLocale: 'tn-ZA', direction: 'ltr', capability: 'C' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', mathLocale: 'ig-NG', direction: 'ltr', capability: 'C' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', mathLocale: 'mg-MG', direction: 'ltr', capability: 'C' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', mathLocale: 'ne-NP', direction: 'ltr', capability: 'C' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', mathLocale: 'si-LK', direction: 'ltr', capability: 'C' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', mathLocale: 'my-MM', direction: 'ltr', capability: 'C' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', mathLocale: 'km-KH', direction: 'ltr', capability: 'C' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', mathLocale: 'lo-LA', direction: 'ltr', capability: 'C' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', mathLocale: 'th-TH', direction: 'ltr', capability: 'B' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', mathLocale: 'vi-VN', direction: 'ltr', capability: 'B' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', mathLocale: 'fil-PH', direction: 'ltr', capability: 'C' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', mathLocale: 'jv-ID', direction: 'ltr', capability: 'C' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', mathLocale: 'su-ID', direction: 'ltr', capability: 'C' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', mathLocale: 'ceb-PH', direction: 'ltr', capability: 'C' },
  { code: 'mi', name: 'Māori', nativeName: 'Te Reo Māori', mathLocale: 'mi-NZ', direction: 'ltr', capability: 'C' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa', mathLocale: 'sm-WS', direction: 'ltr', capability: 'C' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Fakatonga', mathLocale: 'to-TO', direction: 'ltr', capability: 'C' },
  { code: 'fj', name: 'Fijian', nativeName: 'Vosa Vakaviti', mathLocale: 'fj-FJ', direction: 'ltr', capability: 'C' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', mathLocale: 'cy-GB', direction: 'ltr', capability: 'C' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', mathLocale: 'ga-IE', direction: 'ltr', capability: 'C' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig', mathLocale: 'gd-GB', direction: 'ltr', capability: 'C' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', mathLocale: 'ca-ES', direction: 'ltr', capability: 'C' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', mathLocale: 'eu-ES', direction: 'ltr', capability: 'C' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', mathLocale: 'gl-ES', direction: 'ltr', capability: 'C' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', mathLocale: 'mt-MT', direction: 'ltr', capability: 'C' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', mathLocale: 'lt-LT', direction: 'ltr', capability: 'C' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', mathLocale: 'lv-LV', direction: 'ltr', capability: 'C' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', mathLocale: 'et-EE', direction: 'ltr', capability: 'C' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', mathLocale: 'eo', direction: 'ltr', capability: 'C' },
  { code: 'la', name: 'Latin', nativeName: 'Latina', mathLocale: 'la', direction: 'ltr', capability: 'C' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', mathLocale: 'co-FR', direction: 'ltr', capability: 'C' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', mathLocale: 'lb-LU', direction: 'ltr', capability: 'C' },
  { code: 'fy', name: 'Western Frisian', nativeName: 'Frysk', mathLocale: 'fy-NL', direction: 'ltr', capability: 'C' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob', mathLocale: 'hmn', direction: 'ltr', capability: 'C' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', mathLocale: 'ku', direction: 'ltr', capability: 'C' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', mathLocale: 'ps-AF', direction: 'rtl', capability: 'C' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', mathLocale: 'sd-PK', direction: 'rtl', capability: 'C' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', mathLocale: 'or-IN', direction: 'ltr', capability: 'C' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', mathLocale: 'as-IN', direction: 'ltr', capability: 'C' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', mathLocale: 'mai-IN', direction: 'ltr', capability: 'C' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', mathLocale: 'sa-IN', direction: 'ltr', capability: 'C' },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་ཡིག', mathLocale: 'bo-CN', direction: 'ltr', capability: 'C' },
  { code: 'dz', name: 'Dzongkha', nativeName: 'རྫོང་ཁ', mathLocale: 'dz-BT', direction: 'ltr', capability: 'C' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', mathLocale: 'ug-CN', direction: 'rtl', capability: 'C' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', mathLocale: 'yi', direction: 'rtl', capability: 'C' },
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi', mathLocale: 'qu-PE', direction: 'ltr', capability: 'C' },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ", mathLocale: 'gn-PY', direction: 'ltr', capability: 'C' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', mathLocale: 'ht-HT', direction: 'ltr', capability: 'C' },
  { code: 'tw', name: 'Twi', nativeName: 'Twi', mathLocale: 'tw-GH', direction: 'ltr', capability: 'C' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', mathLocale: 'wo-SN', direction: 'ltr', capability: 'C' },
] as const;

const RTL = new Set(['ur','ar','fa','he','ps','sd','ug','yi']);
const TIER_A = new Set(['en','ur','hi','ar','fr','de','es','pt','it','ru','zh','ja','ko','tr','id','bn','pa','ta','te','mr','gu','nl','pl']);
const tierFor = (code: string): TutorLanguage['capability'] => TIER_A.has(code) ? 'A' : ['cs','sk','ro','hu','uk','vi','th','ms','sw','el','sv','da','no','fi'].includes(code) ? 'B' : 'C';

export const DEFAULT_TUTOR_LANGUAGE = 'en';

export function getTutorLanguage(value: unknown): TutorLanguage {
  const found = TUTOR_LANGUAGES.find(language => language.code === value);
  if (found) return found;
  return TUTOR_LANGUAGES.find(language => language.code === DEFAULT_TUTOR_LANGUAGE)!;
}

export function isTutorLanguage(value: unknown): value is string {
  return typeof value === 'string' && TUTOR_LANGUAGES.some(language => language.code === value);
}

export function getTutorLanguageCapability(code: string) {
  const language = getTutorLanguage(code);
  return { ...language, direction: RTL.has(language.code) ? 'rtl' as const : 'ltr' as const, capability: tierFor(language.code) };
}

export function searchTutorLanguages(query: string): TutorLanguage[] {
  const q = query.trim().toLowerCase();
  return TUTOR_LANGUAGES.filter(language => !q || language.code.includes(q) || language.name.toLowerCase().includes(q) || language.nativeName.toLowerCase().includes(q)).map(language => ({ ...language, direction: RTL.has(language.code) ? 'rtl' : 'ltr', capability: tierFor(language.code) }));
}
