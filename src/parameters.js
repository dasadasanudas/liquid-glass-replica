const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function computeGlassParameters({ width, height, theme, style, reduceTransparency, increaseContrast }) {
  const m = Math.min(width, height);

  // Measured from WindowServer capture: these values are treated as canonical defaults.
  const measuredBase = {
    innerRefractionAmount: Math.max(-60, -0.8 * m),
    innerRefractionHeight: 0,
    outerRefractionAmount: Math.min(60, 0.2 * m),
    outerRefractionHeight: Math.min(37.5, 0.125 * m),
    refractionOpacity: 0.3,
    shadowHeight: 0.4 * m,
    shadowAmount: Math.min(75, 0.625 * m),
    shadowOpacity: 0.25,
    shadowBlur: 40,
    shadowRadius: 24,
    shadowOffsetX: 0,
    shadowOffsetY: 8,
    bleedAmount: 0.35 * m,
    bleedHeight: 0.35 * m,
    bleedEdge: 140,
    bleedOpacity: 0.5,
    faceWhite: 1.03,
    faceBlack: 0.5,
    faceSaturation: 1,
    faceFillAlpha: 0.4,
    sdrTone: 1.06961,
    clampMax: 1.06961
  };

  // Inferred CPU-side approximation from handoff fit.
  const inferredBlur = clamp(5.333 + (m - 48) / 42, 5.333, 8);

  let blurRadius = inferredBlur;
  let opacity = measuredBase.refractionOpacity;
  let faceFillAlpha = measuredBase.faceFillAlpha;

  if (style === 'clear') {
    blurRadius *= 0.75;
    opacity *= 0.8;
    faceFillAlpha *= 0.75;
  } else if (style === 'subdued') {
    blurRadius *= 1.25;
    opacity *= 0.65;
    faceFillAlpha *= 1.2;
  }

  if (reduceTransparency) {
    blurRadius = 0.25;
    opacity = 0.08;
  }

  if (increaseContrast) {
    measuredBase.shadowOpacity = 0.34;
    measuredBase.faceWhite = theme === 'dark' ? 1.08 : 1.04;
    measuredBase.faceBlack = theme === 'dark' ? 0.45 : 0.48;
  }

  return {
    ...measuredBase,
    blurRadius,
    refractionOpacity: opacity,
    faceFillAlpha,
    radius: clamp(m * 0.12, 16, 36),
    theme
  };
}
