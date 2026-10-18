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

