import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGameStore } from './useGameStore';

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

  // Initialize store from localStorage on startup
  const initAuth = () => {
    const cachedUser = localStorage.getItem('wiki_user');
    const cachedIsLoggedIn = localStorage.getItem('wiki_is_logged_in');
    
    if (cachedUser && cachedIsLoggedIn === 'true') {
      user.value = JSON.parse(cachedUser);
      isLoggedIn.value = true;
      
      // Load current user's inventory and points into the game store
      const gameStore = useGameStore();
      gameStore.gdPoints = user.value?.gdPoints || 0;
      gameStore.collectedCards = user.value?.collectedCards || [];
    } else {
      // Guest initialization - Game Store will read guest data from its own localStorage logic
      isLoggedIn.value = false;
      user.value = null;
    }
  };

  const login = (emailOrUsername: string) => {
    // V1 Simulation: Generate/load user
    // If it looks like an email, extract username from it
    const isEmail = emailOrUsername.includes('@');
    const email = isEmail ? emailOrUsername : undefined;
    const username = isEmail ? emailOrUsername.split('@')[0] : emailOrUsername;
    const mockId = `usr_${username.toLowerCase()}`;
    
    const existingUsersRaw = localStorage.getItem('wiki_registered_users');
    const registeredUsers: Record<string, User> = existingUsersRaw ? JSON.parse(existingUsersRaw) : {};
    
    let existingUser = registeredUsers[mockId];
    
    const gameStore = useGameStore();
    
    if (!existingUser) {
      // If user does not exist, create a new user profile and merge guest data
      existingUser = {
        id: mockId,
        username,
        email,
        profilePic: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
        bio: 'Avid Moonflower scholar and collector.',
        backgroundColor: '#eaecf0', // default wiki grey background
        gdPoints: 0,
        collectedCards: []
      };
    }

    // Merge Guest Data!
    const guestPoints = gameStore.getGuestPoints();
    const guestCards = gameStore.getGuestCards();
    
    // De-duplicate collected cards by ID when merging
    const mergedCardsMap = new Map<string, typeof existingUser.collectedCards[0]>();
    existingUser.collectedCards.forEach(c => mergedCardsMap.set(c.id, c));
    guestCards.forEach(c => {
      if (!mergedCardsMap.has(c.id)) {
        mergedCardsMap.set(c.id, c);
      }
    });
    
    existingUser.gdPoints += guestPoints;
    existingUser.collectedCards = Array.from(mergedCardsMap.values());
    
    // Save to registered database
    registeredUsers[mockId] = existingUser;
    localStorage.setItem('wiki_registered_users', JSON.stringify(registeredUsers));
    
    // Set active session
    user.value = existingUser;
    isLoggedIn.value = true;
    
    localStorage.setItem('wiki_user', JSON.stringify(existingUser));
    localStorage.setItem('wiki_is_logged_in', 'true');
    
    // Sync active state to game store and clear temporary guest cache
    gameStore.syncWithUser(existingUser.gdPoints, existingUser.collectedCards);
    gameStore.clearGuestCache();
  };

  const signup = (username: string) => {
    // Signup functions similarly to login in V1 mock environment
    login(username);
  };

  const logout = () => {
    // Save current state back to registered database before logging out
    if (user.value) {
      const gameStore = useGameStore();
      user.value.gdPoints = gameStore.gdPoints;
      user.value.collectedCards = gameStore.collectedCards;
      
      const mockId = user.value.id;
      const existingUsersRaw = localStorage.getItem('wiki_registered_users');
      const registeredUsers: Record<string, User> = existingUsersRaw ? JSON.parse(existingUsersRaw) : {};
      registeredUsers[mockId] = user.value;
      localStorage.setItem('wiki_registered_users', JSON.stringify(registeredUsers));
    }
    
    user.value = null;
    isLoggedIn.value = false;
    localStorage.removeItem('wiki_user');
    localStorage.setItem('wiki_is_logged_in', 'false');
    
    // Reset game store to fresh guest state
    const gameStore = useGameStore();
    gameStore.loadGuestState();
  };

  const updateProfile = (profileUpdate: Partial<Pick<User, 'profilePic' | 'username' | 'bio' | 'backgroundColor'>>) => {
    if (user.value) {
      user.value = {
        ...user.value,
        ...profileUpdate
      };
      
      localStorage.setItem('wiki_user', JSON.stringify(user.value));
      
      // Update in global registered users database
      const mockId = user.value.id;
      const existingUsersRaw = localStorage.getItem('wiki_registered_users');
      const registeredUsers: Record<string, User> = existingUsersRaw ? JSON.parse(existingUsersRaw) : {};
      registeredUsers[mockId] = user.value;
      localStorage.setItem('wiki_registered_users', JSON.stringify(registeredUsers));
    }
  };

  // Sync game store updates (points and cards) back to active user in localStorage
  const syncStoreToUser = (points: number, cards: any[]) => {
    if (user.value && isLoggedIn.value) {
      user.value.gdPoints = points;
      user.value.collectedCards = cards;
      localStorage.setItem('wiki_user', JSON.stringify(user.value));
      
      const mockId = user.value.id;
      const existingUsersRaw = localStorage.getItem('wiki_registered_users');
      const registeredUsers: Record<string, User> = existingUsersRaw ? JSON.parse(existingUsersRaw) : {};
      registeredUsers[mockId] = user.value;
      localStorage.setItem('wiki_registered_users', JSON.stringify(registeredUsers));
    }
  };

  return {
    user,
    isLoggedIn,
    initAuth,
    login,
    signup,
    logout,
    updateProfile,
    syncStoreToUser
  };
});
