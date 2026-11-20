# GP-ACH-001 · implementation and review status

**Review candidate, not a calibrated isometric tissue model.** Target: longitudinal contraction of *Cavia porcellus* ileum exposed to acetylcholine. Preparation, muscle axis, recording modality and protocol belong to the observation, not just to the drug. An intact segment measured along its length is not a peeled muscle strip. MPLM retains the myenteric plexus.

In Laboratory, start a named experiment and select **Evidence replay** to compare published scalar findings. Select **Simulation** for mass balance. Choose the preparation and initial volume before the first action, enter stock units and either addition volume or desired final concentration. The preview is not administered until **Add ACh**. Each subsequent addition includes the previous drug and volume. **Wash** exchanges the whole bath; it does not certify recovery. Start/pause/resume control the recorder, not hydrolysis. Stop closes the run; reset requires confirmation. Annotate and save to the usual local notebook.

| Layer | Output delivered | Deliberately withheld |
|---|---|---|
| Evidence | Three isotonic EC50 estimates, two isometric maximum-response summaries, one prolonged-contact timing summary | Reconstructed source figures or pooled universal constants |
| Administration | Stock/target conversions, nominal molarity, event history and concentration plot | Experimentally measured tissue concentration |
| Biology | Context-bound Hill kernel; independent exposure-history/kinetics interface | Time-resolved force, spontaneous activity and biological recovery coefficients |
| Recorder | Biological force → independent instrument transform; unavailable signal stays absent | Synthetic or noisy placeholder trace |
| Analysis | Published intervals, endpoint comparison, guarded fitting and trace/holdout analysis functions | Claims of model accuracy from arithmetic tests |
| Archive | GP-ACH-001/1 + gp-ach-params/1, embedded profile, dated commands, settings, results, notes and analysis identifier in existing JSON/IndexedDB/SQLite envelope | Automatic scientific upgrade of old notebooks |

The SVG specimen is illustrative. A changing clock or fluid graphic is not a contraction. No other agonist or antagonist is implemented. Review the [register](GP_ACH_EVIDENCE_REGISTER.md), [calibration](GP_ACH_CALIBRATION.md) and [open issues](GP_ACH_LIMITATIONS.md) before approving further development.
