// A "shimmer" effect for terminal text: a bright band sweeps across the
// characters — brightest where the moving head sits — then rests before the
// next pass. Drive it by passing an increasing `phase` (one step per
// SHIMMER_INTERVAL_MS), typically derived from wall-clock time so the animation
// stays smooth regardless of how often the consumer repaints.

const RESET = "\x1b[0m";

// The band sweeps each glyph's color between a muted purple (base) and a bright
// lavender (peak).
const BASE: [number, number, number] = [108, 92, 168];
const PEAK: [number, number, number] = [206, 198, 255];
// Half-width, in glyphs, of the bright band trailing the sweep head.
const BAND = 2.5;
// One sweep across the text, then a short rest before the next — in ticks.
const SWEEP_TICKS = 26;
const REST_TICKS = 12;
const CYCLE = SWEEP_TICKS + REST_TICKS;

// Cadence of one phase step; ~20fps reads as smooth without busying the terminal.
export const SHIMMER_INTERVAL_MS = 50;

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const truecolor = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

// `text` at the resting base color, for a settled (or non-animating) line.
export function shimmerRest(text: string): string {
  return `${truecolor(...BASE)}${text}${RESET}`;
}

// One animation frame: color each glyph by its distance from the sweep head,
// which advances with `phase` and parks past the text during the rest beat.
export function shimmer(text: string, phase: number): string {
  const tick = phase % CYCLE;
  const progress = Math.min(tick, SWEEP_TICKS) / SWEEP_TICKS;
  const head = -BAND + (text.length + 2 * BAND) * progress;

  const glyphs = [...text].map((ch, i) => {
    const t = Math.max(0, 1 - Math.abs(i - head) / BAND);
    const [r, g, b] = BASE.map((base, c) => lerp(base, PEAK[c], t));
    return `${truecolor(r, g, b)}${ch}`;
  });

  return glyphs.join("") + RESET;
}
