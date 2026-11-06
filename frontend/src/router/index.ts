import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/employees' },
    {
      path: '/employees',
      name: 'employee-list',
      component: () => import('../views/EmployeeListView.vue')
    },
    {
      path: '/employees/new',
      name: 'employee-create',
      component: () => import('../views/EmployeeCreateView.vue')
    },
    {
      path: '/employees/:id/edit',
      name: 'employee-edit',
      component: () => import('../views/EmployeeEditView.vue')
    },
    { path: '/:pathMatch(.*)*', redirect: '/employees' }
  ]
})

export default router
