<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = withDefaults(defineProps<{
  type?: 'page' | 'overlay' | 'spinner' | 'skeleton';
  skeletonType?: 'card' | 'profile';
  skeletonCount?: number;
  message?: string;
  glow?: boolean;
}>(), {
  type: 'spinner',
  skeletonType: 'card',
  skeletonCount: 1,
  message: 'Loading encyclopedia archives...',
  glow: true
});

// A list of historical/encyclopedic loading messages to cycle through for page and overlay modes
const loadingMessages = [
  'Querying database for truth...',
  'Checking authenticity stamps...',
  'Curating weird truths...',
  'Retrieving spaghetti-tree stories...',
  'Translating historical archives...',
  'Loading Wikipedia articles...',
  'Shuffling the gacha deck...',
  'Polishing the showcase cabinet...'
];

const currentMessage = ref(props.message);
let messageInterval: any = null;

if (props.type === 'page' || props.type === 'overlay') {
  onMounted(() => {
    let index = 0;
    // Rotate messages every 2.5 seconds
    messageInterval = setInterval(() => {
      index = (index + 1) % loadingMessages.length;
      currentMessage.value = loadingMessages[index];
    }, 2500);
  });

  onUnmounted(() => {
    if (messageInterval) clearInterval(messageInterval);
  });
}
</script>

<template>
  <!-- Full Screen Loader (with glassmorphism and beautiful transitions) -->
  <div v-if="type === 'page'" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-base-300/90 backdrop-blur-md transition-all duration-300 animate-fade-in">
    <div class="flex flex-col items-center max-w-xs text-center px-4">
      <div class="relative w-28 h-28 mb-6 flex items-center justify-center">
        <!-- DaisyUI Loading Ring -->
        <span class="loading loading-ring text-primary w-28 h-28 absolute"></span>
        <!-- Glowing center dot / Wikipedia logo 'W' -->
        <div class="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-serif text-3xl font-black shadow-lg animate-pulse" :class="{ 'animate-pulse': glow }">
          W
        </div>
      </div>
      <h3 class="font-serif text-xl font-black text-primary leading-none">Moonflower</h3>
      <p class="text-[9px] font-sans font-bold tracking-widest text-secondary uppercase mt-1.5 mb-4">Wikipedia Gacha</p>
      <div class="h-6 flex items-center justify-center">
        <p class="text-xs text-base-content/75 font-sans italic animate-pulse transition-all duration-300">
          {{ currentMessage }}
        </p>
      </div>
    </div>
  </div>

  <!-- Overlay Loader for specific sections/components -->
  <div v-else-if="type === 'overlay'" class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-base-100/75 backdrop-blur-[2px] rounded-xl transition-all duration-300 animate-fade-in">
    <div class="flex flex-col items-center max-w-xs text-center px-4">
      <div class="relative w-20 h-20 mb-4 flex items-center justify-center">
        <!-- DaisyUI Loading Spinner -->
        <span class="loading loading-spinner text-primary w-20 h-20 absolute"></span>
        <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-serif text-xl font-black shadow animate-pulse" :class="{ 'animate-pulse': glow }">
          W
        </div>
      </div>
      <div class="h-5 flex items-center justify-center">
        <p class="text-[11px] text-base-content/85 font-sans italic animate-pulse">
          {{ currentMessage }}
        </p>
      </div>
    </div>
  </div>

  <!-- Classic Inline Spinner -->
  <div v-else-if="type === 'spinner'" class="flex items-center justify-center gap-2.5 py-4 animate-fade-in">
    <!-- DaisyUI Spinner -->
    <span class="loading loading-spinner text-primary loading-sm"></span>
    <span v-if="message" class="text-xs text-secondary font-sans font-medium">{{ message }}</span>
  </div>

  <!-- Skeleton Loader Mode -->
  <div v-else-if="type === 'skeleton'" class="w-full">
    <!-- Card Skeletons Grid -->
    <template v-if="skeletonType === 'card'">
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center w-full">
        <div 
          v-for="n in skeletonCount" 
          :key="n"
          class="card card-bordered w-full max-w-[280px] h-[400px] flex flex-col justify-between p-4 bg-white border border-base-300 shadow-sm"
        >
          <div class="w-full">
            <!-- Header title skeleton -->
            <div class="skeleton h-4 w-3/4 mb-3 mt-1"></div>
            <!-- Divider -->
            <div class="h-[1px] bg-base-300 w-full mb-3.5"></div>
            <!-- Image placeholder -->
            <div class="skeleton w-full aspect-[4/3] min-h-[150px] mb-3.5 border border-base-300/40"></div>
            <!-- Badges placeholder -->
            <div class="flex gap-2 mb-3.5">
              <div class="skeleton h-5 w-16"></div>
              <div class="skeleton h-5 w-12"></div>
            </div>
            <!-- Description paragraphs skeleton -->
            <div class="space-y-2">
              <div class="skeleton h-3 w-full"></div>
              <div class="skeleton h-3 w-5/6"></div>
              <div class="skeleton h-3 w-4/5"></div>
            </div>
          </div>
          <!-- Bottom actions skeleton -->
          <div class="skeleton h-3 w-1/3 ml-auto mt-4 mb-1"></div>
        </div>
      </div>
    </template>

    <!-- Profile Header Skeleton -->
    <template v-else-if="skeletonType === 'profile'">
      <header class="relative text-left pb-6 border-b border-base-300 w-full animate-fade-in">
        <div class="flex flex-col md:flex-row gap-6 items-start md:items-center w-full">
          <!-- Avatar skeleton -->
          <div class="skeleton w-20 h-20 rounded-full flex-shrink-0"></div>
          
          <!-- Profile details skeleton -->
          <div class="flex-1 flex flex-col text-left max-w-xl w-full">
            <div class="skeleton h-7 w-1/3 mb-3"></div>
            <div class="space-y-2 mt-2 w-full">
              <div class="skeleton h-3 w-full"></div>
              <div class="skeleton h-3 w-3/4"></div>
            </div>
          </div>

          <!-- Stats skeleton -->
          <div class="flex gap-6 md:ml-auto md:border-l md:border-base-300 md:pl-8 mt-2 md:mt-0">
            <div>
              <div class="skeleton h-3 w-10 mb-2"></div>
              <div class="skeleton h-8 w-14"></div>
            </div>
            <div class="border-l border-base-300 pl-6">
              <div class="skeleton h-3 w-10 mb-2"></div>
              <div class="skeleton h-8 w-14"></div>
            </div>
          </div>
        </div>
      </header>
    </template>
  </div>
</template>
