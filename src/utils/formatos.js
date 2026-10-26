export const money = value => new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(value || 0))
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export const currentMonth = () => today().slice(0,7)
export const roleLabel = type => ({mensual:'Rol mensual',decimo_tercero:'Décimo tercero',decimo_cuarto:'Décimo cuarto'})[type] || type
export const employeeName = e => [e.apellidos,e.nombres].filter(Boolean).join(' ')
