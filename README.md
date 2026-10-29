# Liquid Glass: From macOS Shaders to WebGL

An experimental reconstruction of macOS Liquid Glass for the web.

Instead of starting with `backdrop-filter: blur()`, this project investigates how macOS actually renders glass: extracting compiled GPU code, examining Core Animation filter inputs, and reconstructing the rendering pipeline in WebGL.

**Status:** Research prototype. This is not yet a pixel-perfect replica, and some of Apple's CPU-side parameter mapping remains unknown.

---

## The challenge

Liquid Glass is more than a blurred transparent rectangle.

A glass surface can depend on:

- The shape and curvature of its boundary.
- How the background is displaced near that boundary.
- Blur that changes across the surface.
- Color transformation and vibrancy.
- Edge bleed and shadow.
- Directional highlights.
- Separate treatment of the background and foreground content.
- Window focus, appearance, accessibility settings, and other system state.

The goal is to understand those pieces from macOS itself, then reproduce as much as possible in a browser.

---

## What I found

### 1. The glass shader lives inside a much larger GPU library

The QuartzCore `default.metallib` extracted from macOS 26.6.2 was approximately **160 MB uncompressed**.

Its inspection report identified **19 architecture slices**:

- One AIR intermediate-code slice.
- Eighteen Apple GPU-specific slices.

This library contains many GPU programs, not just Liquid Glass. The symbols include blur, color processing, displacement, glass, and other rendering operations.

Among the glass-related functions were:

```text
glass_background_lpf
glass_background_no_bleed_lpf
glass_background_sdf_lpf
glass_background_sdf_no_bleed_lpf
glass_foreground_lpf
glass_foreground_sdf_lpf
```

There are also corresponding `lph` variants.

The important distinction: I investigated selected glass functions from the **AIR slice**. I did not fully decode every GPU-specific slice or every function in the library.

### 2. Background and foreground glass are separate

The extracted QuartzCore code includes both:

- **Background glass:** processes the scene behind the surface, including refraction, blur, color, edge bleed, and shadow.
- **Foreground glass:** a separate shader family that processes the glass's own foreground content.

The demo focuses primarily on the background path. Foreground refraction has been investigated, but is not fully implemented and validated.

### 3. Shape matters: the shader uses an SDF

An SDF, or *signed distance field*, describes how far a point is from a shape's boundary. The sign distinguishes the inside from the outside.

For glass, the shape isn't just a clipping mask:

- Distance from the boundary helps control where effects appear.
- The edge direction helps determine which way the backdrop is displaced.
- The same shape information supports anti-aliasing and shadow calculations.

The investigated shader contains a continuous-corner shape calculation and multiple SDF modes, including a four-corner path.

### 4. Blur isn't simply “apply a Gaussian”

The extracted background shader samples a mipmapped backdrop. A mipmap is a stack of progressively smaller versions of an image.

The AIR instructions include this sequence:

```text
%217 = fcmp fast olt float %212, 2.000000e+00
%218 = fmul fast float %212, 5.000000e-01
%219 = fadd fast float %218, 1.000000e+00
%220 = select i1 %217, float %219, float %212
%221 = tail call fast float @air.fast_log2.f32(float %220)
%222 = tail call fast float @air.fast_fmax.f32(float 0.000000e+00, float %221)
```

One equivalent way to express that calculation in GLSL is:

```glsl
float mip_from_radius(float radius) {
    float x = radius < 2.0
        ? radius * 0.5 + 1.0
        : radius;

    return max(0.0, log2(x));
}
```

This calculates the texture level used for a backdrop sample. Larger levels generally sample a more downscaled, blurrier image.

The demo includes two paths:

1. **AIR-style mip sampling:** follows the recovered level-of-detail formula.
2. **Gaussian fit:** an earlier approximation fitted against macOS VM screenshots.

The second currently matches the tested VM interiors better. Following the recovered formula alone doesn't guarantee a match because the texture pipeline and input mapping also matter.

### 5. Refraction uses the shape's edge direction

The background shader takes the SDF gradient and transforms it with a displacement matrix. That displacement helps select a different location in the backdrop texture.

A simplified version of the relevant idea:

```glsl
vec2 displacement = vec2(
    dot(gradient, displacementMatrix.xy),
    dot(gradient, displacementMatrix.zw)
);

vec2 samplePosition = backdropUV + displacement * amount;
```

The result is that the backdrop can appear shifted near the glass, rather than merely blurred.

The shader contains **inner and outer refraction paths**, with different amounts and heights, and mixes their results. The precise conversion from macOS filter settings to all shader uniforms is still being investigated.

### 6. The bright rim is a separate effect

The extracted Core Image kernel `_glassHighlight` uses:

- Distance from the edge.
- A highlight height and inset.
- The edge gradient.
- A light direction.
- Spread, curvature, and bias.
- An anti-aliased mask.

In simplified terms, it builds a band near the edge, then weights it according to how that edge faces the light.

The demo implements the kernel's general structure, but its mapping from macOS effect settings to kernel inputs is still experimental.

---

## From Apple AIR to a browser shader

The process was:

```text
macOS QuartzCore metallib
        ↓
Extract the relevant AIR bitcode
        ↓
Disassemble to AIR/LLVM IR
        ↓
Trace instructions and data flow
        ↓
Reconstruct selected calculations in GLSL
        ↓
Supply parameters and textures from JavaScript
        ↓
Render in WebGL2
```

This was **not** an automatic Metal-to-WebGL conversion.

AIR/LLVM IR is low-level compiled code, not Apple's original human-written Metal source. Translating it requires interpreting instructions, vector operations, branches, texture sampling, precision, and how data is passed between functions.

The first translation had mistakes. Comparing it against the AIR exposed errors in corner calculations, gradient handling, refraction offsets, and compositing. Those findings informed the current demo.

---

## Inspecting live macOS values

A live macOS probe created a focused `NSGlassEffectView` and inspected its configured `glassBackground` filter.

For one **300 × 200 pt, light, regular glass** configuration on macOS 26.6.2, the recorded inputs included:

```text
Inner refraction amount:   -60
Inner refraction height:     0
Outer refraction amount:    40
Outer refraction height:    25
Refraction opacity:        0.3

Blur radius:                 8

Bleed amount:               70
Bleed height:               70
Bleed blur radius:         140
Bleed opacity:             0.5

Shadow amount:              75
Shadow height:              80
Shadow opacity:           0.25
Shadow offset:           (0, 8)
```

A separate sweep sampled multiple sizes, styles, and appearances.

**Important:** These are configured filter inputs. They are not automatically proof of the final GPU uniform values. The CPU-side conversion and composition around the shader are still partly unknown.

---

## Demo features

The WebGL2 lab currently supports:

- Draggable and resizable glass shapes.
- Regular and clear styles.
- Light and dark appearance.
- A Reduce Transparency mode.
- Shape presets for buttons, circles, panels, toolbars, and docks.
- AIR-style mip sampling and Gaussian-fit sampling.
- Experimental highlight and adjustable refraction settings.
- Custom backdrop images.
- Split comparison against saved macOS VM captures.
- A debug panel for filter inputs and inferred uniforms.

Open `index.html` in a WebGL2-capable browser after extracting the project.

---

## Validation

The demo was opened and tested in headless Chromium with SwiftShader. The checks covered:

- Shader compilation and application boot.
- Selected SDF gradient regression vectors.
- Dragging, adding and removing shapes.
- Light/dark and regular/clear switches.
- Reduce Transparency behavior.
- Sampling and highlight toggles.
- Image upload with animation paused.
- Zero-radius shapes and a narrow viewport.

The current visual references came from a GitHub-hosted macOS environment, not a physical Mac GPU. In three tested active-glass, 300 × 100 pt text-pattern captures, the Gaussian fit had lower central-region error than the current mip reconstruction.

Those comparisons are useful for development, but they **do not establish real-Mac pixel accuracy**.

---

## What's still unknown

- The complete CPU-side conversion from filter inputs to GPU uniforms.
- Exact color, vibrancy, and layer-composition behavior.
- Full foreground-content refraction.
- Whether other macOS frameworks or components use additional glass-specific rendering paths.
- Visual equivalence on a physical Mac GPU.

The project has recovered and reconstructed **important pieces**, not every piece of Apple's glass implementation.

---

## Why build this?

Because recreating a visual effect is one thing.

Understanding the rendering system underneath it, down to shape fields, texture sampling, refraction, and compiled GPU instructions, is much more interesting.
