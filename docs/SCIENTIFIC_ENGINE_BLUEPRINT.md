# Scientific engine blueprint

`ScientificEngine.snapshot()` is deliberately signal-free. A mounted tissue is an illustration state, not a viability assertion. Start/pause/resume/stop record operator intent; they do not sample tension.

Future computations should resolve a version-pinned RunManifest, verify licensed parameter revisions, apply environment and receptor dynamics, dispatch to the appropriate tissue family, then sample the measurement system. Reject missing inputs rather than substituting guessed constants. Keep calibration datasets separate from independent validation datasets. UI difficulty and renderer selection must not enter a biological calculation. No engine module is calibrated or validated today.
