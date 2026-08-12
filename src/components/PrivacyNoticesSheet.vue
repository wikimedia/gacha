<script setup lang="ts">
import BaseSheet from './BaseSheet.vue';

// "Privacy & Notices" bottom sheet, opened from the footer. Explains the
// third-party services the game relies on and links to their privacy policies,
// followed by a legal disclaimer about card ownership. Copy from Figma
// ("bottomSheet", node 1542:69363).
defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const SERVICES = [
  {
    name: 'Wikipedia',
    lead: 'We source card content from Wikipedia. Refer to Wikipedia’s ',
    policyUrl: 'https://foundation.wikimedia.org/wiki/Legal:World_of_Wikipedia_Survey_Privacy_Statement',
  },
  {
    name: 'Firebase',
    lead: 'We use Firebase to host the game. Refer to Google’s ',
    policyUrl: 'https://firebase.google.com/support/privacy',
  },
  {
    name: 'Supabase',
    lead: 'We use Supabase to store cards and user accounts. Refer to Supabase’s ',
    policyUrl: 'https://supabase.com/privacy',
  },
  {
    name: 'Google Analytics',
    lead: 'We use Google Analytics to monitor app usage. Refer to Google’s ',
    policyUrl: 'https://policies.google.com/technologies/partner-sites',
  },
];
</script>

<template>
  <BaseSheet :open="open" title="Privacy &amp; Notices" @close="emit('close')">
    <!-- Intro -->
    <p class="px-4 pb-2 text-sm leading-body m-0 text-ink">
      World of Wikipedia is built on several third-party services that help the
      game run. We only collect what we need to run the game and never sell your
      information.
    </p>

    <!-- Third-party services -->
    <ol class="flex flex-col gap-4 px-4 pt-4 pb-6 m-0 list-none">
      <li
        v-for="(service, i) in SERVICES"
        :key="service.name"
        class="flex gap-2.5 items-start"
      >
        <span class="shrink-0 w-4 text-sm leading-body text-ink">{{ i + 1 }}.</span>
        <div class="flex-1 min-w-0 flex flex-col text-sm leading-body text-ink">
          <span class="font-bold">{{ service.name }}</span>
          <span>
            {{ service.lead }}<a
              :href="service.policyUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary no-underline hover:underline"
            >Privacy Policy</a>.
          </span>
        </div>
      </li>
    </ol>

    <!-- Divider -->
    <hr class="privacy-divider" />

    <!-- Legal disclaimer -->
    <p class="px-4 py-6 m-0 text-xs leading-5 text-secondary text-justify">
      Disclaimer: Participants do not acquire any ownership in a &ldquo;Gacha&rdquo;
      card by obtaining, winning, or claiming it. Participation allows only limited
      use to collect and interact with &ldquo;Gacha&rdquo; cards within the gaming
      platform. &ldquo;Gacha&rdquo; cards are created for entertainment purposes and
      do not hold any monetary or commercial value. A participant&rsquo;s card(s) may
      be deprecated at any time, without notice.
    </p>
  </BaseSheet>
</template>

<style scoped>
.privacy-divider {
  margin: 0 16px;
  border: 0;
  border-top: 1px solid var(--color-border-neutral);
}
</style>
