import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  defaultAxisTune,
  checkedAxisTune,
  weightedArc,
  weightedArcDerivative,
  curveHermite,
  twoStageArc,
  tunedValueAfterDeadzone,
  tunedOneWay,
  tunedCentered,
  calculateDrive,
  calculateSteer,
  floatToStick,
  driveToTriggers,
} from '../src/shared/podracer-math.js';
import { mapInput } from '../src/shared/mapper.js';
import { normalizeBindings } from '../src/shared/controls.js';

function near(got, want, tolerance = 1e-8) {
  assert.ok(
    Math.abs(got - want) <= tolerance,
    `got ${got} want ${want} (diff: ${Math.abs(got - want)})`
  );
}

test('tuning defaults preserve linear response across both axes', () => {
  const p = defaultAxisTune(0);
  for (const x of [-1, -0.7, -0.25, 0, 0.25, 0.7, 1]) {
    near(tunedCentered(x, p), x);
  }
  for (const x of [0, 0.25, 0.7, 1]) {
    near(tunedOneWay(x, p), x);
  }
});

test('saturation and curve response match original Go test vectors', () => {
  const p = { deadzone: 0, curve: 2, fullOutput: 80 };
  near(tunedCentered(0.4, p), 0.25);
  near(tunedCentered(0.8, p), 1);
  near(tunedCentered(1.0, p), 1);
  near(tunedCentered(-0.8, p), -1);
  near(tunedOneWay(0.8, p), 1);

  p.curve = 0.5;
  near(tunedOneWay(0.2, p), 0.5);
});

test('deadzone preserves maximum reach without clipping travel', () => {
  const p = { deadzone: 10, curve: 1, fullOutput: 100 };
  near(tunedCentered(0.05, p), 0);
  near(tunedCentered(0.55, p), 0.5);
  near(tunedCentered(-1.0, p), -1);
  near(tunedOneWay(0.1, p), 0);
  near(tunedOneWay(1.0, p), 1);
});

test('curve validation handles invalid and out-of-range parameters', () => {
  const p = checkedAxisTune({ deadzone: -1, curve: NaN, fullOutput: 0 });
  assert.equal(p.deadzone, 6);
  assert.equal(p.curve, 1);
  assert.equal(p.fullOutput, 100);
});

test('smooth weighted arc endpoints and monotonicity', () => {
  for (const p of [0.2, 0.35, 0.5, 0.85, 1, 1.25, 2, 3]) {
    for (let w = 0; w <= 100; w += 10) {
      const weight = w / 100;
      near(weightedArc(0, p, weight), 0);
      near(weightedArc(1, p, weight), 1);
      let last = -1.0;
      for (let i = 0; i <= 200; i++) {
        const x = i / 200;
        const y = weightedArc(x, p, weight);
        assert.ok(
          y >= last - 1e-10 && y >= -1e-10 && y <= 1 + 1e-10,
          `non-monotonic weightedArc: p=${p} w=${w} x=${x} y=${y} previous=${last}`
        );
        last = y;
      }
      if (p === 1) {
        near(weightedArc(0.3, p, weight), 0.3);
      }
    }
  }
});

test('two-stage curve midpoints and global full output', () => {
  const p = defaultAxisTune(0);
  p.twoStage = true;
  p.stage1Curve = 0.2;
  p.stage2Curve = 3;
  p.stage1Weight = 25;
  p.stage2Weight = 80;
  p.midpoint = 60;
  p.fullOutput = 80;

  near(tunedOneWay(0.8 * 0.6, p), 0.6);
  near(tunedOneWay(0.8, p), 1);
  near(tunedOneWay(1, p), 1);

  p.customMidpoint = true;
  p.midpointX = 35;
  p.midpointY = 65;
  near(tunedOneWay(0.8 * 0.35, p), 0.65);
});

test('two-stage arc monotonicity and continuity across midpoints', () => {
  const p = defaultAxisTune(0);
  p.twoStage = true;
  p.customMidpoint = true;
  p.midpointX = 40;
  p.midpointY = 60;
  p.stage1Curve = 0.8;
  p.stage2Curve = 1.8;
  p.stage1Weight = 30;
  p.stage2Weight = 70;

  let last = -1.0;
  for (let j = 0; j <= 200; j++) {
    const x = j / 200;
    const y = twoStageArc(x, p);
    assert.ok(
      !Number.isNaN(y) && Number.isFinite(y) && y >= last - 1e-8 && y <= 1 + 1e-8,
      `non-monotonic twoStageArc x=${x} y=${y} last=${last}`
    );
    last = y;
  }

  const at = p.midpointX / 100;
  near(twoStageArc(at, p), p.midpointY / 100);

  const h = 0.000001;
  const dLeft = (twoStageArc(at, p) - twoStageArc(at - h, p)) / h;
  const dRight = (twoStageArc(at + h, p) - twoStageArc(at, p)) / h;
  assert.ok(
    Math.abs(dLeft - dRight) <= 0.035,
    `sharp corner at midpoint: left slope ${dLeft} vs right slope ${dRight}`
  );
});

test('calculateDrive in standard mode (preserve = false) linearly averages inputs', () => {
  near(calculateDrive(0, 0, false), 0);
  near(calculateDrive(1, 1, false), 1);
  near(calculateDrive(-1, -1, false), -1);
  near(calculateDrive(1, 0, false), 0.5);
  near(calculateDrive(0, 1, false), 0.5);
  near(calculateDrive(0.5, -0.5, false), 0);
  near(calculateDrive(-0.8, -0.4, false), -0.6);
});

test('calculateDrive in hybrid preserve-thrust mode preserves forward turning power', () => {
  // Neutral
  near(calculateDrive(0, 0, true), 0);
  // Full forward
  near(calculateDrive(1, 1, true), 1);
  // Full backward
  near(calculateDrive(-1, -1, true), -1);

  // Both forward: strongest stick sets thrust
  near(calculateDrive(1, 0, true), 1);
  near(calculateDrive(0, 1, true), 1);
  near(calculateDrive(0.8, 0.4, true), 0.8);
  near(calculateDrive(0.3, 0.9, true), 0.9);

  // Both backward: retain averaging
  near(calculateDrive(-0.5, 0, true), -0.25);
  near(calculateDrive(0, -0.5, true), -0.25);
  near(calculateDrive(-1, 0, true), -0.5);
  near(calculateDrive(-0.4, -0.8, true), -0.6);

  // Forward + Backward: backward stick progressively scrubs forward thrust
  near(calculateDrive(1.0, -0.25, true), 0.75);
  near(calculateDrive(1.0, -0.5, true), 0.5);
  near(calculateDrive(1.0, -1.0, true), 0);
  near(calculateDrive(0.8, -0.5, true), 0.4);

  near(calculateDrive(-0.25, 1.0, true), 0.75);
  near(calculateDrive(-0.5, 1.0, true), 0.5);
  near(calculateDrive(-1.0, 1.0, true), 0);
  near(calculateDrive(-0.5, 0.8, true), 0.4);
});

test('calculateSteer combines differential engine thrust and fine auxiliary steering', () => {
  // Pure differential steering: left - right
  near(calculateSteer(0, 0), 0);
  near(calculateSteer(1, -1), 1);
  near(calculateSteer(-1, 1), -1);
  near(calculateSteer(0.5, 0), 0.5);
  near(calculateSteer(0, 0.5), -0.5);
  near(calculateSteer(1, 1), 0);
  near(calculateSteer(-1, -1), 0);

  // Auxiliary steering from rudder pedals or twist
  near(calculateSteer(0, 0, 0.5, 100), 0.5);
  near(calculateSteer(0, 0, -0.5, 100), -0.5);
  near(calculateSteer(0.2, 0, 0.4, 50), 0.4); // 0.2 + 0.4 * 0.5 = 0.4
  near(calculateSteer(0.8, -0.5, 0.5, 100), 1.0); // clamped to 1.0
  near(calculateSteer(-0.8, 0.5, -0.5, 100), -1.0); // clamped to -1.0
});

test('floatToStick scales correctly to signed 16-bit integers', () => {
  assert.equal(floatToStick(0), 0);
  assert.equal(floatToStick(1.0), 32767);
  assert.equal(floatToStick(-1.0), -32768);
  assert.equal(floatToStick(0.5), 16384);
  assert.equal(floatToStick(-0.5), -16384);
  assert.equal(floatToStick(2.0), 32767); // clamped
  assert.equal(floatToStick(-2.0), -32768); // clamped
});

test('driveToTriggers splits drive into Xbox 360 controller triggers', () => {
  assert.deepEqual(driveToTriggers(0), { rt: 0, lt: 0 });
  assert.deepEqual(driveToTriggers(1.0), { rt: 255, lt: 0 });
  assert.deepEqual(driveToTriggers(-1.0), { rt: 0, lt: 255 });
  assert.deepEqual(driveToTriggers(0.5), { rt: 128, lt: 0 });
  assert.deepEqual(driveToTriggers(-0.5), { rt: 0, lt: 128 });
  assert.deepEqual(driveToTriggers(1.5), { rt: 255, lt: 0 });
  assert.deepEqual(driveToTriggers(-1.5), { rt: 0, lt: 255 });
});

test('mapInput integrates Pod-Style dual engine thrust and differential steering', () => {
  const bindings = normalizeBindings({
    y: { target: 'pod_left_engine', deadzone: 0 },
    slider: { target: 'pod_right_engine', deadzone: 0 },
    rz: { target: 'pod_fine_steer', deadzone: 0 },
    btn1: { target: 'pitch_up' },
    btn2: { target: 'pitch_down' },
    btn3: { target: 'lt' },
  });

  // Neutral
  let out = mapInput({ buttons: {}, axes: { y: 0, slider: 0, rz: 0 } }, bindings);
  assert.equal(out.rt, 0);
  assert.equal(out.lt, 0);
  assert.equal(out.lx, 0);

  // Both full forward (preserve thrust mode: drive = max(1, 1) = 1, steer = 1 - 1 = 0)
  out = mapInput({ buttons: {}, axes: { y: 1.0, slider: 1.0 } }, bindings);
  assert.equal(out.rt, 255);
  assert.equal(out.lt, 0);
  assert.equal(out.lx, 0);

  // Differential forward turn (left 1.0, right 0.0 -> drive = max(1, 0) = 1, steer = 1 - 0 = 1)
  out = mapInput({ buttons: {}, axes: { y: 1.0, slider: 0.0 } }, bindings);
  assert.equal(out.rt, 255);
  assert.equal(out.lt, 0);
  assert.equal(out.lx, 32767);

  // Both full reverse (left -1.0, right -1.0 -> drive = -1, steer = 0)
  out = mapInput({ buttons: {}, axes: { y: -1.0, slider: -1.0 } }, bindings);
  assert.equal(out.rt, 0);
  assert.equal(out.lt, 255);
  assert.equal(out.lx, 0);

  // Progressive scrub (left 1.0, right -0.5 -> drive = 1 * (1 - 0.5) = 0.5, steer = 1 - (-0.5) = 1.5 -> clamp 1.0)
  out = mapInput({ buttons: {}, axes: { y: 1.0, slider: -0.5 } }, bindings);
  assert.equal(out.rt, 128);
  assert.equal(out.lt, 0);
  assert.equal(out.lx, 32767);

  // Fine steering auxiliary input (e.g. twist rz = 0.5 with neutral engines -> steer = 0.5)
  out = mapInput({ buttons: {}, axes: { y: 0, slider: 0, rz: 0.5 } }, bindings);
  assert.equal(out.rt, 0);
  assert.equal(out.lt, 0);
  assert.equal(out.lx, Math.round(0.5 * 32767));

  // Digital Pitch Up override
  out = mapInput({ buttons: { btn1: true }, axes: { y: 0, slider: 0 } }, bindings);
  assert.equal(out.ly, 32767);

  // Digital Pitch Down override
  out = mapInput({ buttons: { btn2: true }, axes: { y: 0, slider: 0 } }, bindings);
  assert.equal(out.ly, -32767);

  // Both Pitch buttons cancel each other out
  out = mapInput({ buttons: { btn1: true, btn2: true }, axes: { y: 0, slider: 0 } }, bindings);
  assert.equal(out.ly, 0);

  // Manual LT override
  out = mapInput({ buttons: { btn3: true }, axes: { y: 1.0, slider: 1.0 } }, bindings);
  assert.equal(out.lt, 255);
  assert.equal(out.rt, 255);

  // Standard non-preserve mode option
  out = mapInput(
    { buttons: {}, axes: { y: 1.0, slider: 0.0 } },
    bindings,
    { preserveThrust: false }
  );
  // (1 + 0) / 2 = 0.5 -> rt = 128
  assert.equal(out.rt, 128);
});

