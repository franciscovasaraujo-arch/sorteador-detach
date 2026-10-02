/* ============================================================
   CSV / lista de nomes → participantes { name, email }
============================================================ */

const NAME_HEADERS = ['name', 'nome', 'nome completo', 'participante', 'participant', 'full name', 'nome do participante'];
const EMAIL_HEADERS = ['email', 'e-mail', 'mail', 'email do participante'];

export function normalize(str) {
  return String(str ?? '').replace(/\s+/g, ' ').trim();
}

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r\n|\r|\n/).find(l => l.trim()) || '';
  const counts = { ';': 0, ',': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
}

/** Parser RFC 4180: aspas, aspas escapadas ("") e quebras de linha dentro de campos. */
function parseRows(text, delimiter) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  row.push(field);
  rows.push(row);

  return rows
    .map(r => r.map(c => c.trim()))
    .filter(r => r.some(c => c.length > 0));
}

/**
 * Converte o texto de um CSV em participantes.
 * Detecta cabeçalho, coluna de nome e coluna de email (pelo cabeçalho ou pelo conteúdo).
 */
export function parseCSV(rawText) {
  const text = rawText.replace(/^﻿/, ''); // remove BOM do Excel
  if (!text.trim()) return [];

  const rows = parseRows(text, detectDelimiter(text));
  if (rows.length === 0) return [];

  const header = rows[0].map(h => h.toLowerCase());
  const hasHeader = header.some(h => NAME_HEADERS.includes(h) || EMAIL_HEADERS.includes(h));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  let nameCol = -1;
  let emailCol = -1;

  if (hasHeader) {
    nameCol = header.findIndex(h => NAME_HEADERS.includes(h));
    emailCol = header.findIndex(h => EMAIL_HEADERS.includes(h));
  }

  // Sem cabeçalho de email: procura uma coluna cujo conteúdo pareça email
  if (emailCol === -1 && dataRows.length) {
    const width = Math.max(...dataRows.map(r => r.length));
    for (let c = 0; c < width; c++) {
      const sample = dataRows.slice(0, 20).map(r => r[c] || '').filter(Boolean);
      if (sample.length && sample.filter(isEmail).length / sample.length > 0.6) { emailCol = c; break; }
    }
  }

  // Sem coluna de nome: primeira coluna que não é a de email
  if (nameCol === -1) {
    const width = Math.max(...dataRows.map(r => r.length), 1);
    for (let c = 0; c < width; c++) {
      if (c !== emailCol) { nameCol = c; break; }
    }
    if (nameCol === -1) nameCol = 0;
  }

  return dataRows
    .map(r => {
      const name = normalize(r[nameCol]);
      const email = emailCol > -1 ? normalize(r[emailCol]).toLowerCase() : '';
      return { name: name || email, email: isEmail(email) ? email : '' };
    })
    .filter(p => p.name);
}

/** Cada linha colada vira um participante. Aceita "Nome; email" ou "Nome, email". */
export function parsePastedLines(text) {
  return text
    .split(/\r\n|\r|\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/[;,\t]/).map(normalize);
      const email = parts.find(isEmail) || '';
      const name = parts.find(p => p && !isEmail(p)) || email;
      return { name, email: email.toLowerCase() };
    })
    .filter(p => p.name);
}

/** Chave de duplicidade: email quando existe (evita juntar homônimos), senão o nome. */
export function participantKey(p) {
  return p.email ? `e:${p.email}` : `n:${p.name.toLowerCase()}`;
}

/** Gera o CSV dos vencedores (separador ; e BOM para abrir certo no Excel BR). */
export function winnersToCSV(winners, eventName) {
  const esc = v => {
    const s = String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [['Ordem', 'Nome', 'Email', 'Status', 'Sorteado em', 'Evento'].join(';')];
  [...winners].reverse().forEach((w, i) => {
    const status = w.absent ? 'Ausente' : 'Presente';
    lines.push([i + 1, w.name, w.email, status, new Date(w.at).toLocaleString('pt-BR'), eventName].map(esc).join(';'));
  });
  return '﻿' + lines.join('\r\n');
}
