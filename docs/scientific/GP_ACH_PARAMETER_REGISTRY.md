# gp-ach-params/1

Lookup requires **preparation × recording**. `profile.ts` creates a fresh profile for each run. No fallback to another preparation, agonist, or recording modality. Each slot carries units, value, uncertainty, source ID, experimental context and calibration/validation states. A reference value is inspectable, not approved for numerical simulation.

| Preparation | Isotonic EC50 / pEC50¹ | Isometric maximum (reference only) | Isometric EC50 / Hill slope |
|---|---|---|---|
| Intact | A-intact-v1 / 7.80 | B-intact-v1 | pending / pending |
| Mucosa-deprived | A-deprived-v1 / 7.44 | pending | pending / pending |
| Longitudinal strip | A-strip-v1 / 7.40 | pending | pending / pending |
| MPLM | pending | B-mplm-v1 | pending / pending |

¹ Rounded here; full precision and transformed confidence bounds in the registry. No isotonic amplitude converted to force. Applied load is not the fitted biological baseline. Baseline tension, onset, first peak time, phasic force, fade, tonic force, recovery and repeated-exposure effects remain pending in each profile. C's secondary-onset observation belongs to its prolonged Tyrode experiment, not to B's short exposure. No Hill slope, desensitisation rate or time constant is imported from mechanistic studies.
