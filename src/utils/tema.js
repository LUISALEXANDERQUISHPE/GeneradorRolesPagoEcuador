export const defaultTheme = { color_primario: '#173d35', color_acento: '#d5eb8b' }
export const themeFields = [
  { key: 'color_primario', label: 'Color principal', description: 'Barra lateral, botones y encabezados.' },
  { key: 'color_acento', label: 'Color de acento', description: 'Resaltados y elementos destacados.' },
]
export const themePresets = [
  { label: 'Verde', color_primario: '#173d35', color_acento: '#d5eb8b' },
  { label: 'Azul', color_primario: '#123b73', color_acento: '#7dd3fc' },
  { label: 'Violeta', color_primario: '#4c2872', color_acento: '#e9c5ff' },
  { label: 'Grafito', color_primario: '#27272a', color_acento: '#fbbf24' },
]
export const isHexColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const rgb = color => [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16))
const luminance = color => rgb(color).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
export const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
export const foreground = color => contrast(color, '#ffffff') >= contrast(color, '#000000') ? '#ffffff' : '#000000'
const mix = (a, b, amount) => '#' + rgb(a).map((v, i) => Math.round(v * (1 - amount) + rgb(b)[i] * amount).toString(16).padStart(2, '0')).join('')
export function themeVariables(theme = {}) {
  const primary = isHexColor(theme.color_primario) ? theme.color_primario : defaultTheme.color_primario
  const accent = isHexColor(theme.color_acento) ? theme.color_acento : defaultTheme.color_acento
  return {
    '--color-brand-900': primary,
    '--color-brand-700': mix(primary, foreground(primary) === '#ffffff' ? '#000000' : '#ffffff', 0.12),
    '--color-brand-600': mix(primary, '#000000', 0.55),
    '--color-brand-50': mix(primary, '#ffffff', 0.95),
    '--color-brand-100': mix(primary, '#ffffff', 0.85),
    '--color-lime-soft': accent,
    '--color-on-brand': foreground(primary),
    '--color-on-accent': foreground(accent),
    '--color-brand-highlight': contrast(primary, accent) >= 4.5 ? accent : foreground(primary),
  }
}
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  for (const [key, value] of Object.entries(themeVariables(theme))) document.documentElement.style.setProperty(key, value)
}
