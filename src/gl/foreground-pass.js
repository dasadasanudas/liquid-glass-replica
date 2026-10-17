import { foregroundFragmentShader, fullscreenVertexShader } from './shaders.js';
import { createProgram, createFullscreenQuad } from './webgl-utils.js';

export class ForegroundPass {
  constructor(gl) {
    this.gl = gl;
    this.program = createProgram(gl, fullscreenVertexShader, foregroundFragmentShader);
    this.quad = createFullscreenQuad(gl);

    gl.bindVertexArray(this.quad.vao);
    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad.buffer);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uniformNames = [
      'uResolution', 'uPanelRect', 'uRadius', 'uForeground', 'uDirectionMatrix', 'uDomeHeights', 'uDispersion'
    ];
    this.uniforms = Object.fromEntries(
      uniformNames.map((name) => [name, gl.getUniformLocation(this.program, name)])
    );
  }

  render({ resolution, panelRect, foregroundTexture, params }) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.quad.vao);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, foregroundTexture);

    gl.uniform2f(this.uniforms.uResolution, resolution[0], resolution[1]);
    gl.uniform4f(this.uniforms.uPanelRect, panelRect.x, panelRect.y, panelRect.w, panelRect.h);
    gl.uniform1f(this.uniforms.uRadius, params.radius);
    gl.uniform1i(this.uniforms.uForeground, 1);

    gl.uniformMatrix2fv(this.uniforms.uDirectionMatrix, false, [1, 0, 0, 1]);
    gl.uniform2f(this.uniforms.uDomeHeights, 0.72, 0.45);
    gl.uniform1f(this.uniforms.uDispersion, 5.0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
  }
}
