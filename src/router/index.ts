import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ProfileView from '../views/ProfileView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
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
