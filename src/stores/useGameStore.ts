import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../supabase';

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
}

export interface CollectedCard {
  id: string;
  collectedAt: string;
  isShowcase: boolean;
  customSection: string | null;
  cardDetails?: Card;
}

export const useGameStore = defineStore('game', () => {
  const gdPoints = ref<number>(0);
  const collectedCards = ref<CollectedCard[]>([]);
  const categoryCooldowns = ref<Record<string, number>>({});
  const customSections = ref<string[]>(['Showcase', 'Real Rarities', 'Historical Gems']);
  const gameCards = ref<Card[]>([]);

  // Load guest data
  const loadGuestState = () => {
    const authStore = useAuthStore();
    console.log('[loadGuestState] Called. authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn) return;

    // Load points
    const savedPoints = localStorage.getItem('moonflower_guest_gdPoints');
    console.log('[loadGuestState] Raw gdPoints from localStorage:', savedPoints);
    gdPoints.value = savedPoints !== null ? parseInt(savedPoints, 10) : 0;
    console.log('[loadGuestState] Set gdPoints.value =', gdPoints.value);

    // Load collected cards
    const savedCards = localStorage.getItem('moonflower_guest_collectedCards');
    if (savedCards) {
      try {
        collectedCards.value = JSON.parse(savedCards);
        console.log('[loadGuestState] Successfully parsed collectedCards, count =', collectedCards.value.length);
      } catch (err) {
        console.error('[loadGuestState] Failed to parse collectedCards from localStorage:', err);
        collectedCards.value = [];
      }
    } else {
      collectedCards.value = [];
    }

    // Load category cooldowns
    const savedCooldowns = localStorage.getItem('moonflower_guest_categoryCooldowns');
    if (savedCooldowns) {
      try {
        categoryCooldowns.value = JSON.parse(savedCooldowns);
      } catch (err) {
        console.error('[loadGuestState] Failed to parse categoryCooldowns from localStorage:', err);
        categoryCooldowns.value = {};
      }
    } else {
      categoryCooldowns.value = {};
    }

    // Load custom sections
    const savedSections = localStorage.getItem('moonflower_guest_customSections');
    if (savedSections) {
      try {
        customSections.value = JSON.parse(savedSections);
      } catch (err) {
        console.error('[loadGuestState] Failed to parse customSections from localStorage:', err);
        customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
      }
    } else {
      customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
    }
  };

  // Load logged-in user custom sections and cooldowns from localStorage
  const loadUserState = (userId: string) => {
    console.log('[loadUserState] Loading localStorage state for user:', userId);
    
    // Load custom sections
    const savedSections = localStorage.getItem(`moonflower_user_${userId}_customSections`);
    if (savedSections) {
      try {
        customSections.value = JSON.parse(savedSections);
        console.log('[loadUserState] Loaded customSections from localStorage:', customSections.value);
      } catch (err) {
        console.error('[loadUserState] Failed to parse customSections:', err);
        customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
      }
    } else {
      customSections.value = ['Showcase', 'Real Rarities', 'Historical Gems'];
    }

    // Load category cooldowns
    const savedCooldowns = localStorage.getItem(`moonflower_user_${userId}_categoryCooldowns`);
    if (savedCooldowns) {
      try {
        categoryCooldowns.value = JSON.parse(savedCooldowns);
        console.log('[loadUserState] Loaded categoryCooldowns from localStorage:', categoryCooldowns.value);
      } catch (err) {
        console.error('[loadUserState] Failed to parse categoryCooldowns:', err);
        categoryCooldowns.value = {};
      }
    } else {
      categoryCooldowns.value = {};
    }
  };

  // Sync game store states directly with the user store
  const syncWithUser = (points: number, cards: CollectedCard[]) => {
    gdPoints.value = points;
    collectedCards.value = cards;
  };

  // Helper to filter out explicit, sexually suggestive, or inappropriate Wikipedia entries
  const isAppropriateArticle = (row: any): boolean => {
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
  const mapRowToHomeCategory = (row: any): Category => {
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

  // sub_category values in the DB match the app's Category type directly,
  // so a simple equality filter is all we need.
  const applyCategoryFilter = (query: any, category: Category) =>
    query.eq('sub_category', category);

  // Helper to map database article row to Card format
  const mapArticleRowToCard = (row: any): Card => {
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
    const isReal = !!row._isReal;

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
        : 'Fake! This entry has been altered and is not a real Wikipedia fact.'
    };
  };

  // Number of real and of fake cards to pull for a playable sample. The whole
  // table can be huge, and gameplay only needs a deck of 10 per category, so we
  // fetch a bounded random sample rather than the entire table.
  const SAMPLE_PER_CLASS = 150;

  // Skip anything flagged above this threshold (flag_score is null for unflagged rows).
  const FLAG_SCORE_MAX = 0.9;

  // Real cards come from articles_v2, fake cards from fake_articles_v2.
  const FAKES_TABLE = 'fake_articles_v2';

  // Filters for real articles in articles_v2: unclaimed, has an image,
  // not flagged above threshold, and (when given) one category.
  const applyArticleFilters = (query: any, category?: Category) => {
    let q = query
      .is('profile_id', null)
      .not('image_url', 'is', null)
      .or(`flag_score.lte.${FLAG_SCORE_MAX},flag_score.is.null`);
    if (category) {
      q = applyCategoryFilter(q, category);
    }
    return q;
  };

  // Filters for the dedicated fakes table: image_url is not null and
  // flag_score is below threshold or null.
  const applyFakesTableFilters = (query: any, category?: Category) => {
    let q = query
      .not('image_url', 'is', null)
      .or(`flag_score.lte.${FLAG_SCORE_MAX},flag_score.is.null`);
    if (category) {
      q = applyCategoryFilter(q, category);
    }
    return q;
  };

  // Fetch a random window of `sampleSize` rows from `table`. PostgREST has no
  // ORDER BY random(), so we count the matching rows and read a page from a random
  // offset — bounded work that varies every call. `applyFilters` must be applied
  // identically to the count and data queries so the offset window stays valid.
  const fetchRandomSample = async (
    table: string,
    applyFilters: (q: any) => any,
    sampleSize: number
  ): Promise<any[]> => {
    const { count, error: countError } = await applyFilters(
      supabase.from(table).select('*', { count: 'exact', head: true })
    );

    if (countError) throw countError;
    if (!count) return [];

    const maxOffset = Math.max(0, count - sampleSize);
    const offset = Math.floor(Math.random() * (maxOffset + 1));

    const { data, error } = await applyFilters(
      supabase.from(table).select('*')
    ).range(offset, offset + sampleSize - 1);

    if (error) throw error;
    return data || [];
  };

  // Real cards always come from articles_v2.
  const fetchRealSample = (sampleSize: number, category?: Category): Promise<any[]> =>
    fetchRandomSample('articles_v2', (q) => applyArticleFilters(q, category), sampleSize);

  // Fake cards come from the dedicated fakes table.
  const fetchFakeSample = (sampleSize: number, category?: Category): Promise<any[]> =>
    fetchRandomSample(FAKES_TABLE, (q) => applyFakesTableFilters(q, category), sampleSize);

  // Fetch a fresh, randomized pool of playable cards for a single category — a
  // balanced mix of real and fake. Called per game so consecutive games draw new
  // cards from across the whole category instead of a fixed cached slice.
  const fetchCategoryPool = async (category: Category, perClass = 15): Promise<Card[]> => {
    try {
      const [realRows, fakeRows] = await Promise.all([
        fetchRealSample(perClass, category),
        fetchFakeSample(perClass, category)
      ]);

      // Tag each row with its source so mapArticleRowToCard knows real vs fake
      // (the v2 tables no longer have a 'real' column — the table itself is the signal).
      realRows.forEach((row: any) => { row._isReal = true; });
      fakeRows.forEach((row: any) => { row._isReal = false; });

      return [...realRows, ...fakeRows]
        .filter((row: any) => row.image_url && isAppropriateArticle(row))
        .map((row: any) => mapArticleRowToCard(row));
    } catch (err: any) {
      console.error('Failed to fetch category pool from Supabase:', err.message);
      return [];
    }
  };

  // Tracks whether we already have a playable sample, plus the in-flight load so
  // concurrent callers (multiple views mounting) share one fetch instead of each
  // hitting the database.
  const cardsLoaded = ref(false);
  let cardsLoadPromise: Promise<void> | null = null;

  // Fetch a playable sample of articles from Supabase and map them to Cards.
  // Cached after the first successful load; pass force=true to refresh.
  const loadCardsFromDatabase = async (force = false): Promise<void> => {
    if (!force && cardsLoaded.value) return;
    if (!force && cardsLoadPromise) return cardsLoadPromise;

    cardsLoadPromise = (async () => {
      try {
        console.log('Fetching a playable sample of articles from Supabase public.articles_v2 table...');
        const [realRows, fakeRows] = await Promise.all([
          fetchRealSample(SAMPLE_PER_CLASS),
          fetchFakeSample(SAMPLE_PER_CLASS)
        ]);

        // Tag each row with its source so mapArticleRowToCard knows real vs fake.
        realRows.forEach((row: any) => { row._isReal = true; });
        fakeRows.forEach((row: any) => { row._isReal = false; });
        const rows = [...realRows, ...fakeRows];

        if (rows.length > 0) {
          const mapped: Card[] = rows
            .filter((row: any) => row.image_url && isAppropriateArticle(row))
            .map((row: any) => mapArticleRowToCard(row));

          gameCards.value = mapped;
          console.log(`Successfully mapped ${mapped.length} playable cards from the Supabase articles_v2 table!`);
        } else {
          console.warn('Supabase articles_v2 returned no rows. Falling back to default MOCK_CARDS.');
          gameCards.value = [];
        }
        cardsLoaded.value = true;
      } catch (err: any) {
        console.error('Failed to load articles from Supabase:', err.message);
        console.log('Operating in offline/mock mode. Falling back to default MOCK_CARDS.');
        gameCards.value = [];
        // Treat the fallback as loaded so a transient failure doesn't make every
        // view retry on each navigation; callers can force a refresh later.
        cardsLoaded.value = true;
      }
    })();

    try {
      await cardsLoadPromise;
    } finally {
      cardsLoadPromise = null;
    }
  };


  const persistState = () => {
    const authStore = useAuthStore();
    if (authStore.isLoggedIn && authStore.user?.id) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      localStorage.setItem(`moonflower_user_${authStore.user.id}_gdPoints`, String(gdPoints.value));
      localStorage.setItem(`moonflower_user_${authStore.user.id}_collectedCards`, JSON.stringify(collectedCards.value));
      localStorage.setItem(`moonflower_user_${authStore.user.id}_categoryCooldowns`, JSON.stringify(categoryCooldowns.value));
      localStorage.setItem(`moonflower_user_${authStore.user.id}_customSections`, JSON.stringify(customSections.value));
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_gdPoints', String(gdPoints.value));
      localStorage.setItem('moonflower_guest_collectedCards', JSON.stringify(collectedCards.value));
      localStorage.setItem('moonflower_guest_categoryCooldowns', JSON.stringify(categoryCooldowns.value));
      localStorage.setItem('moonflower_guest_customSections', JSON.stringify(customSections.value));
    }
  };

  // Add Points
  const addPoints = (points: number, shouldPersist = true) => {
    gdPoints.value += points;

    if (shouldPersist) {
      persistState();
    }
  };

  // Deduct Points
  const spendPoints = (points: number): boolean => {
    if (gdPoints.value >= points) {
      gdPoints.value -= points;
      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      }
      return true;
    }
    return false;
  };

  // Collect a Card
  const collectCard = (card: Card | string): boolean => {
    const cardId = typeof card === 'string' ? card : card.id;
    const cardDetails = typeof card === 'string' ? undefined : card;
    const existsIndex = collectedCards.value.findIndex(c => c.id === cardId);

    if (existsIndex === -1) {
      collectedCards.value.push({
        id: cardId,
        collectedAt: new Date().toISOString(),
        isShowcase: false,
        customSection: null,
        // Store the full card so the binder can render it without re-fetching
        // (the global sample may not contain this specific card later).
        cardDetails
      });
    } else {
      // Update collected timestamp
      collectedCards.value[existsIndex].collectedAt = new Date().toISOString();
      if (cardDetails && !collectedCards.value[existsIndex].cardDetails) {
        collectedCards.value[existsIndex].cardDetails = cardDetails;
      }
    }

    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    }

    return existsIndex === -1;
  };

  // Toggle Showcase status (only ONE pinned card allowed at a time)
  // Toggle Showcase status (only ONE pinned card allowed at a time)
  const toggleShowcase = async (cardId: string) => {
    const card = collectedCards.value.find(c => c.id === cardId);
    if (card) {
      const targetState = !card.isShowcase;
      // Reset all cards first to enforce single pinning
      collectedCards.value.forEach(c => {
        c.isShowcase = false;
      });
      card.isShowcase = targetState;

      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        // Sync points (collectedCards is no longer stored in metadata)
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);

        // Update database table 'articles' for pinning
        const profileId = authStore.user?.id;
        if (profileId && !profileId.startsWith('usr_')) {
          try {
            if (targetState) {
              // 1. Unpin all other articles belonging to this user
              const { error: unpinError } = await supabase
                .from('articles_v2')
                .update({ pinned: false })
                .eq('profile_id', profileId);
              
              if (unpinError) {
                console.error('Error resetting pins in DB:', unpinError.message);
              }

              // 2. Pin this specific article
              const { error: pinError } = await supabase
                .from('articles_v2')
                .update({ pinned: true })
                .eq('profile_id', profileId)
                .eq('qid', cardId);
              
              if (pinError) {
                console.error('Error pinning article in DB:', pinError.message);
              }
            } else {
              // Unpin this specific article
              const { error: unpinError } = await supabase
                .from('articles_v2')
                .update({ pinned: false })
                .eq('profile_id', profileId)
                .eq('qid', cardId);
              
              if (unpinError) {
                console.error('Error unpinning article in DB:', unpinError.message);
              }
            }
          } catch (err) {
            console.error('Failed to update pinned state in database:', err);
          }
        }
      }
    }
  };

  // Update card section
  const updateCardSection = (cardId: string, sectionName: string | null) => {
    const card = collectedCards.value.find(c => c.id === cardId);
    if (card) {
      card.customSection = sectionName;

      const authStore = useAuthStore();
      if (authStore.isLoggedIn) {
        authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
      }
    }
  };

  // Add binder custom section
  const addCustomSection = (sectionName: string) => {
    if (sectionName && !customSections.value.includes(sectionName)) {
      customSections.value.push(sectionName);
    }
  };

  // Remove binder custom section
  const removeCustomSection = (sectionName: string) => {
    customSections.value = customSections.value.filter(s => s !== sectionName);

    // Reset cards inside this section
    collectedCards.value.forEach(c => {
      if (c.customSection === sectionName) {
        c.customSection = null;
      }
    });

    const authStore = useAuthStore();
    if (authStore.isLoggedIn) {
      authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
    }
  };

  // Cooldown handlers
  const setCooldown = (category: string) => {
    const expiry = Date.now() + 60 * 1000; // 60 seconds cooldown
    categoryCooldowns.value[category] = expiry;
  };

  const getCooldownTimeRemaining = (category: string): number => {
    const expiry = categoryCooldowns.value[category] || 0;
    const diff = expiry - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  };

  const isCooldownActive = (category: string): boolean => {
    return getCooldownTimeRemaining(category) > 0;
  };

  // Load a public user profile from the Supabase "profile" table by username or user id
  const loadProfileFromDB = async (usernameOrId: string): Promise<{ userProfile: any, cards: CollectedCard[] } | null> => {
    try {
      // Try matching by username first (case-insensitive)
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', usernameOrId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile by username:', error.message);
      }

      // If no match by username, try matching by id
      if (!profileData) {
        const { data: profileById, error: idError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', usernameOrId)
          .maybeSingle();

        if (idError) {
          console.error('Error fetching profile by id:', idError.message);
        }
        profileData = profileById;
      }

      if (!profileData) return null;

      // Fetch articles owned by this profile via profile_id join
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles_v2')
        .select('*')
        .eq('profile_id', profileData.id);

      if (articlesError) {
        console.error('Error fetching profile articles:', articlesError.message);
      }

      // Map articles to CollectedCard format
      const cards: CollectedCard[] = (articlesData || []).map((article: any) => ({
        id: article.qid,
        collectedAt: new Date().toISOString(),
        isShowcase: !!article.pinned,
        customSection: null,
        cardDetails: mapArticleRowToCard(article)
      }));

      return {
        userProfile: {
          id: profileData.id,
          username: profileData.username,
          profilePic: `https://api.dicebear.com/7.x/identicon/svg?seed=${profileData.username}`,
          bio: profileData.bio || 'Avid Moonflower scholar and collector.',
          backgroundColor: '#eaecf0',
          gdPoints: 0
        },
        cards
      };
    } catch (err: any) {
      console.error('Failed to load profile from DB:', err.message);
      return null;
    }
  };

  // Claim articles for a profile by setting profile_id on collected article rows
  const claimArticlesForProfile = async (articleQids: string[]) => {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn || !authStore.user) return;

    const profileId = authStore.user.id;
    if (!profileId || profileId.startsWith('usr_') || articleQids.length === 0) return;

    try {
      // Update articles_v2 table, setting profile_id for each collected article's qid
      // Only claim articles that are currently unclaimed (profile_id IS NULL)
      const { error } = await supabase
        .from('articles_v2')
        .update({ profile_id: profileId })
        .in('qid', articleQids)
        .is('profile_id', null);

      if (error) {
        console.error('Error claiming articles for profile:', error.message);
      } else {
        console.log(`Successfully claimed ${articleQids.length} articles for profile ${profileId}`);
        // Ensure they are also in the local collectedCards state
        let updatedAny = false;
        const nowStr = new Date().toISOString();
        for (const qid of articleQids) {
          const exists = collectedCards.value.some(c => c.id === qid);
          if (!exists) {
            collectedCards.value.push({
              id: qid,
              collectedAt: nowStr,
              isShowcase: false,
              customSection: null
            });
            updatedAny = true;
          }
        }
        if (updatedAny) {
          authStore.syncStoreToUser(gdPoints.value, collectedCards.value);
        }
      }
    } catch (err: any) {
      console.error('Failed to claim articles:', err.message);
    }
  };

  // Watchers to automatically save to localStorage when state changes
  watch(gdPoints, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch gdPoints] triggered. newVal =', newVal, ', authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_gdPoints`, String(newVal));
      console.log(`[watch gdPoints] Saved user progress to localStorage for ${authStore.user.id}:`, newVal);
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_gdPoints', String(newVal));
      console.log('[watch gdPoints] Saved guest progress to localStorage:', newVal);
    }
  });

  watch(collectedCards, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch collectedCards] triggered. count =', newVal?.length, ', authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_collectedCards`, JSON.stringify(newVal));
      console.log(`[watch collectedCards] Saved user cards to localStorage for ${authStore.user.id}`);
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_collectedCards', JSON.stringify(newVal));
      console.log('[watch collectedCards] Saved guest progress to localStorage:', newVal);
    }
  }, { deep: true });

  watch(categoryCooldowns, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch categoryCooldowns] triggered. authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_categoryCooldowns`, JSON.stringify(newVal));
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_categoryCooldowns', JSON.stringify(newVal));
      console.log('[watch categoryCooldowns] Saved guest progress to localStorage:', newVal);
    }
  }, { deep: true });

  watch(customSections, (newVal) => {
    const authStore = useAuthStore();
    console.log('[watch customSections] triggered. count =', newVal?.length, ', authStore.isLoggedIn =', authStore.isLoggedIn);
    if (authStore.isLoggedIn && authStore.user?.id) {
      localStorage.setItem(`moonflower_user_${authStore.user.id}_customSections`, JSON.stringify(newVal));
    } else if (!authStore.isLoggedIn) {
      localStorage.setItem('moonflower_guest_customSections', JSON.stringify(newVal));
      console.log('[watch customSections] Saved guest progress to localStorage:', newVal);
    }
  }, { deep: true });

  return {
    gdPoints,
    collectedCards,
    categoryCooldowns,
    customSections,
    gameCards,
    loadGuestState,
    loadUserState,
    syncWithUser,
    loadCardsFromDatabase,
    fetchCategoryPool,
    addPoints,
    persistState,
    spendPoints,
    collectCard,
    toggleShowcase,
    updateCardSection,
    addCustomSection,
    removeCustomSection,
    setCooldown,
    getCooldownTimeRemaining,
    isCooldownActive,
    loadProfileFromDB,
    claimArticlesForProfile,
    mapArticleRowToCard
  };
});
