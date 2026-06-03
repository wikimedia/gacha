import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGameStore } from './useGameStore';
import { supabase } from '../supabase';

export interface User {
  id: string;
  username: string;
  email?: string;
  profilePic: string;
  bio: string;
  backgroundColor: string;
  gdPoints: number;
  collectedCards: Array<{
    id: string;
    collectedAt: string;
    isShowcase: boolean;
    customSection: string | null;
  }>;
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

      // Update locally in session storage cache
      localStorage.setItem('wiki_user', JSON.stringify(user.value));

      // Persist to Supabase User Metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          gdPoints: points,
          collectedCards: cards
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
      // Fetch the real username from the Supabase profile table
      let profileUsername: string | null = null;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', su.id)
          .maybeSingle();
        if (profileData?.username) {
          profileUsername = profileData.username;
        }
      } catch (err) {
        console.error('Error fetching profile username:', err);
      }
      
      // Priority: profile table > auth metadata > fallback
      const username = profileUsername || metadata.username || 'Scholar';
      
      // Check if we have guest progress to merge
      const guestPoints = gameStore.getGuestPoints();
      const guestCards = gameStore.getGuestCards();

      let finalPoints = typeof metadata.gdPoints === 'number' ? metadata.gdPoints : 0;
      let finalCards = Array.isArray(metadata.collectedCards) ? metadata.collectedCards : [];

      if (guestPoints > 0 || guestCards.length > 0) {
        // Merge guest cards with existing user cards
        const mergedCardsMap = new Map<string, any>();
        // Add existing cards first
        finalCards.forEach((c: any) => mergedCardsMap.set(c.id, c));
        // Add guest cards if they aren't already in the list
        guestCards.forEach((c: any) => {
          if (!mergedCardsMap.has(c.id)) {
            mergedCardsMap.set(c.id, c);
          }
        });

        finalPoints += guestPoints;
        finalCards = Array.from(mergedCardsMap.values());

        // Update user metadata in Supabase
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            username,
            profilePic: metadata.profilePic || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
            bio: metadata.bio || 'Avid Moonflower scholar and collector.',
            backgroundColor: metadata.backgroundColor || '#eaecf0',
            gdPoints: finalPoints,
            collectedCards: finalCards
          }
        });

        if (updateError) {
          console.error('Error saving merged user profile:', updateError.message);
        } else {
          // Clear guest cache only on successful merge
          gameStore.clearGuestCache();
        }
      }

      const mappedUser: User = {
        id: su.id,
        username,
        email: email,
        profilePic: metadata.profilePic || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
        bio: metadata.bio || 'Avid Moonflower scholar and collector.',
        backgroundColor: metadata.backgroundColor || '#eaecf0',
        gdPoints: finalPoints,
        collectedCards: finalCards
      };

      user.value = mappedUser;
      isLoggedIn.value = true;

      // Save session cache for instant startup
      localStorage.setItem('wiki_user', JSON.stringify(mappedUser));
      localStorage.setItem('wiki_is_logged_in', 'true');

      // Sync user data to active Game Store
      gameStore.gdPoints = mappedUser.gdPoints;
      gameStore.collectedCards = mappedUser.collectedCards;
    } else {
      user.value = null;
      isLoggedIn.value = false;
      localStorage.removeItem('wiki_user');
      localStorage.setItem('wiki_is_logged_in', 'false');

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
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) throw error;

    if (session?.user) {
      // Merge guest progress upon successful login
      const gameStore = useGameStore();
      const guestPoints = gameStore.getGuestPoints();
      const guestCards = gameStore.getGuestCards();

      const su = session.user;
      const metadata = su.user_metadata || {};
      
      // Fetch the real username from the Supabase profile table
      let profileUsername: string | null = null;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', su.id)
          .maybeSingle();
        if (profileData?.username) {
          profileUsername = profileData.username;
        }
      } catch (err) {
        console.error('Error fetching profile username during OTP verify:', err);
      }
      
      const existingPoints = typeof metadata.gdPoints === 'number' ? metadata.gdPoints : 0;
      const existingCards = Array.isArray(metadata.collectedCards) ? metadata.collectedCards : [];

      // De-duplicate collected cards by ID when merging
      const mergedCardsMap = new Map<string, typeof guestCards[0]>();
      existingCards.forEach((c: any) => mergedCardsMap.set(c.id, c));
      guestCards.forEach(c => {
        if (!mergedCardsMap.has(c.id)) {
          mergedCardsMap.set(c.id, c);
        }
      });

      const finalPoints = existingPoints + guestPoints;
      const finalCards = Array.from(mergedCardsMap.values());

      // Update Supabase with merged properties
      const username = profileUsername || metadata.username || 'Scholar';
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          username,
          profilePic: metadata.profilePic || `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
          bio: metadata.bio || 'Avid Moonflower scholar and collector.',
          backgroundColor: metadata.backgroundColor || '#eaecf0',
          gdPoints: finalPoints,
          collectedCards: finalCards
        }
      });

      if (updateError) {
        console.error('Error saving merged user profile:', updateError.message);
      }

      // Sync active state in game store and clear guest cache
      gameStore.syncWithUser(finalPoints, finalCards);
      gameStore.clearGuestCache();
    }
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
    
    localStorage.setItem('wiki_user', JSON.stringify(mappedUser));
    localStorage.setItem('wiki_is_logged_in', 'true');
    
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

      // Save local cache
      localStorage.setItem('wiki_user', JSON.stringify(user.value));

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
