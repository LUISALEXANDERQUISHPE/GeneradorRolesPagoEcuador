import { regimenes } from './regimenes.js'
import { defaultTheme, themeFields, isHexColor } from './tema.js'

export const parameterFields = [
  { key: 'sbu', label: 'Sueldo Básico Unificado (USD)', min: 0.01, max: 9999999999.99, decimals: 2, step: '0.01' },
  { key: 'aporte_personal_pct', label: 'Aporte personal IESS (%)', min: 0, max: 100, decimals: 4, step: '0.0001' },
  { key: 'aporte_patronal_pct', label: 'Aporte patronal IESS (%)', min: 0, max: 100, decimals: 4, step: '0.0001' },
  { key: 'fondos_reserva_pct', label: 'Fondos de reserva (%)', min: 0, max: 100, decimals: 4, step: '0.0001' },
  { key: 'recargo_suplementarias_pct', label: 'Recargo de horas suplementarias (%)', min: 0, max: 1000, decimals: 4, step: '0.0001' },
  { key: 'recargo_extraordinarias_pct', label: 'Recargo de horas extraordinarias (%)', min: 0, max: 1000, decimals: 4, step: '0.0001' },
  { key: 'dias_base_mes', label: 'Días base del mes', min: 1, max: 31, decimals: 0, step: '1' },
  { key: 'horas_jornada', label: 'Horas de jornada diaria', min: 0.01, max: 24, decimals: 2, step: '0.01' },
]

export const companyFields = [
  { key: 'nombre', label: 'Nombre de la empresa', max: 180, required: true },
  { key: 'ruc', label: 'RUC', max: 13 },
  { key: 'representante', label: 'Representante / empleador', max: 180 },
  { key: 'correo', label: 'Correo electrónico', max: 180, type: 'email' },
  { key: 'telefono', label: 'Teléfono', max: 30, type: 'tel' },
  { key: 'direccion', label: 'Dirección', max: 500 },
]

export function normalizeConfiguration(company, parameters) {
  const empresa = Object.fromEntries(companyFields.map(({ key }) => [key, String(company[key] ?? '').trim() || null]))
  empresa.regimen_laboral = company.regimen_laboral || 'codigo_trabajo'
  empresa.logo_data_url = company.logo_data_url || null
  for (const { key } of themeFields) empresa[key] = company[key] ?? defaultTheme[key]
  const parametros = Object.fromEntries(parameterFields.map(({ key }) => [key, String(parameters[key] ?? '').trim()]))
  return { empresa, parametros }
}

export function validateConfiguration(company, parameters) {
  const errors = {}
  if (!regimenes.some(r => r.id === (company.regimen_laboral || 'codigo_trabajo'))) errors.regimen_laboral = 'Selecciona un régimen válido.'
  const { empresa, parametros } = normalizeConfiguration(company, parameters)
  for (const field of companyFields) {
    const value = empresa[field.key] || ''
    if (field.required && !value) errors[field.key] = 'Este campo es obligatorio.'
    else if (value.length > field.max) errors[field.key] = 'El máximo es ' + field.max + ' caracteres.'
  }
  if (empresa.ruc && !/^\d{13}$/.test(empresa.ruc)) errors.ruc = 'Ingresa los 13 dígitos del RUC.'
  if (empresa.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empresa.correo)) errors.correo = 'Ingresa un correo válido.'
  for (const field of parameterFields) {
    const value = parametros[field.key]
    const pattern = field.decimals === 0 ? /^\d+$/ : new RegExp('^\\d+(?:\\.\\d{1,' + field.decimals + '})?$')
    if (!value) errors[field.key] = 'Este campo es obligatorio.'
    else if (!pattern.test(value) || Number(value) < field.min || Number(value) > field.max) {
      errors[field.key] = 'Ingresa un valor entre ' + field.min + ' y ' + field.max + (field.decimals === 0 ? ', sin decimales.' : ', con hasta ' + field.decimals + ' decimales.')
    }
  }
  if (empresa.logo_data_url && (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(empresa.logo_data_url) || empresa.logo_data_url.length > 700000)) {
    errors.logo_data_url = 'Selecciona una imagen PNG o JPEG de hasta 500 KB.'
  }
  for (const { key } of themeFields) {
    if (!isHexColor(empresa[key])) errors[key] = 'Usa un color hexadecimal de seis dígitos, como #123b73.'
  }
  return errors
}
