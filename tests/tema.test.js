import test from 'node:test'
import assert from 'node:assert/strict'
import { foreground, contrast, themeVariables, defaultTheme } from '../src/utils/tema.js'
import { normalizeConfiguration, validateConfiguration } from '../src/utils/configuracion.js'

test('colores claros y oscuros eligen texto con contraste legible', () => {
  for (const color of ['#ffffff', '#000000', '#173d35', '#ff0000', '#00ff00', '#777777', '#123b73']) {
    assert.ok(contrast(color, foreground(color)) >= 4.5)
    const vars = themeVariables({ color_primario: color, color_acento: color })
    assert.ok(contrast(color, vars['--color-brand-highlight']) >= 4.5)
  }
})

test('rechaza valores CSS arbitrarios y conserva ambos colores al normalizar', () => {
  const company = { nombre: 'Prueba', color_primario: '#123b73', color_acento: '#7dd3fc' }
  assert.equal(normalizeConfiguration(company, {}).empresa.color_primario, '#123b73')
  assert.equal(normalizeConfiguration(company, {}).empresa.color_acento, '#7dd3fc')
  assert.ok(validateConfiguration({ ...company, color_primario: 'url(https://example.com)' }, {}).color_primario)
  assert.ok(validateConfiguration({ ...company, color_acento: '' }, {}).color_acento)
  assert.equal(themeVariables({ color_primario: 'invalid' })['--color-brand-900'], defaultTheme.color_primario)
})
