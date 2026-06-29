<script setup lang="ts">
// Site-wide footer rendered below all page content (home/category selection,
// in-game, post-game results, and profile) via PageLayout.
//
// Legal-mandated link order is: Feedback form → Privacy policy → Concerns.
// The feedback form ([Moonflower] Link feedback form) belongs ABOVE the privacy
// link and the removal/concerns contact ([Moonflower] Add a contact for card
// removal/questions/concerns) belongs BELOW it — see the slots marked below.
</script>

<template>
  <footer class="app-footer">
    <!-- Feedback form goes here (above the privacy policy) -->

    <a
      class="app-footer__link"
      href="https://wikimediafoundation.org/privacy-policy/"
      target="_blank"
      rel="noopener noreferrer"
    >
      Privacy Policy
    </a>

    <!-- Card removal / questions / concerns contact goes here (below the privacy policy) -->
  </footer>
</template>

<style scoped>
.app-footer {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  text-align: center;
}

.app-footer__link {
  font-family: var(--font-family-system-sans);
  font-size: 0.6875rem; /* 11px */
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--color-figma-charcoal-muted, rgba(63, 63, 53, 0.8));
  text-decoration: none;
}

.app-footer__link:hover {
  color: var(--color-figma-charcoal, #3f3f35);
  text-decoration: underline;
}
</style>
