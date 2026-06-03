import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

// Mock localStorage before anything imports
const mockStorage = {};
global.localStorage = {
  getItem: (key) => {
    const val = mockStorage[key] || null;
    console.log(`[LocalStorage] getItem(${key}) -> ${val}`);
    return val;
  },
  setItem: (key, val) => {
    mockStorage[key] = String(val);
    console.log(`[LocalStorage] setItem(${key}) <- ${val}`);
  },
  removeItem: (key) => {
    delete mockStorage[key];
    console.log(`[LocalStorage] removeItem(${key})`);
  },
  clear: () => {
    for (let k in mockStorage) delete mockStorage[k];
    console.log(`[LocalStorage] clear()`);
  }
};

// Mock window location
global.window = {
  location: {
    origin: 'http://localhost'
  }
};

// Seed localStorage with 100 points
global.localStorage.setItem('moonflower_guest_gdPoints', '100');
global.localStorage.setItem('moonflower_guest_collectedCards', JSON.stringify([{ id: 'hist_bucket' }]));

// Import the actual stores
import { useGameStore } from './src/stores/useGameStore';
import { useAuthStore } from './src/stores/useAuthStore';

// Set up Pinia
const pinia = createPinia();
setActivePinia(pinia);

async function run() {
  console.log('\n--- 1. Initializing gameStore ---');
  const gameStore = useGameStore();

  console.log('\n--- 2. Simulating onMounted Flow ---');
  const authStore = useAuthStore();
  
  // Start initAuth
  authStore.initAuth();
  
  // Call loadGuestState
  gameStore.loadGuestState();

  console.log('\n--- 3. Waiting for Vue nextTick (watcher flush) ---');
  await nextTick();

  console.log('\n--- 4. Waiting for Auth Session Asynchronous Resolve (100ms) ---');
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n--- 5. Final Store Values ---');
  console.log('gameStore.gdPoints:', gameStore.gdPoints);
  console.log('gameStore.collectedCards count:', gameStore.collectedCards.length);
  console.log('localStorage moonflower_guest_gdPoints:', global.localStorage.getItem('moonflower_guest_gdPoints'));
}

run().catch(err => {
  console.error('Test execution error:', err);
});
