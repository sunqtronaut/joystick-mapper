// Star Wars Galactic Racer Podracer Style Control Math
// Faithfully ported from JaffaQuake/Star-Wars-Galactic-Racer-HOSAS-HOTAS-Binder
// Originally authored by JaffaQuake / Mars
// Licensed under GPL-3.0-only

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function defaultAxisTune(dz = 6) {
  return {
    deadzone: dz,
    curve: 1,
    fullOutput: 100,
    weighting: 50,
    twoStage: false,
    stage1Curve: 1,
    stage2Curve: 1,
    stage1Weight: 50,
    stage2Weight: 50,
    midpoint: 50,
    customMidpoint: false,
    midpointX: 50,
    midpointY: 50,
  };
}

export function checkedAxisTune(p = {}) {
  const out = { ...p };
  if (out.deadzone === undefined || out.deadzone < 0 || out.deadzone > 40) {
    out.deadzone = 6;
  }
  if (out.curve === undefined || Number.isNaN(out.curve) || !Number.isFinite(out.curve) || out.curve < 0.2 || out.curve > 3) {
    out.curve = 1;
  }
  if (out.fullOutput === undefined || out.fullOutput < 50 || out.fullOutput > 100) {
    out.fullOutput = 100;
  }
  if (out.weighting === undefined || out.weighting === null) {
    out.weighting = out.curve === 1 ? 50 : 0;
  } else {
    out.weighting = clamp(out.weighting, 0, 100);
  }
  if (
    out.stage1Curve === undefined ||
    out.stage1Curve < 0.2 ||
    out.stage1Curve > 3 ||
    Number.isNaN(out.stage1Curve) ||
    !Number.isFinite(out.stage1Curve)
  ) {
    out.stage1Curve = 1;
  }
  if (
    out.stage2Curve === undefined ||
    out.stage2Curve < 0.2 ||
    out.stage2Curve > 3 ||
    Number.isNaN(out.stage2Curve) ||
    !Number.isFinite(out.stage2Curve)
  ) {
    out.stage2Curve = 1;
  }
  if (out.stage1Weight === undefined || out.stage1Weight === null) {
    out.stage1Weight = 50;
  } else {
    out.stage1Weight = clamp(out.stage1Weight, 0, 100);
  }
  if (out.stage2Weight === undefined || out.stage2Weight === null) {
    out.stage2Weight = 50;
  } else {
    out.stage2Weight = clamp(out.stage2Weight, 0, 100);
  }
  if (out.midpoint === undefined || out.midpoint < 10 || out.midpoint > 90) {
    out.midpoint = 50;
  }
  if (out.midpointX === undefined || out.midpointX < 10 || out.midpointX > 90) {
    out.midpointX = 50;
  }
  if (out.midpointY === undefined || out.midpointY < 10 || out.midpointY > 90) {
    out.midpointY = 50;
  }
  return out;
}

export function axisWeight(v) {
  if (v === null || v === undefined) return 0;
  return clamp(v, 0, 100) / 100;
}

export function weightedArc(x, power, weight = 0.5) {
  x = clamp(x, 0, 1);
  if (x === 0 || x === 1 || power === 1) return x;
  weight = clamp(weight, 0, 1);
  return (1 - weight) * Math.pow(x, power) + weight * (1 - Math.pow(1 - x, 1 / power));
}

export function weightedArcDerivative(x, power, weight = 0.5) {
  weight = clamp(weight, 0, 1);
  return (1 - weight) * power * Math.pow(x, power - 1) + (weight / power) * Math.pow(1 - x, 1 / power - 1);
}

export function curveHermite(x, x0, y0, x1, y1, d0, d1) {
  const u = (x - x0) / (x1 - x0);
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * (x1 - x0) * d0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * (x1 - x0) * d1;
}

export function twoStageArc(x, p) {
  let mx = p.midpoint;
  let my = p.midpoint;
  if (p.customMidpoint) {
    mx = p.midpointX;
    my = p.midpointY;
  }
  x *= 100;
  const left = (t) => my * weightedArc(t / mx, p.stage1Curve, axisWeight(p.stage1Weight));
  const right = (t) => my + (100 - my) * weightedArc((t - mx) / (100 - mx), p.stage2Curve, axisWeight(p.stage2Weight));
  const h = Math.min(9, Math.min(mx * 0.3, (100 - mx) * 0.3));
  const a = mx - h;
  const b = mx + h;
  if (x <= a) return left(x) / 100;
  if (x >= b) return right(x) / 100;

  const ya = left(a);
  const yb = right(b);
  const sl = (my - ya) / h;
  const sr = (yb - my) / h;
  const dm = (2 * sl * sr) / (sl + sr);
  let dl = (my / mx) * weightedArcDerivative(a / mx, p.stage1Curve, axisWeight(p.stage1Weight));
  let dr = ((100 - my) / (100 - mx)) * weightedArcDerivative((b - mx) / (100 - mx), p.stage2Curve, axisWeight(p.stage2Weight));

  dl = Math.max(0, Math.min(dl, 3 * sl - dm));
  dr = Math.max(0, Math.min(dr, 3 * sr - dm));

  if (x < mx) {
    return curveHermite(x, a, ya, mx, my, dl, dm) / 100;
  }
  return curveHermite(x, mx, my, b, yb, dm, dr) / 100;
}

export function tunedValueAfterDeadzone(v, p) {
  p = checkedAxisTune(p);
  const mag = Math.min(1, Math.abs(v) / (p.fullOutput / 100));
  let result = weightedArc(mag, p.curve, axisWeight(p.weighting));
  if (p.twoStage) {
    result = twoStageArc(mag, p);
  }
  const clampedResult = clamp(result, 0, 1);
  return (v < 0 ? -1 : 1) * clampedResult;
}

export function tunedOneWay(v, p) {
  p = checkedAxisTune(p);
  v = clamp(v, 0, 1);
  const dz = p.deadzone / 100;
  if (v <= dz) return 0;
  v = (v - dz) / (1 - dz);
  return tunedValueAfterDeadzone(v, p);
}

export function tunedCentered(v, p) {
  p = checkedAxisTune(p);
  const dz = p.deadzone / 100;
  const mag = Math.min(1, Math.abs(v));
  if (mag <= dz) return 0;
  const tunedMag = (mag - dz) / (1 - dz);
  return tunedValueAfterDeadzone((v < 0 ? -1 : 1) * tunedMag, p);
}

export function calculateDrive(left, right, preserve = true) {
  if (!preserve) {
    return clamp((left + right) / 2.0, -1, 1);
  }
  // Hybrid preserve-thrust mode:
  // 1) Both forward: strongest forward stick sets thrust, so differential steering costs no thrust.
  // 2) One forward + one backward: the backward stick progressively scrubs that forward thrust.
  // 3) Both backward: retain the original averaging behavior, so both at -1 remains full brake/reverse.
  if (left >= 0 && right >= 0) {
    return Math.max(left, right);
  }
  if (left <= 0 && right <= 0) {
    return clamp((left + right) / 2.0, -1, 0);
  }
  if (left > 0 && right < 0) {
    return clamp(left * (1 - Math.abs(right)), 0, 1);
  }
  if (right > 0 && left < 0) {
    return clamp(right * (1 - Math.abs(left)), 0, 1);
  }
  return 0;
}

export function calculateSteer(left, right, pedal = 0, strength = 100) {
  let steer = clamp(left - right, -1, 1);
  if (pedal !== 0) {
    steer = clamp(steer + pedal * (strength / 100), -1, 1);
  }
  return steer;
}

export function floatToStick(v) {
  v = clamp(v, -1, 1);
  if (v < 0) {
    return Math.round(v * 32768);
  }
  return Math.round(v * 32767);
}

export function driveToTriggers(drive) {
  if (drive >= 0) {
    return {
      rt: Math.round(clamp(drive, 0, 1) * 255),
      lt: 0,
    };
  }
  return {
    rt: 0,
    lt: Math.round(clamp(-drive, 0, 1) * 255),
  };
}
