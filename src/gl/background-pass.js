import { backgroundFragmentShader, fullscreenVertexShader } from './shaders.js';
import { createProgram, createFullscreenQuad } from './webgl-utils.js';

export class BackgroundPass {
  constructor(gl) {
    this.gl = gl;
    this.program = createProgram(gl, fullscreenVertexShader, backgroundFragmentShader);
    this.quad = createFullscreenQuad(gl);

    gl.bindVertexArray(this.quad.vao);
    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad.buffer);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uniformNames = [
      'uResolution', 'uPanelRect', 'uRadius', 'uBackdrop',
      'uInnerRefractionAmount', 'uInnerRefractionHeight', 'uOuterRefractionAmount', 'uOuterRefractionHeight',
      'uRefractionOpacity', 'uBlurRadius', 'uBleedAmount', 'uBleedHeight', 'uBleedEdge', 'uBleedOpacity',
      'uShadowAmount', 'uShadowHeight', 'uShadowOpacity', 'uShadowBlur', 'uShadowOffset',
      'uFaceWhite', 'uFaceBlack', 'uFaceSaturation', 'uFaceFillAlpha', 'uSdrTone', 'uClampMax', 'uTheme'
    ];

    this.uniforms = Object.fromEntries(
      uniformNames.map((name) => [name, gl.getUniformLocation(this.program, name)])
    );
  }

  render({ resolution, panelRect, backdropTexture, params }) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.quad.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, backdropTexture);

    gl.uniform2f(this.uniforms.uResolution, resolution[0], resolution[1]);
    gl.uniform4f(this.uniforms.uPanelRect, panelRect.x, panelRect.y, panelRect.w, panelRect.h);
    gl.uniform1f(this.uniforms.uRadius, params.radius);
    gl.uniform1i(this.uniforms.uBackdrop, 0);

    gl.uniform1f(this.uniforms.uInnerRefractionAmount, params.innerRefractionAmount);
    gl.uniform1f(this.uniforms.uInnerRefractionHeight, params.innerRefractionHeight);
    gl.uniform1f(this.uniforms.uOuterRefractionAmount, params.outerRefractionAmount);
    gl.uniform1f(this.uniforms.uOuterRefractionHeight, params.outerRefractionHeight);
    gl.uniform1f(this.uniforms.uRefractionOpacity, params.refractionOpacity);
    gl.uniform1f(this.uniforms.uBlurRadius, params.blurRadius);

    gl.uniform1f(this.uniforms.uBleedAmount, params.bleedAmount);
    gl.uniform1f(this.uniforms.uBleedHeight, params.bleedHeight);
    gl.uniform1f(this.uniforms.uBleedEdge, params.bleedEdge);
    gl.uniform1f(this.uniforms.uBleedOpacity, params.bleedOpacity);

    gl.uniform1f(this.uniforms.uShadowAmount, params.shadowAmount);
    gl.uniform1f(this.uniforms.uShadowHeight, params.shadowHeight);
    gl.uniform1f(this.uniforms.uShadowOpacity, params.shadowOpacity);
    gl.uniform1f(this.uniforms.uShadowBlur, params.shadowBlur);
    gl.uniform2f(this.uniforms.uShadowOffset, params.shadowOffsetX, params.shadowOffsetY);

    gl.uniform1f(this.uniforms.uFaceWhite, params.faceWhite);
    gl.uniform1f(this.uniforms.uFaceBlack, params.faceBlack);
    gl.uniform1f(this.uniforms.uFaceSaturation, params.faceSaturation);
    gl.uniform1f(this.uniforms.uFaceFillAlpha, params.faceFillAlpha);
    gl.uniform1f(this.uniforms.uSdrTone, params.sdrTone);
    gl.uniform1f(this.uniforms.uClampMax, params.clampMax);
    gl.uniform1f(this.uniforms.uTheme, params.theme === 'dark' ? 1 : 0);

    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
