// The six categories, matching the design guidelines.
export type Category = 'Sports' | 'People / Culture' | 'Media' | 'Earth' | 'History / Society' | 'Physical Science';
export const CATEGORIES: Category[] = ['Sports', 'People / Culture', 'Media', 'Earth', 'History / Society', 'Physical Science'];

// Each category maps to a color-palette slug used in CSS/Tailwind class names.
export const CATEGORY_SLUG: Record<Category, string> = {
  'Sports': 'sports',
  'People / Culture': 'society',
  'Media': 'entertainment',
  'Earth': 'earth',
  'History / Society': 'history',
  'Physical Science': 'physical-science'
};

// URL-friendly slug derived from the category's display name, used for the
// /play/:category route (e.g. "People / Culture" -> "people-culture"). This is
// intentionally separate from CATEGORY_SLUG above, which names CSS palettes.
export const categoryToSlug = (category: Category): string =>
  category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const slugToCategory = (slug: string): Category | undefined => {
  const normalized = slug.trim().toLowerCase();
  return CATEGORIES.find(c => categoryToSlug(c) === normalized);
};

export interface Card {
  id: string;
  title: string;
  wikipediaLink: string;
  category: Category;
  subCategory?: string; // e.g. "Sports", "Media", "Earth" — from articles_v2.sub_category
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  description: string;
  image: string;
  isReal: boolean;
  explanation: string; // Explaining why it's real or fake
  imageLicense?: string;        // e.g. "CC BY-SA 4.0" — from articles_v2.image_license
  imageCredit?: string;         // photographer / author — from articles_v2.image_credit
  imageAttributionUrl?: string; // link to license/source page — from articles_v2.image_attribution_url
}

export interface CollectedCard {
  id: string;
  collectedAt: string;
  isShowcase: boolean;
  customSection: string | null;
  cardDetails?: Card;
}

// Helper to filter out explicit, sexually suggestive, or inappropriate Wikipedia entries
export const isAppropriateArticle = (row: any): boolean => {
  const title = (row.title || '').toLowerCase();
  const desc = [row.first_sentence, row.second_sentence, row.third_sentence]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const combinedText = `${title} | ${desc}`;

  // List of explicit/inappropriate terms (case-insensitive substrings)
  const explicitSubstrings = [
    'bukkake',
    'hentai',
    'pornograph', // covers porn, pornography, pornographic, porn star, etc.
    'creampie',
    'pegging',
    'fellatio',
    'cunnilingus',
    'anilingus',
    'masturbat', // covers masturbate, masturbation
    'bestiality',
    'ejaculat', // covers ejaculate, ejaculation, pre-ejaculate
    'futanari',
    'xvideos',
    'chaturbate',
    'stripchat',
    'redgifs',
    'rule 34',
    '2 girls 1 cup',
    'facesitting',
    'handjob',
    'blowjob',
    'gangbang',
    'gang bang',
    'double penetration',
    'threesome',
    'orgy',
    'orgies',
    'doggy style',
    'erotica',
    'sadomasochis',
    'bdsm',
    'clop (erotic',
    'vulva',
    'clitoris',
    'penile-vaginal',
    'penile–vaginal',
    'sexual penetration',
    'sexual stimulation',
    'sexual fetish',
    'erotic lactation',
    'erotic humiliation',
    'rape pornography',
    'hardcore pornography',
    'unsimulated sex',
    'celebrity sex tape',
    'child sexual abuse'
  ];

  for (const term of explicitSubstrings) {
    if (combinedText.includes(term)) {
      return false;
    }
  }

  // Standalone word 'sex' check, ignoring 'same-sex' and 'opposite-sex'
  const sexRegex = /(?<!\b(same|opposite)-)\bsex\b/i;
  if (sexRegex.test(title) || sexRegex.test(desc)) {
    return false;
  }

  // Standalone 'sexual' check, ignoring 'sexual dimorphism', 'sexual reproduction', 'sexual selection', 'sexual orientation', 'sexual identity'
  const sexualRegex = /\bsexual\b/i;
  if (sexualRegex.test(title) || sexualRegex.test(desc)) {
    const textWithoutBio = combinedText
      .replace(/sexual dimorphism/g, '')
      .replace(/sexual reproduction/g, '')
      .replace(/sexual selection/g, '')
      .replace(/sexual orientation/g, '')
      .replace(/sexual identity/g, '');
    if (sexualRegex.test(textWithoutBio)) {
      return false;
    }
  }

  // Standalone 'penis', 'vagina', 'semen', 'orgasm'
  const otherExplicitWords = /\b(penis|vagina|semen|orgasm)\b/i;
  if (otherExplicitWords.test(title) || otherExplicitWords.test(desc)) {
    return false;
  }

  // Standalone 'sperm' but not 'sperm whale'
  if (/\bsperm\b/i.test(combinedText)) {
    const textWithoutWhale = combinedText.replace(/sperm whale/g, '');
    if (/\bsperm\b/i.test(textWithoutWhale)) {
      return false;
    }
  }

  return true;
};

// Helper to map a database row to one of the 6 new categories
export const mapRowToHomeCategory = (row: any): Category => {
  const cat = (row.category || '').trim().toLowerCase();
  const sub = (row.sub_category || '').trim().toLowerCase();
  const topic = (row.topic || '').trim().toLowerCase();

  // If the DB sub_category already names one of our categories, trust it.
  const direct = CATEGORIES.find(c => c.toLowerCase() === sub);
  if (direct) return direct;

  // 1. Sports
  if (sub === 'sports' || topic === 'culture.sports') {
    return 'Sports';
  }

  // 2. Media
  if (sub === 'entertainment' || sub === 'media' || topic.startsWith('culture.media') || topic === 'culture.performing_arts') {
    return 'Media';
  }

  // 3. Earth (also absorbs former Animals / life science)
  if (sub === 'earth' || sub === 'animals' || sub === 'life science' || topic.startsWith('geography') || topic === 'stem.earth_and_environment' || topic === 'stem.biology') {
    return 'Earth';
  }

  // 4. History / Society
  if (sub === 'history' || sub === 'history / society' || topic.startsWith('history_and_society.history') || topic === 'history_and_society.military_and_warfare') {
    return 'History / Society';
  }

  // 5. Physical Science (also absorbs former Space)
  if (sub === 'physical science' || sub === 'space' || topic === 'stem.space' || topic === 'stem.technology' || topic === 'stem.engineering' || topic === 'stem.medicine_&_health') {
    return 'Physical Science';
  }

  // 6. People / Culture (default for The Human / any remaining)
  if (cat === 'the human' || sub === 'society' || sub === 'people / culture' || topic.startsWith('history_and_society') || topic.startsWith('culture')) {
    return 'People / Culture';
  }

  // Fallback defaults based on the top-level database category
  if (cat === 'the sciences') return 'Physical Science';
  if (cat === 'the world') return 'Earth';
  return 'People / Culture';
};

// Helper to map database article row to Card format
export const mapArticleRowToCard = (row: any): Card => {
  // 1. Read the mapped category
  const category = mapRowToHomeCategory(row);
  const subCategory: string | undefined = row.sub_category || undefined;

  // 2. Normalize Rarity based on the article's percentile
  let rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' = 'Common';
  const pct = row.percentile;
  if (typeof pct === 'number') {
    if (pct >= 0.90) rarity = 'Legendary';
    else if (pct >= 0.70) rarity = 'Epic';
    else if (pct >= 0.40) rarity = 'Rare';
  }

  // 3. Format visual background image
  let image = '';
  if (row.image_url) {
    image = row.image_url;
  }

  // 4. The card text is just the first sentence of the article
  const description = row.first_sentence || 'No description available.';

  // 5. Real vs fake is determined by source table (tagged as _isReal by fetchCategoryPool)
  const isReal = row._isReal !== undefined ? !!row._isReal : true;

  return {
    id: row.qid,
    title: row.title || 'Untitled Article',
    wikipediaLink: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.title || '')}`,
    category,
    subCategory,
    rarity,
    description,
    image,
    isReal,
    explanation: isReal
      ? 'Real! This is a genuine Wikipedia entry.'
      : 'Fake! This entry has been altered and is not a real Wikipedia fact.',
    imageLicense: row.image_license || undefined,
    imageCredit: row.image_credit || undefined,
    imageAttributionUrl: row.image_attribution_url || undefined
  };
};
