export type TutorLanguage = {
  code: string;
  name: string;
  nativeName: string;
  mathLocale: string;
  direction: 'ltr' | 'rtl';
  capability: 'A' | 'B' | 'C';
};

export const TUTOR_LANGUAGES: readonly TutorLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English', mathLocale: 'en-US' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', mathLocale: 'ur-PK' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', mathLocale: 'hi-IN' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', mathLocale: 'ar' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', mathLocale: 'fa-IR' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', mathLocale: 'bn-BD' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', mathLocale: 'pa-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', mathLocale: 'gu-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', mathLocale: 'mr-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', mathLocale: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', mathLocale: 'te-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', mathLocale: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', mathLocale: 'ml-IN' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', mathLocale: 'tr-TR' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', mathLocale: 'id-ID' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', mathLocale: 'ms-MY' },
  { code: 'fr', name: 'French', nativeName: 'Français', mathLocale: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', mathLocale: 'de-DE' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', mathLocale: 'es-ES' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', mathLocale: 'pt-BR' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', mathLocale: 'it-IT' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', mathLocale: 'ru-RU' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', mathLocale: 'uk-UA' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', mathLocale: 'zh-CN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', mathLocale: 'ja-JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', mathLocale: 'ko-KR' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', mathLocale: 'nl-NL' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', mathLocale: 'pl-PL' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', mathLocale: 'cs-CZ' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', mathLocale: 'sk-SK' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', mathLocale: 'ro-RO' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', mathLocale: 'hu-HU' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', mathLocale: 'el-GR' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', mathLocale: 'sv-SE' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', mathLocale: 'da-DK' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', mathLocale: 'nb-NO' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', mathLocale: 'fi-FI' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', mathLocale: 'is-IS' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', mathLocale: 'bg-BG' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', mathLocale: 'sr-RS' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', mathLocale: 'hr-HR' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', mathLocale: 'sl-SI' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', mathLocale: 'bs-BA' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', mathLocale: 'sq-AL' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', mathLocale: 'mk-MK' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', mathLocale: 'ka-GE' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', mathLocale: 'hy-AM' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', mathLocale: 'az-AZ' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', mathLocale: 'kk-KZ' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', mathLocale: 'uz-UZ' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', mathLocale: 'ky-KG' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', mathLocale: 'tg-TJ' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', mathLocale: 'tk-TM' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', mathLocale: 'mn-MN' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', mathLocale: 'he-IL' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', mathLocale: 'sw-KE' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', mathLocale: 'so-SO' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', mathLocale: 'am-ET' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', mathLocale: 'ha-NG' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', mathLocale: 'yo-NG' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', mathLocale: 'zu-ZA' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', mathLocale: 'af-ZA' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', mathLocale: 'xh-ZA' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', mathLocale: 'rw-RW' },
  { code: 'st', name: 'Southern Sotho', nativeName: 'Sesotho', mathLocale: 'st-ZA' },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', mathLocale: 'tn-ZA' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', mathLocale: 'ig-NG' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', mathLocale: 'mg-MG' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', mathLocale: 'ne-NP' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', mathLocale: 'si-LK' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', mathLocale: 'my-MM' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', mathLocale: 'km-KH' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', mathLocale: 'lo-LA' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', mathLocale: 'th-TH' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', mathLocale: 'vi-VN' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', mathLocale: 'fil-PH' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', mathLocale: 'jv-ID' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', mathLocale: 'su-ID' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', mathLocale: 'ceb-PH' },
  { code: 'mi', name: 'Māori', nativeName: 'Te Reo Māori', mathLocale: 'mi-NZ' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa', mathLocale: 'sm-WS' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Fakatonga', mathLocale: 'to-TO' },
  { code: 'fj', name: 'Fijian', nativeName: 'Vosa Vakaviti', mathLocale: 'fj-FJ' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', mathLocale: 'cy-GB' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', mathLocale: 'ga-IE' },
  { code: 'gd', name: 'Scottish Gaelic', nativeName: 'Gàidhlig', mathLocale: 'gd-GB' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', mathLocale: 'ca-ES' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', mathLocale: 'eu-ES' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', mathLocale: 'gl-ES' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', mathLocale: 'mt-MT' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', mathLocale: 'lt-LT' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', mathLocale: 'lv-LV' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', mathLocale: 'et-EE' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', mathLocale: 'eo' },
  { code: 'la', name: 'Latin', nativeName: 'Latina', mathLocale: 'la' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', mathLocale: 'co-FR' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', mathLocale: 'lb-LU' },
  { code: 'fy', name: 'Western Frisian', nativeName: 'Frysk', mathLocale: 'fy-NL' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob', mathLocale: 'hmn' },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', mathLocale: 'ku' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', mathLocale: 'ps-AF' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', mathLocale: 'sd-PK' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', mathLocale: 'or-IN' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', mathLocale: 'as-IN' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', mathLocale: 'mai-IN' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', mathLocale: 'sa-IN' },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་ཡིག', mathLocale: 'bo-CN' },
  { code: 'dz', name: 'Dzongkha', nativeName: 'རྫོང་ཁ', mathLocale: 'dz-BT' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', mathLocale: 'ug-CN' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', mathLocale: 'yi' },
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi', mathLocale: 'qu-PE' },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ", mathLocale: 'gn-PY' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', mathLocale: 'ht-HT' },
  { code: 'tw', name: 'Twi', nativeName: 'Twi', mathLocale: 'tw-GH' },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', mathLocale: 'wo-SN' },
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
