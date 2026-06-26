import { supabase } from '../supabase';
import {
  type Category,
  type CollectedCard,
  mapArticleRowToCard
} from '../utils/cardHelpers';

// Skip anything flagged above this threshold (flag_score is null for unflagged rows).
const FLAG_SCORE_MAX = 0.9;

// Real cards come from articles_v2, fake cards from fake_articles_v3.
const FAKES_TABLE = 'fake_articles_v3';

// Filters for real articles in articles_v2: unclaimed, has an image,
// not flagged above threshold, and (when given) one category.
const applyArticleFilters = (query: any, category?: Category) => {
  let q = query
    .is('profile_id', null)
    .not('image_url', 'is', null)
    .or(`flag_score.lte.${FLAG_SCORE_MAX},flag_score.is.null`);
  if (category) {
    q = q.eq('sub_category', category);
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
    q = q.eq('sub_category', category);
  }
  return q;
};

// Fetch a random window of `sampleSize` rows from `table`. Each row carries a
// persistent random value in `rand`, indexed alongside the gameplay filters, so
// we seek to a random pivot and read the next `sampleSize` rows by `rand`. A
// contiguous block in rand-space is itself a random sample of the filtered set,
// and this is an O(sampleSize) index range scan — no count(*) and no large
// OFFSET scan. `applyFilters` must match the partial index predicate so the
// planner can use it.
const fetchRandomSample = async (
  table: string,
  applyFilters: (q: any) => any,
  sampleSize: number
): Promise<any[]> => {
  const pivot = Math.random();

  const { data, error } = await applyFilters(supabase.from(table).select('*'))
    .gte('rand', pivot)
    .order('rand', { ascending: true })
    .limit(sampleSize);

  if (error) throw error;
  let rows = data || [];

  // If the pivot landed too near the top to fill the sample, wrap around to
  // the start of rand-space and take the remainder.
  if (rows.length < sampleSize) {
    const { data: wrapData, error: wrapError } = await applyFilters(supabase.from(table).select('*'))
      .lt('rand', pivot)
      .order('rand', { ascending: true })
      .limit(sampleSize - rows.length);

    if (wrapError) throw wrapError;
    rows = rows.concat(wrapData || []);
  }

  return rows;
};

// Real cards always come from articles_v2.
export const fetchRealSample = (sampleSize: number, category?: Category): Promise<any[]> =>
  fetchRandomSample('articles_v2', (q) => applyArticleFilters(q, category), sampleSize);

// Fake cards come from the dedicated fakes table.
export const fetchFakeSample = (sampleSize: number, category?: Category): Promise<any[]> =>
  fetchRandomSample(FAKES_TABLE, (q) => applyFakesTableFilters(q, category), sampleSize);

// Load a public user profile from the Supabase "profile" table by username or user id
export const loadProfileFromDB = async (usernameOrId: string): Promise<{ userProfile: any, cards: CollectedCard[] } | null> => {
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
      .eq('profile_id', profileData.id)
      .order('pinned', { ascending: false });

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
        backgroundColor: profileData.binder_color || '#eaecf0',
        gdPoints: 0
      },
      cards
    };
  } catch (err: any) {
    console.error('Failed to load profile from DB:', err.message);
    return null;
  }
};

// Update pinned state in database
export const updatePinnedStateInDB = async (profileId: string, cardId: string, isPinned: boolean): Promise<void> => {
  if (isPinned) {
    // 1. Unpin all other articles belonging to this user
    const { error: unpinError } = await supabase
      .from('articles_v2')
      .update({ pinned: false })
      .eq('profile_id', profileId);
    
    if (unpinError) {
      console.error('Error resetting pins in DB:', unpinError.message);
      throw unpinError;
    }

    // 2. Pin this specific article
    const { error: pinError } = await supabase
      .from('articles_v2')
      .update({ pinned: true })
      .eq('profile_id', profileId)
      .eq('qid', cardId);
    
    if (pinError) {
      console.error('Error pinning article in DB:', pinError.message);
      throw pinError;
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
      throw unpinError;
    }
  }
};

// Claim articles in DB for a profile id
export const claimArticlesInDB = async (profileId: string, articleQids: string[]): Promise<void> => {
  const { error } = await supabase
    .from('articles_v2')
    .update({ profile_id: profileId })
    .in('qid', articleQids)
    .is('profile_id', null);

  if (error) {
    console.error('Error claiming articles for profile in DB:', error.message);
    throw error;
  }
};
