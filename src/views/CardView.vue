<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Card from '../components/Card.vue';
import Loader from '../components/Loader.vue';
import PageLayout from '../components/PageLayout.vue';
import { useGameStore } from '../stores/useGameStore';
import type { Card as CardType, Category } from '../stores/useGameStore';

const gameStore = useGameStore();
const displayCards = ref<CardType[]>([]);
const isLoading = ref(true);
const errorMsg = ref('');

const defaultMockCards: CardType[] = [
  {
    id: 'preview_common',
    title: 'The Cube-Shaped Feces',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Wombat',
    category: 'Earth',
    rarity: 'Common',
    description: 'Wombats are the only known animals in the world that produce cube-shaped poop, which they stack to mark their territory and prevent the feces from rolling away.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Vombatus_ursinus_-Maria_Island_National_Park.jpg',
    isReal: true,
    explanation: 'Fact! Their highly elastic intestinal walls squeeze the waste into flat-faced cubes.'
  },
  {
    id: 'preview_rare',
    title: 'The Whiskey War',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Whisky_War',
    category: 'History / Society',
    rarity: 'Rare',
    description: 'Canada and Denmark engaged in a peaceful conflict over Hans Island, where they took turns planting flags and leaving bottles of Canadian Club whiskey or Danish Schnapps.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Hans_Island_from_Canadian_side.jpg',
    isReal: true,
    explanation: 'Fact! Known as the "Whisky War," it was resolved in 2022 by dividing the small island between both nations.'
  },
  {
    id: 'preview_epic',
    title: 'The Great Emu War',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Emu_War',
    category: 'History / Society',
    rarity: 'Epic',
    description: 'In 1932, the Australian military deployed soldiers armed with machine guns to combat a massive population of emus destroying crops, but the emus actually won.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Dromaius_novaehollandiae_-_cemetery.jpg',
    isReal: true,
    explanation: 'Fact! The emus proved highly resilient and clever, dodging bullets, which led the Australian government to withdraw military forces.'
  },
  {
    id: 'preview_legendary',
    title: 'The Dancing Plague of 1518',
    wikipediaLink: 'https://en.wikipedia.org/wiki/Dancing_plague_of_1518',
    category: 'History / Society',
    rarity: 'Legendary',
    description: 'A mysterious mania occurred in Strasbourg where hundreds of citizens danced uncontrollably for weeks without rest, leading to several deaths from pure physical exhaustion.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/St_John%27s_dancers.jpg',
    isReal: true,
    explanation: 'Fact! The city council even hired musicians and constructed a wooden stage to encourage them to keep dancing, believing they had to dance the fever out.'
  }
];

onMounted(async () => {
  try {
    isLoading.value = true;
    
    // Fetch from database
    await gameStore.loadCardsFromDatabase();
    
    const allCards = gameStore.gameCards;
    
    // We only want real cards
    const realCards = allCards.filter(c => c.isReal);
    
    // Sort logic mapping for the 6 categories
    const categoryOrder: Record<Category, number> = {
      'Sports': 0,
      'People / Culture': 1,
      'Media': 2,
      'Earth': 3,
      'History / Society': 4,
      'Physical Science': 5
    };

    if (realCards.length > 0) {
      // Let's pick 5 cards of different categories
      const categories: Category[] = ['Sports', 'People / Culture', 'Media', 'Earth', 'History / Society'];
      const selected: CardType[] = [];
      
      categories.forEach(cat => {
        const matching = realCards.filter(c => c.category === cat && !selected.some(s => s.id === c.id));
        if (matching.length > 0) {
          const randomCard = matching[Math.floor(Math.random() * matching.length)];
          selected.push({ ...randomCard });
        }
      });
      
      // If we couldn't get exactly 5 because some categories are missing in the DB, fill up with any other real cards
      if (selected.length < 5) {
        const remaining = realCards.filter(c => !selected.some(s => s.id === c.id));
        while (selected.length < 5 && remaining.length > 0) {
          const nextIndex = Math.floor(Math.random() * remaining.length);
          selected.push({ ...remaining.splice(nextIndex, 1)[0] });
        }
      }
      
      // If we still don't have 5, fill up with defaults
      if (selected.length < 5) {
        defaultMockCards.forEach(mc => {
          if (selected.length < 5 && !selected.some(s => s.title === mc.title)) {
            selected.push({ ...mc });
          }
        });
      }
      
      // Sort selected by category order for consistency
      selected.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
      
      // Force each card to have a different category and rarity level for design testing
      const categoriesList: Category[] = ['Sports', 'People / Culture', 'Media', 'Earth', 'History / Society'];
      const rarities: ('Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary')[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      selected.forEach((card, idx) => {
        if (idx < categoriesList.length) {
          card.category = categoriesList[idx];
        }
        if (idx < rarities.length) {
          card.rarity = rarities[idx];
        }
      });
      
      displayCards.value = selected;
    } else {
      // Force different rarities on defaults too to test all 5 ratings
      const rarities: ('Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary')[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      const mockList = defaultMockCards.map(c => ({ ...c }));
      if (mockList.length > 0) {
        // Add a 5th card clone for the 2-star Uncommon test slot
        mockList.push({
          ...mockList[0],
          id: 'preview_uncommon',
          title: 'The Uncommon Platypus',
          category: 'Earth'
        });
      }
      mockList.forEach((card, idx) => {
        if (idx < rarities.length) {
          card.rarity = rarities[idx];
        }
      });
      // Sort mockList by category order for consistency
      mockList.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category]);
      displayCards.value = mockList;
    }
  } catch (err: any) {
    console.error('Error loading cards from Supabase for preview:', err);
    errorMsg.value = 'Failed to load cards from Supabase, using mock cards.';
    displayCards.value = defaultMockCards;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <PageLayout is-wide>
    <div class="card-preview-page">
      <h1 class="card-preview-heading">Card Design Preview</h1>
      <p class="card-preview-subheading">Civilization · Nature · Science — Common · Rare · Epic · Legendary</p>
      
      <div v-if="isLoading" class="card-preview-loading">
        <Loader />
        <p class="card-preview-loading-text">Loading actual cards from Supabase...</p>
      </div>
      
      <div v-else class="card-preview-grid">
        <div 
          v-for="card in displayCards" 
          :key="card.id" 
          class="card-preview-item"
        >
          <Card :card="card" />
          <span class="card-preview-label">{{ card.rarity }}</span>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.card-preview-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.card-preview-heading {
  font-family: var(--font-family-serif, Georgia, serif);
  font-size: 1.75rem;
  font-weight: 900;
  color: #4a6783;
  margin-bottom: 0.25rem;
}

.card-preview-subheading {
  font-size: 0.8rem;
  color: #888888;
  margin-bottom: 2rem;
  letter-spacing: 0.06em;
}

.card-preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 300px;
}

.card-preview-loading-text {
  font-size: 0.85rem;
  color: #888888;
  font-family: var(--font-family-system-sans, sans-serif);
}

.card-preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  align-items: flex-start;
  max-width: 1400px;
}

.card-preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.card-preview-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #888888;
}
</style>
