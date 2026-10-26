import { isHexColor } from './tema.js'

export function brandCacheKey(url) {
  try {
    const parsed = new URL(url)
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) return null
    // La clave identifica la base; nunca contiene usuario ni contraseña.
    return 'nomina:marca:v1:' + parsed.hostname + parsed.pathname
  } catch { return null }
}
const cacheKey = brandCacheKey(import.meta.env?.VITE_DATABASE_URL)
function localStorageOrNull() {
  try { return globalThis.localStorage || null } catch { return null }
}
function sanitize(company) {
  if (!company || typeof company.nombre !== 'string' || !company.nombre.trim() ||
      company.nombre.length > 180 || !isHexColor(company.color_primario) || !isHexColor(company.color_acento)) return null
  const logo = company.logo_data_url || ''
  if (typeof logo !== 'string' || logo.length > 700000 ||
      (logo && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logo))) return null
  return { nombre: company.nombre, logo_data_url: logo,
    color_primario: company.color_primario, color_acento: company.color_acento }
}
export function readBrandCache(storage = localStorageOrNull(), key = cacheKey) {
  if (!key || !storage) return null
  try {
    const cached = JSON.parse(storage.getItem(key))
    return cached?.version === 1 ? sanitize(cached.empresa) : null
  } catch { return null }
}
export function saveBrandCache(company, storage = localStorageOrNull(), key = cacheKey) {
  const safe = sanitize(company)
  if (!key || !storage || !safe) return
  try { storage.setItem(key, JSON.stringify({ version: 1, empresa: safe })) } catch {
    // El bloqueo de almacenamiento nunca debe impedir guardar en Neon.
  }
}
