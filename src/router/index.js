import { createRouter, createWebHistory } from 'vue-router'
import Voice from '../views/Voice.vue'
import BigScreen from '../views/BigScreen.vue'
import DanmakuPlayer from '../views/DanmakuPlayer.vue'; // 确保路径正确

const routes = [
  {
    path: '/',
    redirect: '/danmaku'
  },
  {
    path: '/voice',
    name: 'voice',
    component: Voice
  },
  {
    path: '/screen',
    name: 'screen',
    component: BigScreen
  },
  {
    path: '/danmaku',
    name: 'danmaku',
    component: DanmakuPlayer
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

