<script setup lang="ts">
// Site-wide footer rendered below all page content (home/category selection,
// in-game, post-game results, and profile) via PageLayout.
//
// Legal-mandated layout: the feedback form and privacy policy share one line,
// with the card removal / questions / concerns contact on the line below.
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__links">
      <a
        class="app-footer__link"
        href="https://forms.gle/NvSXJbr8nyVFsFZy8"
        target="_blank"
        rel="noopener noreferrer"
      >
        Feedback
      </a>
      <span class="app-footer__divider" aria-hidden="true">·</span>
      <a
        class="app-footer__link"
        href="https://wikimediafoundation.org/privacy-policy/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy Policy
      </a>
    </div>

    <p class="app-footer__contact">
      For questions, concerns, and card removal requests, please reach out to
      <a class="app-footer__link" href="mailto:damian@wikimedia.org">damian@wikimedia.org</a>
    </p>
  </footer>
</template>

<style scoped>
.app-footer {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding: 0.0rem 0.25rem 0.25rem 0.25rem;
  text-align: center;
}

.app-footer__links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-footer__divider {
  font-size: 0.6875rem;
  color: var(--color-figma-charcoal-muted, rgba(63, 63, 53, 0.8));
}

.app-footer__contact {
  margin: 0;
  font-family: var(--font-family-system-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-figma-charcoal-muted, rgba(63, 63, 53, 0.8));
}

.app-footer__link {
  font-family: var(--font-family-system-sans);
  font-size: 0.5875rem;
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
