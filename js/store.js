/* ============================================================
   Estado + persistência local (localStorage)
   Nada sai do navegador: os dados ficam só neste computador.
============================================================ */
import { participantKey, normalize } from './csv.js';

export function createStore(storageKey) {
  const state = {
    participants: [], // { name, email }
    winners: [],      // { name, email, at } — mais recente primeiro
  };

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch { /* navegador sem storage: segue só em memória */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.participants = Array.isArray(data.participants) ? data.participants : [];
      state.winners = Array.isArray(data.winners) ? data.winners : [];
      return state.participants.length > 0 || state.winners.length > 0;
    } catch {
      return false;
    }
  }

  /** Adiciona sem duplicar. Quem já ganhou não volta para a lista. Retorna quantos entraram. */
  function addParticipants(list) {
    const seen = new Set([...state.participants, ...state.winners].map(participantKey));
    let added = 0;
    for (const p of list) {
      const clean = { name: normalize(p.name), email: normalize(p.email).toLowerCase() };
      if (!clean.name) continue;
      const key = participantKey(clean);
      if (seen.has(key)) continue;
      seen.add(key);
      state.participants.push(clean);
      added++;
    }
    if (added) save();
    return added;
  }

  /** Sorteio com crypto.getRandomValues (sem viés de módulo). */
  function randomIndex(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function pickWinner() {
    if (!state.participants.length) return null;
    return state.participants[randomIndex(state.participants.length)];
  }

  function confirmWinner(winner) {
    const idx = state.participants.indexOf(winner);
    if (idx !== -1) state.participants.splice(idx, 1);
    state.winners.unshift({ ...winner, at: Date.now() });
    save();
  }

  /** Marca/desmarca um vencedor como ausente (continua no histórico e no CSV exportado). */
  function toggleAbsent(index) {
    const w = state.winners[index];
    if (!w) return;
    w.absent = !w.absent;
    save();
  }

  function clearAll() {
    state.participants = [];
    state.winners = [];
    save();
  }

  return { state, load, save, addParticipants, pickWinner, confirmWinner, toggleAbsent, clearAll };
}
