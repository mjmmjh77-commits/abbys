// The kelp is on the right of the track. Both the specimen and the guardian
// hesitate, turn toward it, then cross the track once and rest in cover.
export function kelpDash(elapsed: number) {
  const turn = 1.7, launch = 2.95, settle = 3.42;
  const start = 0.5 - 0.13 * Math.sin(Math.min(elapsed / turn, 1) * Math.PI / 2);
  if (elapsed < turn) return { phase: 'swim', x: start } as const;
  if (elapsed < launch) {
    const windup = (elapsed - turn) / (launch - turn);
    return { phase: 'turn', x: start - 0.055 * windup } as const;
  }
  if (elapsed < settle) {
    const t = (elapsed - launch) / (settle - launch);
    return { phase: 'dash', x: start - 0.055 + 0.485 * t * t * (3 - 2 * t) } as const;
  }
  return { phase: 'rest', x: 0.8 - 0.065 * (1 - Math.cos((elapsed - settle) * 1.5)) } as const;
}

export function rhythmRules(rank: number, sea: number, linkLevel: number) {
  const target = rank >= 8 ? 4 : 3;
  const width = Math.max(0.105, 0.3 - rank * 0.016 + linkLevel * 0.008);
  const period = Math.PI * Math.max(300, 620 - rank * 27 - sea * 12);
  // Each full travel from one end to the other has exactly one central window.
  const deadline = Math.max(9000 - rank * 350, (target + 1) * period);
  return { target, width, period, deadline };
}

export function rhythmBeat(elapsed: number, rules: ReturnType<typeof rhythmRules>) {
  const phase = elapsed / rules.period;
  const x = 0.5 - Math.cos(phase * Math.PI) * 0.46;
  return { index: Math.floor(phase), x, open: Math.abs(x - 0.5) <= rules.width / 2 };
}
