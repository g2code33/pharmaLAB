export function nonnegative(x: number, label: string) {
  if (!Number.isFinite(x) || x < 0) throw new RangeError(`Invalid ${label}`);
  return x;
}
export function positive(x: number, label: string) {
  if (nonnegative(x, label) === 0)
    throw new RangeError(`${label} must be positive`);
  return x;
}
const factors = { M: 1, mM: 1e-3, µM: 1e-6, uM: 1e-6, nM: 1e-9 };
export function molar(value: number, unit: keyof typeof factors) {
  const c = nonnegative(
    nonnegative(value, "concentration") * factors[unit],
    "concentration or unit",
  );
  if (value > 0 && c === 0)
    throw Error("Concentration below numerical resolution");
  return c;
}
export const pEC50 = (m: number) => -Math.log10(positive(m, "EC50"));
export const ec50FromP = (p: number) => positive(10 ** -p, "EC50");
export function potencyInterval(low: number, high: number) {
  if (low > high) throw Error("Inverted interval");
  return [pEC50(high), pEC50(low)] as const;
}
export type BathState = { nominalM: number; volumeMl: number };
export function mix(
  bath: BathState,
  stockM: number,
  additionMl: number,
): BathState {
  const total = positive(
    positive(bath.volumeMl, "bath volume") +
      positive(additionMl, "addition volume"),
    "final volume",
  );
  if (total === bath.volumeMl || total === additionMl)
    throw new RangeError("Volume ratio exceeds numerical resolution");
  const nominalM =
    nonnegative(bath.nominalM, "initial concentration") *
      (bath.volumeMl / total) +
    nonnegative(stockM, "stock concentration") * (additionMl / total);
  if (nominalM === 0 && (stockM > 0 || bath.nominalM > 0))
    throw new RangeError("Dilution below numerical resolution");
  return {
    nominalM: nonnegative(nominalM, "final concentration"),
    volumeMl: total,
  };
}
export function volumeForTarget(
  bath: BathState,
  stockM: number,
  targetM: number,
) {
  nonnegative(bath.nominalM, "initial concentration");
  nonnegative(stockM, "stock concentration");
  nonnegative(targetM, "target concentration");
  return positive(
    positive(bath.volumeMl, "bath volume") *
      ((targetM - bath.nominalM) / (stockM - targetM)),
    "required addition (target must lie strictly between bath and stock)",
  );
}
/** Stable in the tails: exp is only evaluated with a nonpositive argument. */
export function hill(
  a: number,
  ec: number,
  n: number,
  emax: number,
  e0: number,
) {
  nonnegative(a, "tissue concentration");
  positive(ec, "EC50");
  positive(n, "slope");
  positive(emax, "Emax");
  nonnegative(e0, "baseline");
  if (a === 0) return e0;
  const z = n * (Math.log(a) - Math.log(ec)),
    q = Math.exp(-Math.abs(z));
  return nonnegative(
    e0 + emax * (z >= 0 ? 1 / (1 + q) : q / (1 + q)),
    "response",
  );
}
