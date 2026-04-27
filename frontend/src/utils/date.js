/**
 * Utilitários de data — NUNCA usa new Date() para strings YYYY-MM-DD puras.
 * Isso evita o bug de fuso horário onde o JS interpreta a data como UTC
 * e o Brasil (UTC-3) recebe o dia anterior.
 */

// Quebra "YYYY-MM-DD" em partes sem passar por Date()
const _parts = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return { year: parseInt(m[1]), month: parseInt(m[2]), day: parseInt(m[3]) }
}

// Formata para o atributo value de <input type="date">  →  YYYY-MM-DD
export const formatForInput = (dateStr) => {
  if (!dateStr) return ''
  // Se já vier como "YYYY-MM-DD", retorna direto (caminho mais comum)
  const p = _parts(dateStr)
  if (p) return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`
  // Fallback para strings com horário (ex: "Mon, 27 Apr 2026 00:00:00 GMT")
  // Extrai apenas a parte da data usando regex, sem usar new Date()
  const rfc = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/)
  if (rfc) {
    const MONTHS = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 }
    const d = parseInt(rfc[1]), mon = MONTHS[rfc[2]], y = parseInt(rfc[3])
    if (mon) return `${y}-${String(mon).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  return ''
}

// Formata para exibição ao usuário  →  DD/MM/YYYY
export const formatForDisplay = (dateStr) => {
  if (!dateStr) return 'Sem data'
  const p = _parts(dateStr)
  if (p) return `${String(p.day).padStart(2,'0')}/${String(p.month).padStart(2,'0')}/${p.year}`
  // Fallback RFC
  const rfc = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/)
  if (rfc) {
    const MONTHS = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 }
    const d = parseInt(rfc[1]), mon = MONTHS[rfc[2]], y = parseInt(rfc[3])
    if (mon) return `${String(d).padStart(2,'0')}/${String(mon).padStart(2,'0')}/${y}`
  }
  return 'Data inválida'
}

// Retorna um Date() no horário local ao meio-dia (evita flip de dia)
export const parseSafe = (dateStr) => {
  const p = _parts(dateStr)
  if (p) return new Date(p.year, p.month - 1, p.day, 12, 0, 0)
  return new Date(dateStr) // fallback
}

// Verifica se a data é hoje (sem usar UTC)
export const isToday = (dateStr) => {
  if (!dateStr) return false
  const p = _parts(dateStr)
  if (!p) return false
  const hoje = new Date()
  return p.year === hoje.getFullYear() && p.month === (hoje.getMonth() + 1) && p.day === hoje.getDate()
}

// Verifica se a data está no passado (antes de hoje)
export const isOverdue = (dateStr) => {
  if (!dateStr) return false
  const p = _parts(dateStr)
  if (!p) return false
  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`
  const leadStr = `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`
  return leadStr < hojeStr
}
