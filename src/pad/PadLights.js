export const PAD_SIZE = 8;

export const LIGHT_EFFECT = {
  STATIC: 'static',
  FLASH: 'flash',
  PULSE: 'pulse',
};

export const PAD_LIGHT = {
  off: {
    id: 'off',
    midi: 0,
    css: '#121417',
    label: 'Off',
  },
  player: {
    id: 'player',
    midi: 45,
    css: '#2f80ff',
    label: 'Player',
  },
  opponent: {
    id: 'opponent',
    midi: 3,
    css: '#f2f5f8',
    label: 'CPU',
  },
  legal: {
    id: 'legal',
    midi: 19,
    css: '#35d66b',
    label: 'Legal',
  },
  last: {
    id: 'last',
    midi: 13,
    css: '#ffd84d',
    label: 'Last',
  },
  warning: {
    id: 'warning',
    midi: 5,
    css: '#ff4f4f',
    label: 'Warning',
  },
  dim: {
    id: 'dim',
    midi: 1,
    css: '#2a2d33',
    label: 'Dim',
  },
};

export function normalizeLight(light) {
  if (!light) {
    return { ...PAD_LIGHT.off, effect: LIGHT_EFFECT.STATIC };
  }

  if (typeof light === 'string') {
    return { ...PAD_LIGHT[light], effect: LIGHT_EFFECT.STATIC };
  }

  const base = typeof light.id === 'string' && PAD_LIGHT[light.id]
    ? PAD_LIGHT[light.id]
    : PAD_LIGHT.off;

  return {
    ...base,
    ...light,
    midi: Number.isFinite(light.midi) ? light.midi : base.midi,
    css: light.css ?? base.css,
    effect: light.effect ?? LIGHT_EFFECT.STATIC,
  };
}

export function emptyFrame() {
  return Array.from({ length: PAD_SIZE * PAD_SIZE }, () => normalizeLight('off'));
}
