<script setup lang="ts">
import { computed, watch } from 'vue';
import { PhX, PhUser } from '@phosphor-icons/vue';
import type { Category } from '../stores/useGameStore';

interface Attribution {
  title: string;
  license: string;
  author: string;
  thumbnail: string;
  /** Wikimedia Commons page for the asset; the card links here. */
  url: string;
}

const props = defineProps<{
  open: boolean;
  category?: Category;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const CREDITS: Record<Category, Attribution[]> = {
  Media: [
    { title: 'Cher in 2019 cropped.jpg', license: 'CC BY-SA 4.0', author: 'Raph_PH', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Cher_in_2019_cropped.jpg/120px-Cher_in_2019_cropped.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Cher_in_2019_cropped.jpg&wprov=afsw1' },
    { title: 'Deadpool 2 Japan Premiere Red Carpet Ryan Reynolds (cropped).jpg', license: 'CC BY 2.0', author: 'Dick Thomas Johnson from Tokyo, Japan', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_%28cropped%29.jpg/120px-Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_%28cropped%29.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Deadpool_2_Japan_Premiere_Red_Carpet_Ryan_Reynolds_(cropped).jpg&wprov=afsw1' },
    { title: 'Bangtan Boys at the Incheon Music Center in September 2013 02.jpg', license: 'CC BY 4.0', author: 'BulletProof7BTS', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Bangtan_Boys_at_the_Incheon_Music_Center_in_September_2013_02.jpg/120px-Bangtan_Boys_at_the_Incheon_Music_Center_in_September_2013_02.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Bangtan_Boys_at_the_Incheon_Music_Center_in_September_2013_02.jpg&wprov=afsw1' },
    { title: 'Red puppet.jpg', license: 'CC BY 2.0', author: 'Peabody Awards', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Red_puppet.jpg/120px-Red_puppet.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Red_puppet.jpg&wprov=afsw1' },
  ],
  Sports: [
    { title: 'Lionel Messi White House 2026 (3x4 cropped).jpg', license: 'PDM', author: 'The White House', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg/120px-Lionel_Messi_White_House_2026_%283x4_cropped%29.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Lionel_Messi_White_House_2026_(3x4_cropped).jpg&wprov=afsw1' },
    { title: 'San Francisco 49ers Uniforms 2025.png', license: 'CC BY-SA 4.0', author: 'DaRealConMan', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/San_Francisco_49ers_Uniforms_2025.png/120px-San_Francisco_49ers_Uniforms_2025.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:San_Francisco_49ers_Uniforms_2025.png&wprov=afsw1' },
    { title: 'Ferrari F2008 front Museo Ferrari.jpg', license: 'CC BY-SA 3.0', author: 'Morio', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Ferrari_F2008_front_Museo_Ferrari.jpg/120px-Ferrari_F2008_front_Museo_Ferrari.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Ferrari_F2008_front_Museo_Ferrari.jpg&wprov=afsw1' },
    { title: 'Elaine Thompson Herah at the 2019 Pan American Games.jpg', license: 'CC BY-SA 4.0', author: 'Editor4wikip', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Elaine_Thompson_Herah_at_the_2019_Pan_American_Games.jpg/120px-Elaine_Thompson_Herah_at_the_2019_Pan_American_Games.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Elaine_Thompson_Herah_at_the_2019_Pan_American_Games.jpg&wprov=afsw1' },
  ],
  'People / Culture': [
    { title: 'Hieronymus Bosch- The Seven Deadly Sins and the Four Last Things.JPG', license: 'PDM', author: 'Hieronymus Bosch or follower', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Hieronymus_Bosch-_The_Seven_Deadly_Sins_and_the_Four_Last_Things.JPG/120px-Hieronymus_Bosch-_The_Seven_Deadly_Sins_and_the_Four_Last_Things.JPG', url: 'https://commons.wikimedia.org/w/index.php?title=File:Hieronymus_Bosch-_The_Seven_Deadly_Sins_and_the_Four_Last_Things.JPG&wprov=afsw1' },
    { title: 'Sol de Mayo-Bandera de Argentina.svg', license: 'PDM', author: 'Juan Martín de Pueyrredón (1777-1850), according to Ministerio del Interior website', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Sol_de_Mayo-Bandera_de_Argentina.svg/120px-Sol_de_Mayo-Bandera_de_Argentina.svg.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Sol_de_Mayo-Bandera_de_Argentina.svg&wprov=afsw1' },
    { title: 'Harriet Tubman c1868-69.jpg', license: 'PDM', author: 'Benjamin F. Powelson', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Harriet_Tubman_c1868-69.jpg/120px-Harriet_Tubman_c1868-69.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Harriet_Tubman_c1868-69.jpg&wprov=afsw1' },
    { title: 'Petrarch by Bargilla.jpg', license: 'PDM', author: 'Andrea del Castagno', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Petrarch_by_Bargilla.jpg/120px-Petrarch_by_Bargilla.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Petrarch_by_Bargilla.jpg&wprov=afsw1' },
  ],
  Earth: [
    { title: 'Rainbow lorikeet (Trichoglossus moluccanus moluccanus) Sydney.jpg', license: 'CC BY-SA 4.0', author: 'Charles J. Sharp', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Rainbow_lorikeet_%28Trichoglossus_moluccanus_moluccanus%29_Sydney.jpg/120px-Rainbow_lorikeet_%28Trichoglossus_moluccanus_moluccanus%29_Sydney.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Rainbow_lorikeet_(Trichoglossus_moluccanus_moluccanus)_Sydney.jpg&wprov=afsw1' },
    { title: 'Erdglobus, sogenannter Behaim-Globus.jpg', license: 'CC BY-SA 4.0', author: 'Martin Behaim / Georg Glockendon', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Erdglobus%2C_sogenannter_Behaim-Globus.jpg/120px-Erdglobus%2C_sogenannter_Behaim-Globus.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Erdglobus,_sogenannter_Behaim-Globus.jpg&wprov=afsw1' },
    { title: 'Mount Rushmore detail view (100MP).jpg', license: 'CC BY-SA 3.0', author: 'Thomas Wolf, www.foto-tw.de', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Mount_Rushmore_detail_view_%28100MP%29.jpg/120px-Mount_Rushmore_detail_view_%28100MP%29.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Mount_Rushmore_detail_view_(100MP).jpg&wprov=afsw1' },
    { title: 'Statue of Unity.jpg', license: 'CC BY-SA 4.0', author: 'Snehrashmi', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Statue_of_Unity.jpg/120px-Statue_of_Unity.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Statue_of_Unity.jpg&wprov=afsw1' },
  ],
  'History / Society': [
    { title: 'Phocas coin.jpg', license: 'CC BY-SA 3.0', author: 'CNG Coins', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Phocas_coin.jpg/120px-Phocas_coin.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Phocas_coin.jpg&wprov=afsw1' },
    { title: 'Kleopatra-VII.-Altes-Museum-Berlin1.jpg', license: 'PDM', author: 'Louis le Grand', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleopatra-VII.-Altes-Museum-Berlin1.jpg/120px-Kleopatra-VII.-Altes-Museum-Berlin1.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:Kleopatra-VII.-Altes-Museum-Berlin1.jpg&wprov=afsw1' },
    { title: 'Banner of the Holy Roman Emperor with haloes (1430-1806).svg', license: 'CC BY-SA 3.0', author: 'David Liuzzo, eagle by N3MO', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Banner_of_the_Holy_Roman_Emperor_with_haloes_%281430-1806%29.svg/120px-Banner_of_the_Holy_Roman_Emperor_with_haloes_%281430-1806%29.svg.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Banner_of_the_Holy_Roman_Emperor_with_haloes_(1430-1806).svg&wprov=afsw1' },
    { title: 'Chaos Monster and Sun God.png', license: 'PDM', author: 'editor Austen Henry Layard , drawing by L. Gruner', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Chaos_Monster_and_Sun_God.png/120px-Chaos_Monster_and_Sun_God.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Chaos_Monster_and_Sun_God.png&wprov=afsw1' },
  ],
  'Physical Science': [
    { title: 'PH scale 3.jpg', license: 'CC BY 4.0', author: 'Alvy16', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/PH_scale_3.jpg/120px-PH_scale_3.jpg', url: 'https://commons.wikimedia.org/w/index.php?title=File:PH_scale_3.jpg&wprov=afsw1' },
    { title: 'Density column.JPG', license: 'CC BY-SA 3.0', author: 'PRHaney', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Density_column.JPG/120px-Density_column.JPG', url: 'https://commons.wikimedia.org/w/index.php?title=File:Density_column.JPG&wprov=afsw1' },
    { title: 'Aripiprazole molecule from xtal ball.png', license: 'CC0', author: 'Jynto (talk)', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Aripiprazole_molecule_from_xtal_ball.png/120px-Aripiprazole_molecule_from_xtal_ball.png', url: 'https://commons.wikimedia.org/w/index.php?title=File:Aripiprazole_molecule_from_xtal_ball.png&wprov=afsw1' },
  ],
};

const credits = computed<Attribution[]>(
  () => (props.category && CREDITS[props.category]) || CREDITS.Media
);

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
);
</script>

<template>
  <Teleport to="body">
    <Transition name="credits-fade">
      <div v-if="open" class="credits-backdrop" @click="emit('close')"></div>
    </Transition>

    <Transition name="credits-slide">
      <div v-if="open" class="credits-sheet" role="dialog" aria-modal="true" aria-label="Credits">
        <!-- Header -->
        <div class="flex items-start justify-between px-4 pb-2 shrink-0">
          <p class="flex-1 font-bold text-sm m-0" :style="{ color: 'var(--color-base)' }">
            Credits
          </p>
          <button
            class="flex items-center justify-center w-8 h-8 -mr-2 rounded bg-transparent border-0 cursor-pointer text-[#2f2e2e] hover:bg-black/5 active:scale-90 transition-all"
            aria-label="Close credits"
            @click="emit('close')"
          >
            <PhX :size="18" weight="bold" />
          </button>
        </div>

        <!-- Subtitle -->
        <p class="px-4 text-sm leading-[22px] m-0 shrink-0" :style="{ color: 'var(--color-base)' }">
          Content adapted from
          <a
            href="https://www.wikipedia.org"
            target="_blank"
            rel="noopener noreferrer"
            class="no-underline hover:underline"
            :style="{ color: 'var(--color-progressive)' }"
          >Wikipedia</a>
          and
          <a
            href="https://commons.wikimedia.org"
            target="_blank"
            rel="noopener noreferrer"
            class="no-underline hover:underline"
            :style="{ color: 'var(--color-progressive)' }"
          >Wikimedia Commons</a>.
        </p>

        <!-- Attribution cards -->
        <div class="flex flex-col gap-2 px-4 py-2 overflow-y-auto">
          <a
            v-for="(item, i) in credits"
            :key="i"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="credits-card flex gap-3 items-start p-3 rounded-[10px] no-underline cursor-pointer"
          >
            <div class="shrink-0 w-[52px] h-[72px] rounded-[10px] overflow-hidden border border-[#2f2e2e]">
              <img
                :src="item.thumbnail"
                :alt="item.title"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <p class="font-bold text-sm leading-5 m-0 text-[#2f2e2e]">{{ item.title }}</p>
              <p class="text-sm leading-5 m-0" :style="{ color: 'var(--color-subtle)' }">{{ item.license }}</p>
              <div class="flex gap-1 items-start pt-1">
                <PhUser :size="14" weight="fill" class="shrink-0 mt-0.5" :style="{ color: 'var(--color-subtle)' }" />
                <p class="flex-1 min-w-0 text-xs leading-5 m-0" :style="{ color: 'var(--color-subtle)' }">{{ item.author }}</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.credits-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.65);
}

.credits-sheet {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 61;
  width: 100%;
  max-width: 28rem; /* max-w-md — matches the app content column */
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  background-color: #f0e5d5;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.28);
  font-family: var(--font-family-system-sans);
}

.credits-card {
  background-color: #e5d8c6;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.credits-card:hover {
  background-color: #ddcdb8;
}

.credits-card:active {
  transform: scale(0.99);
}

/* Backdrop fade */
.credits-fade-enter-active,
.credits-fade-leave-active {
  transition: opacity 0.25s ease;
}
.credits-fade-enter-from,
.credits-fade-leave-to {
  opacity: 0;
}

/* Sheet slide-up */
.credits-slide-enter-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.credits-slide-leave-active {
  transition: transform 0.25s ease;
}
.credits-slide-enter-from,
.credits-slide-leave-to {
  transform: translate(-50%, 100%);
}
</style>
