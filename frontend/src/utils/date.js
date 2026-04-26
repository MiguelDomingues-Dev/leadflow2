/**
 * Utilitários de data para evitar erros de fuso horário e formatos inválidos.
 */

// Retorna a data no formato YYYY-MM-DD (para inputs)
export const formatForInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  // Usamos as funções de "getUTC" ou forçamos meio-dia para evitar que o fuso
  // horário mude o dia ao converter para ISO.
  const date = new Date(dateStr);
  // Se for apenas data (YYYY-MM-DD), o JS as vezes trata como UTC.
  // Vamos garantir que pegamos os componentes locais se não houver 'T' no meio.
  if (!dateStr.includes('T') && !dateStr.includes('GMT')) {
    const [year, month, day] = dateStr.split(/[-/]/);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Retorna a data no formato DD/MM/YYYY (para exibição)
export const formatForDisplay = (dateStr) => {
  if (!dateStr) return 'Sem data';
  
  try {
    // Se for string, tentamos pegar o formato YYYY-MM-DD
    if (typeof dateStr === 'string') {
      const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (parts) {
        const [_, year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Data inválida';
    
    // Se ainda assim cair aqui, garantimos que pegamos o dia/mês/ano local
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return 'Erro na data';
  }
};

// Compara se a data é hoje (resiliente a fuso horário)
export const isToday = (dateStr) => {
  if (!dateStr) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const d = parseSafe(dateStr);
  d.setHours(0, 0, 0, 0);
  
  return d.getTime() === hoje.getTime();
};

// Compara se a data está atrasada
export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const d = parseSafe(dateStr);
  d.setHours(0, 0, 0, 0);
  
  return d.getTime() < hoje.getTime();
};

// Helper para criar objeto Date de forma segura (ignora fuso horário para datas simples)
export const parseSafe = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Se for YYYY-MM-DD puro, criamos usando os componentes para evitar fuso horário
  if (typeof dateStr === 'string') {
    const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      const [_, year, month, day] = parts;
      // Criar data no meio do dia local para evitar qualquer flutuação de fuso
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
  }
  
  return new Date(dateStr);
};
