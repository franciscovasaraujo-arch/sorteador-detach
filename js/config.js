/* ============================================================
   Configuração por URL + temas
   ?tema=detach | inspect      (padrão: detach)
   ?evento=Esquenta%20%232     (título do sorteio — também separa o que fica salvo)
   ?apresentacao=1             (já abre no modo apresentação)
============================================================ */

export const THEMES = {
  detach: {
    label: 'Detach! 26',
    logo: 'assets/detach-logo-horizontal.svg',
    logoAlt: 'Detach! 26',
    defaultEvent: 'Detach! 26',
    ticker: ['Sorteio ao vivo', 'Detach! 26', 'Fortaleza, Ceará', '20, 21 e 22 de novembro'],
    confetti: ['#FF4B27', '#7029FF', '#B499FF', '#88C9F7', '#FF0095', '#69E098', '#A8F8E4'],
  },
  inspect: {
    label: 'Inspect!',
    logo: 'assets/inspect-logo.svg',
    logoAlt: 'Inspect!',
    defaultEvent: 'Inspect!',
    ticker: null,
    confetti: null,
  },
};

const params = new URLSearchParams(location.search);

const themeId = THEMES[params.get('tema')] ? params.get('tema') : 'detach';

export const config = {
  themeId,
  theme: THEMES[themeId],
  eventName: (params.get('evento') || '').trim() || THEMES[themeId].defaultEvent,
  startPresenting: ['1', 'true', 'sim'].includes((params.get('apresentacao') || '').toLowerCase()),
};

config.storageKey = `sorteador:v1:${config.themeId}:${config.eventName.toLowerCase()}`;
