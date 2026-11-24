/**
 * Hebrew UI text (P36). English templates are the keys; `t` fills `{name}` placeholders and falls back to English for
 * anything without a Hebrew entry. The brand name stays in English.
 */
export const LANGS = ['en', 'he'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_NAMES: Readonly<Record<Lang, string>> = { en: 'English', he: 'עברית' };
export const isRtl = (lang: Lang): boolean => lang === 'he';

export const HE: Readonly<Record<string, string>> = {
  // Title card
  'Asteroids are falling toward Earth. Shoot them down. Photons chip, rockets home in. Reload at the mothership\'s hangar.': 'אסטרואידים נופלים לעבר כדור הארץ. הפילו אותם! פוטונים מסתתים, טילים ננעלים על המטרה. מתמלאים מחדש בהאנגר של ספינת האם.',
  'Best score: {best} · ◆ {credits} credits': 'שיא: {best} · ◆ {credits} קרדיטים',
  'Click to start': 'לחצו כדי להתחיל',
  'Tap to start': 'הקישו כדי להתחיל',
  'Press Start to play': 'לחצו Start כדי לשחק',
  'Click to resume': 'לחצו כדי להמשיך',
  'Tap to resume': 'הקישו כדי להמשיך',
  'Press Start to resume': 'לחצו Start כדי להמשיך',
  '📅 Daily challenge · {date}': '📅 אתגר יומי · {date}',
  ' · best {best}': ' · שיא {best}',
  'Same asteroids for everyone today · Normal · Fighter · no upgrades': 'אותם אסטרואידים לכולם היום · רגיל · Fighter · בלי שדרוגים',
  'Enter also starts · Esc or P pauses · H shows the controls · M mutes': 'Enter מתחיל · Esc או P עוצרים · H מציג מקשים · M משתיק',
  'Ⅱ pauses · landscape works best': 'Ⅱ עוצר · עדיף לרוחב',
  'Settings': 'הגדרות',
  'Achievements {n}/{total}': 'הישגים {n}/{total}',
  '🎓 Replay the tutorial': '🎓 הדרכה מחדש',
  // Pause / end cards
  'Paused': 'הפסקה',
  'Score {score} · Enter or P also resumes': 'ניקוד {score} · Enter או P ממשיכים',
  'Earth has fallen.': 'כדור הארץ נפל.',
  'Your ship was destroyed.': 'החללית שלך הושמדה.',
  'Game over': 'המשחק נגמר',
  'You saved Earth!': 'הצלתם את כדור הארץ!',
  '🌍 Earth is safe!': '🌍 כדור הארץ מוגן!',
  'You cleared all {waves} waves on {difficulty}.': 'עברתם את כל {waves} הגלים ברמת {difficulty}.',
  'Keep going: endless mode': 'ממשיכים: מצב אינסופי',
  'Finish the run': 'סיום הריצה',
  'NEW BEST!': 'שיא חדש!',
  'NEW DAILY BEST!': 'שיא יומי חדש!',
  'Best {best}': 'שיא {best}',
  'Today\'s best {best}': 'השיא של היום {best}',
  'Play again': 'שחקו שוב',
  'This run': 'הריצה הזאת',
  'Total': 'סה״כ',
  'Difficulty': 'רמת קושי',
  'Time': 'זמן',
  'Photon accuracy': 'דיוק פוטונים',
  'Rockets fired': 'טילים ששוגרו',
  'Earth hits taken': 'פגיעות בכדור הארץ',
  'Earth bonus': 'בונוס כדור הארץ',
  'Credits earned': 'קרדיטים שהורווחו',
  '🏆 Unlocked: {list}': '🏆 נפתחו: {list}',
  // Shop
  '🛰️ Station shop · ◆ {credits} credits': '🛰️ חנות התחנה · ◆ {credits} קרדיטים',
  '1–7 or click buys · upgrades stay with this ship · B or Enter flies on': '1–7 או לחיצה קונים · השדרוגים נשמרים לחללית הזאת · B או Enter ממשיכים',
  'Photon damage': 'נזק פוטונים',
  'Fire rate': 'קצב אש',
  'Hull plating': 'שריון גוף',
  'Earth shield': 'מגן כדור הארץ',
  'Engines': 'מנועים',
  'Perk duration': 'משך בונוסים',
  'Lock-on missiles': 'טילי נעילה',
  '+1 damage per photon hit': '‎+1 נזק לכל פגיעת פוטון',
  'photons recharge 1 tick faster': 'הפוטונים נטענים מהר יותר',
  '+20 hull': '‎+20 לגוף',
  '3 s of shield at each wave start': '3 שניות מגן בתחילת כל גל',
  '+10 % forward speed': '‎+10% מהירות',
  'timed perks last 20 % longer': 'בונוסים נמשכים 20% יותר',
  'hold rocket to lock +1 target per level': 'החזיקו טיל כדי לנעול מטרה נוספת לכל דרגה',
  // HUD
  'EARTH': 'כדור הארץ',
  'HULL': 'גוף',
  'FUEL': 'דלק',
  'ROCKETS': 'טילים',
  'SPEED': 'מהירות',
  'TURBO': 'טורבו',
  'best {best}': 'שיא {best}',
  'EARTH CRITICAL': 'כדור הארץ במצב קריטי',
  'HULL CRITICAL': 'הגוף במצב קריטי',
  'HULL DAMAGED': 'הגוף פגוע',
  'NO FUEL': 'אין דלק',
  'NO ROCKETS: RELOAD AT THE MOTHERSHIP OR STATION': 'אין טילים: מלאו מחדש בספינת האם או בתחנה',
  'B: STATION SHOP': 'B: חנות התחנה',
  // Banners
  'Wave {n} of {total}': 'גל {n} מתוך {total}',
  'Endless wave {n}': 'גל אינסופי {n}',
  'Wave {n} cleared': 'גל {n} נוקה',
  '⚠ Boss incoming': '⚠ בוס מתקרב',
  'Boss destroyed!': 'הבוס הושמד!',
  // Settings
  'Language': 'שפה',
  '🎬 Watch replay ({score})': '🎬 צפייה בשידור חוזר ({score})',
  '⬇ Export replay': '⬇ ייצוא שידור חוזר',
  '⬆ Import': '⬆ ייבוא',
  '⬆ Import replay': '⬆ ייבוא שידור חוזר',
  '🎬 Replay finished': '🎬 השידור החוזר הסתיים',
  '🎬 REPLAY': '🎬 שידור חוזר',
  'P or Esc pauses': 'P או Esc עוצרים',
  'Not a replay file': 'זה לא קובץ שידור חוזר',
  'Kills ({kills}, {big} big)': 'פגיעות ({kills}, {big} גדולים)',
  'Combo bonus (best chain {n})': 'בונוס רצף (הרצף הטוב {n})',
  'Objectives ({n})': 'משימות ({n})',
  'Wave clears ({n})': 'גלים שנוקו ({n})',
  '◆ {earned} (wallet {wallet})': '◆ {earned} (בארנק {wallet})',
  'modern': 'מודרני',
  'classic': 'קלאסי',
  'chase': 'מרדף',
  'auto': 'אוטומטי',
  'high': 'גבוהה',
  'medium': 'בינונית',
  'low': 'נמוכה',
  'set by URL': 'נקבע בכתובת',
  'Slower asteroids, Earth heals between waves, wide rocket lock, unlimited turbo.': 'אסטרואידים איטיים, כדור הארץ מתרפא בין גלים, נעילת טילים רחבה, טורבו ללא הגבלה.',
  'The original game’s pace, escalating over 10 waves.': 'הקצב של המשחק המקורי, מחמיר לאורך 10 גלים.',
  'Faster, denser asteroids that hit Earth harder.': 'אסטרואידים מהירים וצפופים יותר שפוגעים חזק יותר.',
  'The original ship. Balanced.': 'החללית המקורית. מאוזנת.',
  'Turns faster; less fuel, hull and one rocket fewer.': 'מסתובבת מהר יותר; פחות דלק, גוף וטיל אחד פחות.',
  'Turns slower; more fuel, a tougher hull and five rockets.': 'מסתובבת לאט יותר; יותר דלק, גוף חזק וחמישה טילים.',
  'All-rounder: turns a bit faster, more fuel and an extra rocket; thinner hull.': 'רב-תכליתית: מסתובבת קצת מהר יותר, יותר דלק וטיל נוסף; גוף דק יותר.',
  'turn {turn} · fuel {fuel} · hull {hull} · rockets {rockets}': 'סיבוב {turn} · דלק {fuel} · גוף {hull} · טילים {rockets}',
  'Keys': 'מקשים',
  'Camera': 'מצלמה',
  'Invert mouse Y': 'היפוך עכבר אנכי',
  'Mouse sensitivity': 'רגישות עכבר',
  'Volume': 'עוצמה',
  'Sound': 'צליל',
  'Screen shake': 'רעידת מסך',
  'Graphics': 'גרפיקה',
  'Controls in play': 'מקשים במשחק',
  'on': 'פועל',
  'off': 'כבוי',
  'next run': 'בריצה הבאה',
  // Difficulty and crafts
  'Kid / Easy': 'ילדים / קל',
  'Normal': 'רגיל',
  'Hard': 'קשה',
  // Tutorial
  'Tutorial {n}/{total}': 'הדרכה {n}/{total}',
  'Skip (K)': 'דילוג (K)',
  'Aim: move the mouse (or the left stick) to turn the ship.': 'כיוון: הזיזו את העכבר (או את הסטיק השמאלי) כדי לסובב את החללית.',
  'Aim: drag the left side of the screen to turn the ship.': 'כיוון: גררו בצד השמאלי של המסך כדי לסובב את החללית.',
  'Fire: hold Space or the left mouse button to shoot photons.': 'ירי: החזיקו רווח או את כפתור העכבר השמאלי כדי לירות פוטונים.',
  'Fire: hold FIRE to shoot photons.': 'ירי: החזיקו FIRE כדי לירות פוטונים.',
  'Rockets: press V or the right mouse button to launch a homing rocket.': 'טילים: לחצו V או את כפתור העכבר הימני כדי לשגר טיל מונחה.',
  'Rockets: tap ROCKET to launch a homing rocket.': 'טילים: הקישו ROCKET כדי לשגר טיל מונחה.',
  'Throttle: W or the mouse wheel speeds up (hold Shift for turbo).': 'מצערת: W או גלגלת העכבר מאיצים (Shift לטורבו).',
  'Throttle: slide the throttle up to speed up.': 'מצערת: הזיזו את המצערת למעלה כדי להאיץ.',
  'Reload: fly back into the mothership\'s hangar (or the station) to refill.': 'מילוי: טוסו בחזרה להאנגר של ספינת האם (או לתחנה) כדי להתמלא.',
  'Tutorial done. Good luck, pilot!': 'ההדרכה הסתיימה. בהצלחה, טייסים!',
  // Photo mode (P38)
  '📷 Photo mode (F)': '📷 מצב צילום (F)',
  'Photo mode': 'מצב צילום',
  'Save photo (Enter)': 'שמירת תמונה (Enter)',
  'Exit (Esc)': 'יציאה (Esc)',
  'Filter: {name}': 'מסנן: {name}',
  'Focus: {name}': 'מיקוד: {name}',
  'None': 'ללא',
  'Cinematic': 'קולנועי',
  'Black and white': 'שחור־לבן',
  'Vintage': 'וינטג׳',
  'Ship': 'חללית',
  'Earth': 'כדור הארץ',
  '📷 Photo saved': '📷 התמונה נשמרה',
  "Couldn't save the photo": 'לא ניתן לשמור את התמונה',
  'Drag to orbit · wheel zooms · WASD flies · F focuses · [ ] filters · Enter saves · Esc exits': 'גרירה לסובב · גלגלת לזום · WASD לטוס · F למיקוד · [ ] למסנן · Enter שומר · Esc יוצא',
  'Drag to orbit · buttons save and exit · F focuses · filters on the bar': 'גרירה לסובב · הכפתורים שומרים ויוצאים · F למיקוד · המסננים בסרגל',
  'Left stick orbits · bumpers zoom · right stick flies · A saves · Start exits · Y filter · X focus': 'סטיק שמאלי מסובב · באמפרים לזום · סטיק ימני לטוס · A שומר · Start יוצא · Y מסנן · X מיקוד',
  // Paint colours (P39)
  'Paint: {name} · saved for this ship': 'צבע: {name} · נשמר לחללית הזאת',
  'Stock': 'מקורי',
  'Ember': 'גחלת',
  'Ice': 'קרח',
  'Gold': 'זהב',
  'Obsidian': 'אובסידיאן',
  'Crimson': 'ארגמן',
  'Azure': 'תכלת',
  'Violet': 'סגול',
  '{name} · ◆ {cost}': '{name} · ◆ {cost}',
  '{name} · {how}': '{name} · {how}',
  'Need {cost} credits': 'חסרים {cost} קרדיטים',
  "Couldn't buy that paint": 'לא ניתן לקנות את הצבע הזה',
  // Two-player (P40)
  '🎮 2 players': '🎮 2 שחקנים',
  'Two gamepads · shared Earth · split screen': 'שני שלטים · כדור הארץ משותף · מסך מפוצל',
  'Reconnect a gamepad': 'חברו שלט מחדש',
  'SHIP DESTROYED': 'החללית הושמדה',
};

/** The text for `en` in `lang`, with `{name}` placeholders filled from `vars`. */
export function t(lang: Lang, en: string, vars: Readonly<Record<string, string | number>> = {}): string {
  const template = lang === 'he' ? (HE[en] ?? en) : en;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** The {names} in a template, sorted, for checking translations keep every placeholder. */
export const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

/** A banner title in `lang`: the fixed titles and the numbered wave ones. */
export function bannerTitle(lang: Lang, title: string): string {
  if (lang === 'en') return title;
  let m = /^Wave (\d+) of (\d+)$/.exec(title);
  if (m) return t(lang, 'Wave {n} of {total}', { n: m[1] ?? '', total: m[2] ?? '' });
  m = /^Endless wave (\d+)$/.exec(title);
  if (m) return t(lang, 'Endless wave {n}', { n: m[1] ?? '' });
  m = /^Wave (\d+) cleared$/.exec(title);
  if (m) return t(lang, 'Wave {n} cleared', { n: m[1] ?? '' });
  return t(lang, title);
}
