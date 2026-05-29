import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

// Import Wikimedia Codex Compiled Style Sheets
import '@wikimedia/codex/dist/codex.style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
