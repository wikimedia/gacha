import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ProfileView from '../views/ProfileView.vue';
import CardView from '../views/CardView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
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

export default router;
