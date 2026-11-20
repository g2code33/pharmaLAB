# Equations and conventions

Concentrations are amount per litre (M = mol/L; 1 M = 1000 mol/m³). The Hill kernel and mass balance both take M; volumes in one addition use the same unit (mL here). Inputs must be finite. Mass concentrations are not molarities; converting mg without a chemical form and molar mass is not supported.

* After one addition: `V′=V+v`, `C′=C(V/V′)+S(v/V′)`. For a desired attainable target T, `v=V(T−C)/(S−T)`; reject nonpositive or unbounded volumes. Repeated additions start at V′, C′. Full exchange restores initial volume with zero bath ACh.
* Stable, immediately mixed bath is an **assumption**. The concentration-at-tissue interface is separate; the default maps nominal to tissue M. Cholinesterase hydrolysis is not claimed absent in real tissue. No rate or half-life is implemented.
* Static response is `E0 + Emax/(1+exp(−z))`, `z=n(ln A−ln EC50)`. The implementation uses a sign-stable exponential; A=0 returns E0 **only with valid parameters**. Emax is an increment, not total resting plus active force. The isometric adapter rejects incompatible profiles and withholds output for missing approvals.
* `pEC50=−log10(EC50/M)`; invert with `10^(−pEC50)` M. CI endpoints reverse under this decreasing transformation.
* A separate `TimeModel.sample(profile, tissueM, exposureHistory, time)` can return force, stage and desensitisation; at this revision they are unknown. Peak/fade/tonic are not successive samples of a Hill function. Future calcium-entry, sensitisation and receptor coupling should feed biological dynamics upstream of the recorder.
* Display signal: `(forceG−zeroG) × gain × sensitivity + drift × elapsedSeconds + noiseAmplitude × recordedNoiseSample`. “g” follows the publications' gram-force convention, not SI mass converted to muscle shortening. Ideal gain/sensitivity are display choices. Null force remains null regardless of gain or noise. No force samples or acquisition timer are synthesised before calibration.
