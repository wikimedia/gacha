import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGameStore, type CollectedCard } from './useGameStore';
import { supabase } from '../supabase';

export interface User {
  id: string;
  username: string;
  email?: string;
  profilePic: string;
  bio: string;
  backgroundColor: string;
  gdPoints: number;
  collectedCards: CollectedCard[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoggedIn = ref<boolean>(false);
  const isAuthInitialized = ref<boolean>(false);

  // Sync game store states directly with the user store
  const syncStoreToUser = async (points: number, cards: any[]) => {
    if (user.value && isLoggedIn.value) {
      user.value.gdPoints = points;
      user.value.collectedCards = cards;

      // Sync store state to user object

      // Persist to Supabase User Metadata (excluding collectedCards)
      const { error } = await supabase.auth.updateUser({
        data: {
          gdPoints: points
        }
      });
      if (error) {
        console.error('Error syncing progress to Supabase:', error.message);
      }
    }
  };

  // Initialize store and subscribe to Supabase Auth Changes
  const initAuth = () => {
    if (isAuthInitialized.value) return;
    isAuthInitialized.value = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthSession(session);
    });

    // Subscribe to auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Supabase Auth Event: ${event}`);
      handleAuthSession(session);
    });
  };

  // Process session data and map it to our User interface
  const handleAuthSession = async (session: any) => {
    const gameStore = useGameStore();

    if (session?.user) {
      const su = session.user;
      const metadata = su.user_metadata || {};
      
      const email = su.email || '';
      // Fetch the real username and bio from the Supabase profiles table
      let profileUsername: string | null = null;
      let profileBio: string | null = null;
      try {
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('username, bio')
          .eq('id', su.id)
          .maybeSingle();

        if (profileFetchError) {
          console.error('Error fetching profile from DB:', profileFetchError.message);
        }
        
        if (profileData) {
          if (profileData.username) {
            profileUsername = profileData.username;
          }
          if (profileData.bio !== undefined && profileData.bio !== null) {
            profileBio = profileData.bio;
          }
        } else {
          // If profile row doesn't exist, create it!
          const fallbackUsername = metadata.username || (email ? email.split('@')[0] : 'Scholar');
          const fallbackBio = metadata.bio || 'Avid Moonflower scholar and collector.';
          
          console.log(`Creating missing profile for user ${su.id} with username ${fallbackUsername}...`);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: su.id,
              username: fallbackUsername,
              bio: fallbackBio
            });
          
          if (insertError) {
            console.error('Error creating profile row in database:', insertError.message);
            // If it failed because of username constraint (already exists), try with a random suffix
            if (insertError.message.toLowerCase().includes('unique') || insertError.code === '23505') {
              const uniqueUsername = `${fallbackUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
              const { error: retryError } = await supabase
                .from('profiles')
                .insert({
                  id: su.id,
                  username: uniqueUsername,
                  bio: fallbackBio
                });
              if (!retryError) {
                profileUsername = uniqueUsername;
                profileBio = fallbackBio;
              } else {
                console.error('Retry profile creation failed:', retryError.message);
              }
            }
          } else {
            profileUsername = fallbackUsername;
            profileBio = fallbackBio;
          }
        }
      } catch (err) {
        console.error('Error in profile check/creation:', err);
      }
      
      // Priority: profiles table > auth metadata > fallback
      const username = profileUsername || metadata.username || 'Scholar';
      const bio = profileBio ?? metadata.bio ?? 'Avid Moonflower scholar and collector.';
      
      // Fetch user's collected cards directly from the database articles_v2 table
      let dbCards: any[] = [];
      if (su.id && !su.id.startsWith('usr_')) {
        try {
          const { data: articlesData, error: articlesError } = await supabase
            .from('articles_v2')
            .select('*')
            .eq('profile_id', su.id);

          if (articlesError) {
            console.error('Error loading user articles from database:', articlesError.message);
          } else if (articlesData) {
            dbCards = articlesData.map((article: any) => ({
              id: article.qid,
              collectedAt: new Date().toISOString(),
              isShowcase: !!article.pinned,
              customSection: null,
              cardDetails: gameStore.mapArticleRowToCard(article)
            }));
          }
        } catch (err) {
          console.error('Failed to load user articles from database:', err);
        }
      }

      let finalPoints = typeof metadata.gdPoints === 'number' ? metadata.gdPoints : 0;
      
      // Load points from localStorage to bypass stale Supabase JWT metadata
      const localUserPoints = localStorage.getItem(`moonflower_user_${su.id}_gdPoints`);
      if (localUserPoints !== null) {
        const parsedLocal = parseInt(localUserPoints, 10);
        if (!isNaN(parsedLocal) && parsedLocal > finalPoints) {
          finalPoints = parsedLocal;
        }
      }

      // Merge guest points if any exist
      let didMergePoints = false;
      const guestPointsRaw = localStorage.getItem('moonflower_guest_gdPoints');
      if (guestPointsRaw) {
        const guestPoints = parseInt(guestPointsRaw, 10);
        if (!isNaN(guestPoints) && guestPoints > 0) {
          finalPoints += guestPoints;
          didMergePoints = true;
        }
      }

      let finalCards = dbCards;

      const mappedUser: User = {
        id: su.id,
        username,
        email: email,
        profilePic: metadata.profilePic || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
        bio,
        backgroundColor: metadata.backgroundColor || '#eaecf0',
        gdPoints: finalPoints,
        collectedCards: finalCards
      };

      user.value = mappedUser;
      isLoggedIn.value = true;

      // Sync user data to active Game Store
      gameStore.gdPoints = mappedUser.gdPoints;
      gameStore.collectedCards = mappedUser.collectedCards;

      // Load user-specific localStorage state (sections & cooldowns)
      gameStore.loadUserState(su.id);

      // Migrate guest cards to database under the user's profile
      const guestCardsRaw = localStorage.getItem('moonflower_guest_collectedCards');
      let didMigrate = false;
      if (guestCardsRaw) {
        try {
          const guestCards = JSON.parse(guestCardsRaw);
          if (Array.isArray(guestCards) && guestCards.length > 0) {
            const guestCardIds = guestCards.map((c: any) => c.id);
            console.log(`[handleAuthSession] Migrating ${guestCardIds.length} guest cards to user ${su.id}...`);
            await gameStore.claimArticlesForProfile(guestCardIds, guestCards);
            didMigrate = true;
            
            // Clear guest progress in localStorage
            localStorage.removeItem('moonflower_guest_collectedCards');
            localStorage.removeItem('moonflower_guest_gdPoints');
            localStorage.removeItem('moonflower_guest_categoryCooldowns');
            localStorage.removeItem('moonflower_guest_customSections');
          }
        } catch (err) {
          console.error('[handleAuthSession] Failed to migrate guest cards:', err);
        }
      }

      // If we merged points or migrated cards, make sure we sync the updated state back to Supabase User Metadata
      if (didMergePoints || didMigrate) {
        console.log('[handleAuthSession] Syncing merged guest data to Supabase metadata...', finalPoints);
        await syncStoreToUser(finalPoints, gameStore.collectedCards);
      }
    } else {
      user.value = null;
      isLoggedIn.value = false;

      // Reset game store to guest state
      gameStore.loadGuestState();
    }
  };

  // Step 1: Send Passcode (OTP)
  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  // Step 2: Verify Passcode (OTP) and log in
  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) throw error;
  };

  // Simulated login helper for Dev/Testing backwards compatibility
  const login = (emailOrUsername: string) => {
    const isEmail = emailOrUsername.includes('@');
    const email = isEmail ? emailOrUsername : undefined;
    const username = isEmail ? emailOrUsername.split('@')[0] : emailOrUsername;
    const mockId = `usr_${username.toLowerCase()}`;
    
    const mappedUser: User = {
      id: mockId,
      username,
      email,
      profilePic: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
      bio: 'Avid Moonflower scholar and collector.',
      backgroundColor: '#eaecf0',
      gdPoints: 0,
      collectedCards: []
    };

    user.value = mappedUser;
    isLoggedIn.value = true;
    
    const gameStore = useGameStore();
    gameStore.gdPoints = mappedUser.gdPoints;
    gameStore.collectedCards = mappedUser.collectedCards;
  };

  // Log Out
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out from Supabase:', error.message);
    }
  };

  // Update Profile Information
  const updateProfile = async (profileUpdate: Partial<Pick<User, 'profilePic' | 'username' | 'bio' | 'backgroundColor'>>) => {
    if (user.value) {
      user.value = {
        ...user.value,
        ...profileUpdate
      };

      // Persist username and bio to the Supabase profiles table
      const profilesUpdate: Record<string, string> = {};
      if (profileUpdate.username) profilesUpdate.username = profileUpdate.username;
      if (profileUpdate.bio !== undefined) profilesUpdate.bio = profileUpdate.bio;

      if (Object.keys(profilesUpdate).length > 0) {
        const { error: profilesError } = await supabase
          .from('profiles')
          .update(profilesUpdate)
          .eq('id', user.value.id);

        if (profilesError) {
          console.error('Error updating profiles table:', profilesError.message);
        }
      }

      // Persist metadata update to Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          ...profileUpdate
        }
      });

      if (error) {
        console.error('Error updating user profile metadata:', error.message);
      }
    }
  };

  return {
    user,
    isLoggedIn,
    initAuth,
    sendOtp,
    verifyOtp,
    login,
    logout,
    updateProfile,
    syncStoreToUser
  };
});
