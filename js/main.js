import { config } from './config.js';
import { parseCSV, parsePastedLines, winnersToCSV } from './csv.js';
import { createStore } from './store.js';

const DRAW_DURATION = 5000;

const $ = id => document.getElementById(id);
const el = {
  app: $('app'), importBtn: $('importBtn'), fileInput: $('fileInput'), pasteArea: $('pasteArea'),
  counterNum: $('counterNum'), drawBtn: $('drawBtn'), presentBtn: $('presentBtn'),
  historyList: $('historyList'), presentHistory: $('presentHistory'), exportBtn: $('exportBtn'),
  clearBtn: $('clearBtn'), nameDisplay: $('nameDisplay'), nameText: $('nameText'),
  stageStatus: $('stageStatus'), stageSub: $('stageSub'), liveDot: $('liveDot'),
  winnerGlow: $('winnerGlow'), confetti: $('confetti'), toast: $('toast'), dropOverlay: $('dropOverlay'),
  logoImg: $('logoImg'), presentLogoImg: $('presentLogoImg'), eventName: $('eventName'), tickerTrack: $('tickerTrack'),
};

const store = createStore(config.storageKey);
const ui = { presenting: false, drawing: false };

/* ============================================================
   UTIL
============================================================ */
let toastTimer;
function toast(msg, ms = 2600) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
}

const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ============================================================
   MARCA / TEMA
============================================================ */
function applyBrand() {
  const { theme, eventName } = config;
  document.documentElement.dataset.theme = config.themeId;
  document.title = `Sorteio ao vivo — ${eventName}`;
  el.eventName.textContent = eventName;
  el.stageSub.textContent = ' ';

  [el.logoImg, el.presentLogoImg].forEach(img => { img.src = theme.logo; });
  el.logoImg.alt = theme.logoAlt;

  if (theme.ticker) {
    const items = [...theme.ticker];
    if (!items.includes(eventName)) items.splice(1, 0, eventName);
    const once = items.map(t => `<span>${escapeHTML(t)}</span><span class="sep">✦</span>`).join('');
    el.tickerTrack.innerHTML = once + once + once + once; // duplicado → loop contínuo
  }
}

/* ============================================================
   RENDER
============================================================ */
function renderCounter() {
  el.counterNum.textContent = store.state.participants.length;
  el.drawBtn.disabled = store.state.participants.length === 0 || ui.drawing;
  el.exportBtn.disabled = store.state.winners.length === 0;
}

function renderHistory() {
  const { winners } = store.state;
  const total = winners.length;

  if (!total) {
    el.historyList.innerHTML = '<li class="history-empty">Nenhum sorteio ainda</li>';
  } else {
    el.historyList.innerHTML = winners.map((w, i) => `
      <li class="history-item${w.absent ? ' absent' : ''}">
        <span class="idx">${String(total - i).padStart(2, '0')}</span>
        <span class="who">
          <span class="name">${escapeHTML(w.name)}</span>
          ${w.email ? `<span class="email">${escapeHTML(w.email)}</span>` : ''}
        </span>
        <button class="absent-btn" type="button" data-index="${i}">${w.absent ? 'Desfazer' : 'Ausente'}</button>
      </li>`).join('');
  }

  const top5 = winners.slice(0, 5);
  el.presentHistory.innerHTML = top5.length
    ? '<span class="ph-label">Vencedores</span>' + top5.map((w, i) =>
        `<div class="ph-item${w.absent ? ' absent' : ''}"><b>${total - i}</b>${escapeHTML(w.name)}</div>`).join('')
    : '';
}

function renderAll() { renderCounter(); renderHistory(); }

function resetStage() {
  el.nameDisplay.className = 'name-display idle';
  el.nameText.textContent = 'Pressione ESPAÇO para sortear';
  el.stageStatus.textContent = 'Aguardando…';
  el.stageStatus.classList.remove('winner');
  el.winnerGlow.classList.remove('active');
  el.liveDot.classList.remove('live');
}

/* ============================================================
   IMPORTAÇÃO
============================================================ */
function importList(list, source) {
  if (!list.length) { toast(`Nenhum nome encontrado ${source}`); return; }
  const added = store.addParticipants(list);
  const skipped = list.length - added;
  let msg = `${plural(added, 'participante importado', 'participantes importados')}`;
  if (skipped) msg += ` · ${plural(skipped, 'repetido ignorado', 'repetidos ignorados')}`;
  toast(msg);
  renderCounter();
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => importList(parseCSV(e.target.result), 'no arquivo');
  reader.onerror = () => toast('Não foi possível ler o arquivo');
  reader.readAsText(file, 'UTF-8');
}

el.importBtn.addEventListener('click', () => el.fileInput.click());
el.fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
  el.fileInput.value = '';
  el.fileInput.blur();
});

let pasteTimer;
el.pasteArea.addEventListener('input', () => {
  clearTimeout(pasteTimer);
  pasteTimer = setTimeout(() => {
    const list = parsePastedLines(el.pasteArea.value);
    if (!list.length) return;
    importList(list, 'no texto');
    el.pasteArea.value = '';
    el.pasteArea.blur(); // libera o ESPAÇO para sortear logo em seguida
  }, 800);
});

let dragDepth = 0;
window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; el.dropOverlay.classList.add('active'); });
window.addEventListener('dragleave', e => {
  e.preventDefault();
  if (--dragDepth <= 0) { dragDepth = 0; el.dropOverlay.classList.remove('active'); }
});
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  el.dropOverlay.classList.remove('active');
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

/* ============================================================
   SORTEIO
============================================================ */
function draw() {
  if (ui.drawing || !store.state.participants.length) return;
  const winner = store.pickWinner();
  ui.drawing = true;
  renderCounter();

  el.stageStatus.textContent = 'Sorteando…';
  el.stageStatus.classList.remove('winner');
  el.nameDisplay.className = 'name-display rolling';
  el.liveDot.classList.add('live');
  el.winnerGlow.classList.remove('active');
  el.confetti.innerHTML = '';

  animate(winner, () => finish(winner));
}

function animate(winner, done) {
  const pool = store.state.participants.length > 1 ? store.state.participants : [winner];
  const start = performance.now();
  let lastSwap = 0;

  function frame(now) {
    const t = Math.min((now - start) / DRAW_DURATION, 1);
    const interval = 45 + (420 - 45) * Math.pow(t, 2.6); // desacelera

    if (now - lastSwap >= interval) {
      lastSwap = now;
      el.nameText.textContent = t < 0.94 ? pool[Math.floor(Math.random() * pool.length)].name : winner.name;
    }
    if (t < 1) requestAnimationFrame(frame);
    else { el.nameText.textContent = winner.name; done(); }
  }
  requestAnimationFrame(frame);
}

function finish(winner) {
  store.confirmWinner(winner);

  el.nameDisplay.className = 'name-display revealed' + (winner.name.length > 24 ? ' long' : '');
  el.winnerGlow.classList.add('active');
  el.stageStatus.textContent = 'Vencedor';
  el.stageStatus.classList.add('winner');
  burstConfetti();

  ui.drawing = false;
  renderAll();
  setTimeout(() => el.liveDot.classList.remove('live'), 1200);
}

function burstConfetti() {
  const colors = config.theme.confetti;
  if (!colors || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement('i');
    const size = 8 + Math.round(Math.random() * 3) * 6; // quadrados "pixel" 8/14/20/26
    piece.style.cssText = [
      `left:${Math.random() * 100}%`, `width:${size}px`, `height:${size}px`,
      `background:${colors[i % colors.length]}`,
      `--dx:${(Math.random() - 0.5) * 240}px`, `--rot:${(Math.random() < .5 ? -1 : 1) * 90 * Math.ceil(Math.random() * 4)}deg`,
      `--dur:${2.4 + Math.random() * 2}s`, `--delay:${Math.random() * 0.5}s`,
    ].join(';');
    frag.appendChild(piece);
  }
  el.confetti.appendChild(frag);
  setTimeout(() => { el.confetti.innerHTML = ''; }, 5500);
}

el.drawBtn.addEventListener('click', draw);

/* ============================================================
   HISTÓRICO / EXPORTAR / LIMPAR
============================================================ */
el.historyList.addEventListener('click', e => {
  const btn = e.target.closest('.absent-btn');
  if (!btn) return;
  store.toggleAbsent(Number(btn.dataset.index));
  renderHistory();
});

el.exportBtn.addEventListener('click', () => {
  const blob = new Blob([winnersToCSV(store.state.winners, config.eventName)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  const slug = config.eventName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  a.href = URL.createObjectURL(blob);
  a.download = `vencedores-${slug || 'sorteio'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// confirmação em dois cliques (sem pop-up do navegador)
let clearTimer;
el.clearBtn.addEventListener('click', () => {
  if (ui.drawing) return;
  if (!el.clearBtn.classList.contains('confirming')) {
    el.clearBtn.classList.add('confirming');
    el.clearBtn.textContent = 'Clique de novo para apagar';
    clearTimer = setTimeout(() => {
      el.clearBtn.classList.remove('confirming');
      el.clearBtn.textContent = 'Limpar tudo';
    }, 3000);
    return;
  }
  clearTimeout(clearTimer);
  el.clearBtn.classList.remove('confirming');
  el.clearBtn.textContent = 'Limpar tudo';
  store.clearAll();
  resetStage();
  renderAll();
  toast('Participantes e vencedores apagados');
});

/* ============================================================
   APRESENTAÇÃO / TELA CHEIA / ATALHOS
============================================================ */
function togglePresentation(force) {
  ui.presenting = typeof force === 'boolean' ? force : !ui.presenting;
  el.app.classList.toggle('presenting', ui.presenting);
  el.presentBtn.textContent = ui.presenting ? 'Sair da apresentação' : 'Modo apresentação';
}
el.presentBtn.addEventListener('click', () => togglePresentation());

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

window.addEventListener('keydown', e => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  const onButton = tag === 'BUTTON' && document.activeElement !== document.body;

  if (e.code === 'Space' || (e.code === 'Enter' && !onButton)) {
    e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    draw();
  } else if (e.key.toLowerCase() === 'f') {
    e.preventDefault(); toggleFullscreen();
  } else if (e.key.toLowerCase() === 'p') {
    e.preventDefault(); togglePresentation();
  } else if (e.key === 'Escape' && ui.presenting) {
    togglePresentation(false);
  }
});

/* ============================================================
   INIT
============================================================ */
applyBrand();
resetStage();
if (store.load()) {
  const { participants, winners } = store.state;
  toast(`Sorteio recuperado: ${plural(participants.length, 'participante', 'participantes')} · ${plural(winners.length, 'vencedor', 'vencedores')}`, 3600);
}
renderAll();
if (config.startPresenting) togglePresentation(true);
