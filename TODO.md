# Task: Port JaffaQuake Pod-Style controls into Joystick Mapper

Modify `Alphonsvds/joystick-mapper` to implement the Podracer Style control mode from `JaffaQuake/Star-Wars-Galactic-Racer-HOSAS-HOTAS-Binder`.

## Requirements

1. Read both codebases before implementing anything. Identify the original Pod-Style axis calculations, axis mixing, hybrid thrust behavior, button mappings, deadzones, curves, normalization and output clamping.

2. Port the original control logic faithfully into Joystick Mapper's existing JavaScript architecture. Do not translate the Windows UI or controller backend. Reuse Joystick Mapper's existing device input, profile system, calibration and Linux `uinput` output.

3. Add a selectable Galactic Racer Pod-Style mode or profile. Do not change existing profiles or ordinary joystick-to-Xbox mappings.

4. Preserve the original behavior mathematically wherever possible. Document any differences caused by the target game's Xbox-controller interface or the source application's Windows-specific implementation.

5. Make configurable parameters editable through the existing UI where practical, with sensible defaults matching the original tool.

6. Add unit tests for the ported math. Include center, minimum, maximum, deadzone boundaries, mixed inputs, thrust combinations and clamping. Use test vectors derived from the original implementation, not invented expected results.

7. Test regression behavior for existing profiles and verify that the virtual Xbox controller continues working on Linux.

8. Preserve GPL-3.0 notices and attribution, and update the documentation with setup and mapping instructions.

## Deliverables

- Implemented source changes, not just a design proposal.
- Automated tests and their results.
- A description of the original-to-new mapping for every axis and relevant button.
- Build and test instructions for Linux.

Do not claim parity until the original calculations have been compared against the port and the tests pass. If any original behavior is ambiguous, identify it before guessing.


### Checkpoint Summary & Clean-up Report
  
  #### 1. Repository Clean-Up State
  
  • Reference Repository: Star-Wars-Galactic-Racer-HOSAS-HOTAS-Binder/ was added to .gitignore so local reference sources don't pollute the repository.
  • Working Tree: Completely clean (git status reports nothing to commit).
  • Test Suite: Verified via npm test (node --test "test/*.test.js"): 158 tests passing, 0 failures.
  ──────
  #### 2. Checkpoint Commit
  
  • Branch: 1
  • Commit ID: 142192f
  • Message: Implement Star Wars Galactic Racer Podracer Style control mode
  ──────
  #### 3. Summary of Work Delivered
  
   Component                        │ Files                           │ Description
  ──────────────────────────────────┼─────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Math Engine                      │ podracer-math.js                │ Dual-engine drive calculation (calculateDrive with hybrid preserve-thrust and progressive scrubbing), differential & auxiliary steering (calculateSteer), weighted arcs, and two-stage monotonic Hermite curves.
   Automated Tests                  │ podracer-math.test.js           │ 13 comprehensive unit & integration tests derived directly from JaffaQuake Go test vectors (axis_tuning_math_test.go, two_stage_curve_test.go).
   Control Targets                  │ controls.js                     │ Defined pod_left_engine, pod_right_engine, pod_fine_steer, pitch_up, and pitch_down, with menu groupings.
   Mapping Engine                   │ mapper.js                       │ Integrated dual-engine extraction, deadzone normalization, drive/steer mixing, and digital pitch override mechanics into mapInput.
   Preset & References              │ presets.jsgames.js              │ Added built-in Star Wars Galactic Racer (Pod-Style) preset and reference controls layout sheet.
   UI Integration                   │ icons.js                        │ Added icon definitions and tile labels for new Pod-Style targets in the mapping picker.
   Documentation                    │ README.md                       │ Documented Pod-Style features and preserved GPL-3.0 attribution for JaffaQuake and Mars.
  ──────
  #### 4. Optional Next Enhancements (When Ready)
  
  Whenever you wish to continue:
  
  1. Single-Stick HOTAS Brake Zones: JaffaQuake's single-throttle mode where the bottom 10–20% of travel acts as proportional brake (LT) and the rest scales forward thrust (RT).
  2. Driving Wheel Mode: Combining dedicated throttle + brake pedal axes into virtual triggers via Jaffa's drivingPedals logic.
  3. Advanced Two-Stage Curve Sliders: Exposing the Hermite midpoint (mx, my) and dual-stage curve/weight sliders in the UI popover for granular S-curve tuning.