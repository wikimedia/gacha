<script setup lang="ts">
// Site-wide footer rendered below all page content (home/category selection,
// in-game, post-game results, and profile) via PageLayout.
//
// Layout (Figma "Bot Nav"): Rules · Privacy & Notices · Contact Us · [Donate].
// "Rules" and "Privacy & Notices" are placeholders that will open an in-app
// sheet later — no-ops for now. "Contact Us" opens the feedback Google Form;
// "Donate to Wikipedia" links to the WMF donation page.
const CONTACT_FORM_URL = 'https://forms.gle/NvSXJbr8nyVFsFZy8';
const DONATE_URL = 'https://donate.wikimedia.org/w/index.php';
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__row">
      <!-- TODO: open an in-app sheet (no-op for now) -->
      <button type="button" class="app-footer__link">Rules</button>
      <!-- TODO: open an in-app sheet (no-op for now) -->
      <button type="button" class="app-footer__link">Privacy &amp; Notices</button>
      <a
        class="app-footer__link"
        :href="CONTACT_FORM_URL"
        target="_blank"
        rel="noopener noreferrer"
      >
        Contact Us
      </a>
      <a
        class="app-footer__donate"
        :href="DONATE_URL"
        target="_blank"
        rel="noopener noreferrer"
      >
        Donate to Wikipedia
      </a>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  flex-shrink: 0;
  width: 100%;
}

.app-footer__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  max-width: 28rem; /* match .app-page-main (max-w-md) */
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.app-footer__link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  color: #2f2e2e;
  opacity: 0.8;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}

.app-footer__link:hover {
  opacity: 1;
  text-decoration: underline;
}

.app-footer__donate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 1px 6px;
  border: 1px solid #72777d;
  border-radius: 7px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  color: #404244;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.app-footer__donate:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
