# Validation is independent of fitting

| Role | Current status |
|---|---|
| Calibration | No approved isometric ACh curve/trace |
| Independent validation | No held-out data; no performance claims |
| Mechanistic support | C, D, F and Brownlee/Harry; not fitting or validation observations |
| Educational assumptions | Ideal mixing, stable bath, complete medium exchange, ideal instrument; not measurements |

`compareIndependent` rejects identical dataset IDs, intersecting observation IDs, inappropriate roles and mismatched contexts. For matched pairs it computes prediction minus observation and RMSE; it cannot grant validation. Split by animal/preparation before fitting, verify lineage manually (different filenames are not independent), and predefine acceptance tolerances in appropriate units. Never pool normal and ischemic groups.

Evaluate EC50 (or log error), Emax and Hill slope separately and plot dose-wise residuals. For timed traces compare peak and latency from dosing, peak-minus-tonic force, window mean tonic tension and first return to baseline tolerance after wash (not proof of sustained recovery). `traceMetrics` needs ordered time samples and explicit analysis windows; it cannot infer wash, onset or a plateau from a blank trace. Compare repeated exposures, replicate variation and test–retest performance. Evaluate sensitivity by stratifying by temperature, bath, gas, layer, load and protocol, not by treating other conditions as interchangeable holdouts.

Reproduce numerical checks with `npm test`, then `npm run check && npm run build && npm run verify:web`. Production browser tests exercise the local notebook and offline reload. Passing them validates calculations and storage behaviour, **not** biological accuracy.
