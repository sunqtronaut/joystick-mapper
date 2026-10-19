# Implementation Plan: Port JaffaQuake Pod-Style Controls into Joystick Mapper

## 1. Overview & Objective

This document outlines the implementation plan to port the Podracer Style control mode from JaffaQuake's `Star-Wars-Galactic-Racer-HOSAS-HOTAS-Binder` into `Alphonsvds/joystick-mapper`.

The goal is full mathematical parity with the original control calculations, seamless integration into Joystick Mapper's JavaScript/Node.js architecture, non-destructive coexistence with existing profiles, and complete support on Linux via `uinput`.

---

## 2. Linux Environment & Dependencies

To set up the development environment on Arch / CachyOS Linux:

### System Packages via `paru`
```bash
paru -S --needed go base-devel libusb systemd-libs evtest linuxconsole
```

**Why each package is needed:**
- `go`: To run JaffaQuake's test suite (`axis_tuning_math_test.go`, `two_stage_curve_test.go`, etc.) on Linux to extract and verify exact test vectors.
- `base-devel`: Compiler tools (`make`, `gcc`, `g++`, `pkg-config`) needed by `node-gyp` to compile native Node.js addons (`node-hid`).
- `libusb` & `systemd-libs`: USB and `libudev` libraries required by `node-hid` / `hidapi` on Linux.
- `evtest` & `linuxconsole`: CLI utilities (`evtest`, `jstest`) for validating Linux `uinput` virtual Xbox 360 controller events.

### Project Dependencies via `npm`
```bash
npm install
```
This installs the required dependencies (`node-hid`, `koffi`, `electron`, `electron-builder`, `electron-updater`) so that `npm test` and the full app run cleanly.

---

## 3. Detailed Mathematical Specification

The port replicates JaffaQuake's axis calculations and response pipeline faithfully.

### 3.1 Input Normalization & Deadzone
- **Axis range**: Dual inputs (Left Engine $l$, Right Engine $r$) normalized to $[-1.0, 1.0]$.
  - $0\%$ deflection = $-1.0$ (idle / full reverse)
  - $50\%$ deflection = $0.0$ (neutral)
  - $100\%$ deflection = $+1.0$ (full forward thrust)
- **Deadzone removal**: Applied independently to each stick near center:
  $$\text{mag} = \frac{|v| - dz}{1 - dz} \quad \text{if } |v| > dz \text{ else } 0$$
  $$\text{tuned} = \text{sign}(v) \cdot \text{mag}$$
- **Constraint**: As specified by JaffaQuake, individual physical sticks in Podracer mode only apply deadzone—individual stick curves are disallowed so turns are not skewed.

### 3.2 Drive (Thrust) Calculation
Given normalized, deadzoned inputs $l$ (left) and $r$ (right):

1. **Standard Mode (`preserve = false`)**:
   $$\text{Drive} = \text{clamp}\left(\frac{l + r}{2}, -1, 1\right)$$

2. **Hybrid Preserve-Thrust Mode (`preserve = true`, default)**:
   - **Both forward** ($l \ge 0 \land r \ge 0$):
     $$\text{Drive} = \max(l, r)$$
     *(Differential steering in a forward turn does not drop thrust)*
   - **Both backward** ($l \le 0 \land r \le 0$):
     $$\text{Drive} = \text{clamp}\left(\frac{l + r}{2}, -1, 0\right)$$
     *(Retains linear averaging for braking/reverse)*
   - **Left forward, right backward** ($l > 0 \land r < 0$):
     $$\text{Drive} = \text{clamp}\left(l \cdot (1 - |r|), 0, 1\right)$$
     *(Pulling one stick backward progressively scrubs forward thrust)*
   - **Right forward, left backward** ($r > 0 \land l < 0$):
     $$\text{Drive} = \text{clamp}\left(r \cdot (1 - |l|), 0, 1\right)$$
   - **Otherwise**: $\text{Drive} = 0$

### 3.3 Steering Calculation
- **Base Steering**:
  $$\text{Steer} = \text{clamp}(l - r, -1, 1)$$
- **Auxiliary Fine Steering (Pedals or Twist)**:
  $$\text{Steer} = \text{clamp}\left(\text{Steer} + p \cdot \frac{\text{strength}}{100}, -1, 1\right)$$

### 3.4 Output Curves & Tuning
Once Drive and Steering are mixed, their overall outputs pass through their respective tuning profiles (`profileHOSASThrust`, `profileHOSASSteer`):
1. **Full Output Scaling** ($50\% - 100\%$):
   $$\text{mag} = \min\left(1.0, \frac{|v|}{\text{fullOutput} / 100}\right)$$
2. **Single-Stage Weighted Power Arc**:
   $$\text{weightedArc}(x, p, w) = (1 - w) \cdot x^p + w \cdot \left(1 - (1 - x)^{1/p}\right)$$
   *(Where $p$ is curve strength $[0.2, 3.0]$ and $w$ is weight $[0.0, 1.0]$, default $0.5$)*
3. **Two-Stage Monotone Cubic Hermite Arc**:
   - Monotone cubic spline connecting two weighted arcs at midpoint $(mx, my)$ with slope limiting and $C^1$ continuity.

### 3.5 Output Mapping to Virtual Xbox 360 Controller
- **Drive $\to$ Triggers**:
  - If $\text{Drive} \ge 0$: $\text{RT} = \text{round}(\text{clamp}(\text{Drive}, 0, 1) \times 255)$, $\text{LT} = 0$
  - If $\text{Drive} < 0$: $\text{LT} = \text{round}(\text{clamp}(-\text{Drive}, 0, 1) \times 255)$, $\text{RT} = 0$
  - Manual LT/RT button bindings override trigger values to 255.
- **Steer $\to$ Left Stick X**:
  - $\text{ThumbLX} = \text{round}(v \times 32768)$ if $v < 0$ else $\text{round}(v \times 32767)$
- **Pitch $\to$ Left Stick Y**:
  - $\text{ThumbLY} = \text{round}(\text{pitch} \times 32768)$ if $\text{pitch} < 0$ else $\text{round}(\text{pitch} \times 32767)$
  - Digital Pitch Up / Pitch Down buttons override analog $Y$ to $+32767$ / $-32767$ (or $0$ if both held).

---

## 4. Architecture & Module Design

### 4.1 New Module: `src/shared/podracer-math.js`
A pure JavaScript implementation of JaffaQuake's math engine:
- `calculateDrive(left, right, preserve)`
- `calculateSteer(left, right, pedal, strength)`
- `weightedArc(x, power, weight)`
- `curveHermite(x, x0, y0, x1, y1, d0, d1)`
- `twoStageArc(x, profile)`
- `tunedCentered(value, profile)`
- `tunedOneWay(value, profile)`
- `floatToStick(value)`
- `driveToTriggers(drive)`

### 4.2 Extensions to `src/shared/controls.js`
- Define Pod-Style target bindings:
  - `pod_left_engine` / `pod_right_engine` (or target identifiers representing dual-engine thrust)
  - `pod_fine_steer` (rudder pedals / twist integration)
  - `pitch_up` / `pitch_down` digital overrides
- Define Pod-Style configuration schema:
  - `preserveThrust` (boolean, default `true`)
  - `thrustCurve` & `steerCurve` tuning settings

### 4.3 Extensions to `src/shared/mapper.js`
- Update `mapInput` to detect Pod-Style mode or bindings.
- When Pod-Style bindings are active:
  - Extract left and right engine values.
  - Apply independent stick deadzone.
  - Calculate combined `drive` and `steer` via `podracer-math.js`.
  - Route output to Xbox 360 controller triggers (`rt`/`lt`) and thumbstick (`lx`).
  - Maintain full backwards compatibility for standard gamepad/flightstick mappings.

### 4.4 Preset & Profile Integration (`src/shared/presets.js`)
- Add a new built-in preset: **"Star Wars Galactic Racer (Pod-Style)"**.
- Defaults:
  - Stick / Dual Stick mapping: Left Engine on Left Stick Y (or Throttle), Right Engine on Right Stick Y (or main Stick Y).
  - Hybrid Preserve Thrust enabled by default.
  - Default deadzone matching JaffaQuake (6%).

### 4.5 UI Integration (`src/renderer/`)
- Expose a toggle for **Hybrid Preserve Thrust** (on/off).
- Provide deadzone and curve parameter controls for Thrust and Steering where practical.

---

## 5. Testing & Verification Strategy

### 5.1 Automated Unit Tests (`test/podracer-math.test.js`)
Using Node.js test runner (`node:test`):
- **Parity with Go test vectors**:
  - `calculateDrive` test cases:
    - Neutral: $(0, 0) \to 0$
    - Full forward: $(1, 1) \to 1$
    - Full reverse: $(-1, -1) \to -0.5$ (non-preserve) or $-1.0$ (preserve)
    - Full turn: $(1, 0) \to 1.0$ (preserve) vs $0.5$ (non-preserve)
    - Scrubbing cases: $(1.0, -0.25) \to 0.75$, $(1.0, -0.5) \to 0.5$, $(1.0, -1.0) \to 0.0$
    - Reverse turns: $(-0.5, 0) \to -0.25$
  - `weightedArc` & `twoStageArc` test cases:
    - Monotonicity checks over $[0, 1]$
    - Boundary conditions: $f(0) = 0$, $f(1) = 1$
    - Midpoint $C^1$ continuity checks matching `two_stage_curve_test.go`.
  - `floatToStick` & trigger clamping:
    - Triggers: integer $0 - 255$ range
    - Stick: $-32768$ to $32767$

### 5.2 Regression Testing
- Run existing test suite (`npm test`).
- Ensure all 129 existing unit tests continue to pass with 0 regressions.

### 5.3 Linux Virtual Controller Testing
- Test output generation through `uinput` (`test/linux.test.js`).
- Verify Xbox 360 controller event generation using `evtest`.

---

## 6. Licensing, Attribution & Documentation

- Maintain all existing GPL-3.0 header notices.
- Add copyright notice and attribution to JaffaQuake and Mars in `src/shared/podracer-math.js` and relevant files.
- Update `README.md` and user documentation with setup, controls, and Linux usage instructions.
