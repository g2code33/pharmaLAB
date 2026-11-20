# Evidence register · revision 1

The machine-readable records are in `src/simulation/ach/evidence.ts`. `id` identifies a revision, not a preparation in general. All rows concern ACh in guinea pig ileum. Context includes solution composition in mM, gas, load and application. Null means unknown or not fixed, never zero. n is reported as preparations/experiments, not silently interpreted as animals. Original units are retained. No ischemic bars, digitised points, user assumptions or simulator outputs are designated measured controls.

| Record | Recording and preparation | Published result | Uncertainty / n | Extraction and use |
|---|---|---|---|---|
| A-intact-v1 | isotonic intact segment | EC50 1.6 × 10⁻⁸ M | 95% CI 4.0 × 10⁻⁹–6.3 × 10⁻⁸; 6 | Suzuki Results, Fig 3; published regression estimate |
| A-deprived-v1 | isotonic mucosa-deprived segment | EC50 3.6 × 10⁻⁸ M | 95% CI 1.0 × 10⁻⁸–1.6 × 10⁻⁷; 5 | same protocol, separate estimate |
| A-strip-v1 | isotonic longitudinal strip | EC50 4.0 × 10⁻⁸ M | 95% CI 8.0 × 10⁻⁹–1.6 × 10⁻⁷; 4 | same protocol, lower resting load |
| B-intact-v1 | isometric intact segment | highest-dose response 4.5 g | SEM 0.2 g | Rodriguez chemical stimulation Results; text example |
| B-mplm-v1 | isometric MPLM | highest-dose response 2.6 g | SEM 0.2 g | same paragraph, not an isolated muscle-only preparation |
| C-intact-tonic-v1 | isometric intact segment | secondary tonic increase begins at 2.5 min | SEM 0.3 min; 16 | Aboulafia Results after Fig 1; **not** latency to initial contraction |

B: Figures 2–3 give 6–9 preparations per bar, not exact n for the quoted text examples. Ilea from animals never subjected to ischemia are distinct from paired nonischemic segments. Group assignment of the quoted text maxima is insufficiently explicit to promote either as a normal calibration constant. The paper's relative percentage wording is inconsistent with 2.6/4.5; preserve both absolute numbers without deriving another datum from the prose.

A uses *estimated from experimental data* for author-fitted EC50, not *directly measured*. B/C summarise measured endpoints. pEC50 and its transformed limits are *calculated from published measurements*. Digitised, educational and simulator-derived quantities are distinct classifications. No digitisation precision, SEM or animal counts have been imputed.
