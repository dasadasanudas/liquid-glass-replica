export const fullscreenVertexShader = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const backgroundFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform vec4 uPanelRect; // x, y, w, h in screen pixels
uniform float uRadius;
uniform sampler2D uBackdrop;

uniform float uInnerRefractionAmount;
uniform float uInnerRefractionHeight;
uniform float uOuterRefractionAmount;
uniform float uOuterRefractionHeight;
uniform float uRefractionOpacity;
uniform float uBlurRadius;
uniform float uBleedAmount;
uniform float uBleedHeight;
uniform float uBleedEdge;
uniform float uBleedOpacity;
uniform float uShadowAmount;
uniform float uShadowHeight;
uniform float uShadowOpacity;
uniform float uShadowBlur;
uniform vec2 uShadowOffset;
uniform float uFaceWhite;
uniform float uFaceBlack;
uniform float uFaceSaturation;
uniform float uFaceFillAlpha;
uniform float uSdrTone;
uniform float uClampMax;
uniform float uTheme;

float sdfRoundedRect(vec2 p, vec2 halfSize, float r) {
  // Mode-4 continuous-corner style approximation (inferred from decomp behavior).
  vec2 q = abs(p) - (halfSize - vec2(r));
  vec2 maxQ = max(q, 0.0);
  return length(maxQ) + min(max(q.x, q.y), 0.0) - r;
}

float sampleLodRule(float radiusPx) {
  // Recovered mip rule: max(0, log2(r < 2 ? r / 2 + 1 : r))
  float v = radiusPx < 2.0 ? (radiusPx * 0.5 + 1.0) : radiusPx;
  return max(0.0, log2(v));
}

vec3 sampleBackdrop(vec2 uv, float lod) {
  return textureLod(uBackdrop, clamp(uv, 0.0, 1.0), lod).rgb;
}

vec3 blurBackdrop(vec2 uv, float radiusPx) {
  float lod = sampleLodRule(radiusPx);
  vec2 texel = 1.0 / uResolution;
  vec2 stepVec = texel * max(1.0, radiusPx);
  vec3 c = sampleBackdrop(uv, lod) * 0.4;
  c += sampleBackdrop(uv + vec2(stepVec.x, 0.0), lod) * 0.15;
  c += sampleBackdrop(uv - vec2(stepVec.x, 0.0), lod) * 0.15;
  c += sampleBackdrop(uv + vec2(0.0, stepVec.y), lod) * 0.15;
  c += sampleBackdrop(uv - vec2(0.0, stepVec.y), lod) * 0.15;
  return c;
}

vec3 saturation(vec3 color, float sat) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), color, sat);
}

void main() {
  vec2 fragPx = vUv * uResolution;
  vec2 panelCenter = uPanelRect.xy + uPanelRect.zw * 0.5;
  vec2 local = fragPx - panelCenter;
  vec2 halfSize = uPanelRect.zw * 0.5;

  float sdf = sdfRoundedRect(local, halfSize, uRadius);
  float inside = 1.0 - smoothstep(-1.0, 1.0, sdf);

  vec2 normal = normalize(vec2(dFdx(sdf), dFdy(sdf)) + vec2(1e-5));
  float outerBand = smoothstep(uOuterRefractionHeight, -1.0, sdf);
  float innerBand = 1.0 - smoothstep(-uInnerRefractionHeight - 20.0, 0.0, sdf);

  float disp = outerBand * uOuterRefractionAmount + innerBand * uInnerRefractionAmount;
  vec2 refractUv = vUv + normal * disp / uResolution;

  vec3 base = sampleBackdrop(vUv, 0.0);
  vec3 refracted = blurBackdrop(refractUv, uBlurRadius);
  vec3 glass = mix(base, refracted, inside * uRefractionOpacity);

  vec3 face = glass;
  face *= mix(uFaceWhite, uFaceBlack, uTheme);
  face = saturation(face, uFaceSaturation);
  face = mix(face, vec3(1.0), inside * uFaceFillAlpha * (1.0 - uTheme * 0.55));

  float bleedMask = smoothstep(uBleedHeight, -uBleedEdge, sdf);
  vec3 bleed = sampleBackdrop(vUv + normal * (uBleedAmount / uResolution), sampleLodRule(uBlurRadius * 1.5));
  face = mix(face, bleed, bleedMask * uBleedOpacity * inside);

  vec2 shadowLocal = local - uShadowOffset;
  float shadowSdf = sdfRoundedRect(shadowLocal, halfSize + vec2(uShadowAmount), uRadius + uShadowBlur * 0.5);
  float shadow = smoothstep(uShadowHeight + uShadowBlur, -uShadowBlur, shadowSdf) * uShadowOpacity;

  vec3 outRgb = mix(base, face, inside);
  outRgb *= uSdrTone;
  outRgb = min(outRgb, vec3(uClampMax));
  outRgb = mix(outRgb, outRgb * (1.0 - shadow), 0.75);

  outColor = vec4(outRgb, 1.0);
}`;

export const foregroundFragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform vec2 uResolution;
uniform vec4 uPanelRect;
uniform float uRadius;
uniform sampler2D uForeground;
uniform mat2 uDirectionMatrix;
uniform vec2 uDomeHeights;
uniform float uDispersion;

float sdfRoundedRect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - (halfSize - vec2(r));
  vec2 maxQ = max(q, 0.0);
  return length(maxQ) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 fragPx = vUv * uResolution;
  vec2 panelCenter = uPanelRect.xy + uPanelRect.zw * 0.5;
  vec2 local = fragPx - panelCenter;
  vec2 halfSize = uPanelRect.zw * 0.5;
  float sdf = sdfRoundedRect(local, halfSize, uRadius);
  float inside = 1.0 - smoothstep(-1.0, 1.0, sdf);

  vec2 p = local / max(halfSize, vec2(1.0));
  vec2 dome = vec2(1.0 - dot(p, p), 1.0 - dot(abs(p), vec2(0.7)));
  vec2 bend = uDirectionMatrix * vec2(dome.x * uDomeHeights.x, dome.y * uDomeHeights.y) * 0.04;

  vec2 baseUv = (local / uPanelRect.zw) + 0.5 + bend;
  vec2 dispersionStep = vec2(uDispersion) / uResolution;

  float w[7];
  w[0]=0.12; w[1]=0.13; w[2]=0.14; w[3]=0.22; w[4]=0.14; w[5]=0.13; w[6]=0.12;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float fi = float(i - 3);
    vec2 uv = clamp(baseUv + dispersionStep * fi, 0.0, 1.0);
    vec3 s = texture(uForeground, uv).rgb;
    acc.r += s.r * w[i];
    acc.g += s.g * w[i];
    acc.b += s.b * w[i];
  }

  float rim = smoothstep(3.0, -3.0, abs(sdf)) * 0.28;
  vec3 highlight = vec3(1.0) * rim;

  outColor = vec4((acc * 0.35 + highlight) * inside, inside * 0.6);
}`;
