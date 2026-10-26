import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/main.css'
import { readBrandCache } from './utils/marcaCache.js'
import { applyTheme } from './utils/tema.js'

const savedBrand = readBrandCache()
if (savedBrand) applyTheme(savedBrand)

createApp(App).use(createPinia()).use(router).mount('#app')
