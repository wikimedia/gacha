import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ProfileView from '../views/ProfileView.vue';
import CardView from '../views/CardView.vue';
import { trackPageView } from '../analytics';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/play/:category',
      name: 'play',
      component: HomeView
    },
    {
      path: '/card',
      name: 'card',
      component: CardView
    },
    {
      path: '/@:id',
      name: 'profile',
      component: ProfileView
    },
    {
      path: '/user/:id',
      redirect: to => {
        return { path: `/@${to.params.id}` };
      }
    }
  ]
});

// Report SPA navigations to Google Analytics. afterEach fires once the new
// route is confirmed, so document.title reflects the destination page.
router.afterEach((to) => {
  trackPageView(to.fullPath);
});

export default router;
