import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'



const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'inicio', component: () => import('../views/DashboardView.vue'), meta: { title: 'Resumen' } },
        { path: 'empleados', name: 'empleados', component: () => import('../views/EmpleadosView.vue'), meta: { title: 'Empleados', description: 'Administra los datos personales, laborales y las modalidades de beneficios de tu equipo.', block: 2 } },
        { path: 'roles/nuevo', name: 'generar-roles', component: () => import('../views/GenerarRolesView.vue'), meta: { title: 'Generar roles', description: 'Prepara la nómina mensual, revisa el desglose y guarda los roles individuales o de todo tu equipo.', block: 3 } },
        { path: 'historial', name: 'historial', component: () => import('../views/HistorialView.vue'), meta: { title: 'Historial', description: 'Consulta, edita, anula y regenera los roles de pago de períodos anteriores.', block: 4 } },
        { path: 'reportes', name: 'reportes', component: () => import('../views/ReportesView.vue'), meta: { title: 'Reportes', description: 'Exporta roles individuales y consolidados mensuales a PDF y Excel.', block: 5 } },
        { path: 'configuracion', name: 'configuracion', component: () => import('../views/ConfiguracionView.vue'), meta: { title: 'Configuración' } },
        { path: ':pathMatch(.*)*', name: 'no-encontrado', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Página no encontrada' } },
      ],
    },
  ],
})

router.afterEach((to) => { document.title = `${to.meta.title} · Nómina` })
export default router
