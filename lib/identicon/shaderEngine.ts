/**
 * WebGL Fragment Shader Engine tailored specifically for Whether:
 *  - 'reportSeal': Holographic integrity seal for weekly brief snapshots & export artifacts
 *  - 'signalVolatility': Dynamic plasma noise mapped to macro signal velocity & regime shifts
 *  - 'dataProvenance': Cryptographic matrix sweep for ingestion & KV snapshot verification
 */

import type { IdenticonParams } from "./hashEngine";

export type ShaderMode = "reportSeal" | "signalVolatility" | "dataProvenance";

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_HEADER = `
precision mediump float;
varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color1; // RGB normalized 0..1
uniform vec3 u_color2; // RGB normalized 0..1
uniform vec3 u_color3; // RGB normalized 0..1
uniform vec4 u_seed_params; // [noiseFreq, distortion, speed, random]
uniform float u_hover; // 0..1 hover intensity
uniform float u_state_value; // 0..1 signal volatility / health metric

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xx33;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ) );
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

const SHADER_MODE_SOURCES: Record<ShaderMode, string> = {
  reportSeal: `
    ${FRAGMENT_SHADER_HEADER}
    void main() {
      vec2 st = v_uv - 0.5;
      float dist = length(st);
      
      float t = u_time * (u_seed_params.z * 0.8 + u_hover * 1.5);
      
      // Angled holographic shimmer band for report verification
      float angle = 0.785398; // 45 degrees
      mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      vec2 rotSt = rot * st;
      
      float shimmerPos = mod(t * 0.5, 2.2) - 1.1;
      float band = smoothstep(0.0, 0.18, 0.18 - abs(rotSt.x - shimmerPos));
      
      vec3 baseCol = mix(u_color1, u_color2, rotSt.y + 0.5);
      vec3 holoCol = mix(u_color2, u_color3, sin(rotSt.x * 14.0 + t) * 0.5 + 0.5);
      
      vec3 finalCol = mix(baseCol, holoCol + vec3(0.35), band * 0.75);
      
      float mask = smoothstep(0.49, 0.45, dist);
      gl_FragColor = vec4(finalCol, mask * 0.95);
    }
  `,

  signalVolatility: `
    ${FRAGMENT_SHADER_HEADER}
    void main() {
      vec2 st = v_uv - 0.5;
      float dist = length(st);
      
      // Speed scales dynamically with signal volatility (u_state_value)
      float speed = u_seed_params.z * (0.5 + u_state_value * 3.0);
      float t = u_time * speed;
      
      float n = snoise(st * (4.0 + u_state_value * 6.0) + vec2(t * 0.5));
      float warp = snoise(st * 8.0 - vec2(t * 0.3));
      
      vec3 baseCol = mix(u_color1, u_color2, dist * 2.0);
      if (u_state_value > 0.7) {
        // High volatility / Tighten warning state (amber/cyan shift)
        baseCol = mix(baseCol, vec3(1.0, 0.4, 0.2), sin(t * 2.0) * 0.5 + 0.5);
      }
      
      float pulseEffect = (n * 0.5 + 0.5) + warp * 0.2;
      vec3 finalCol = baseCol + u_color3 * pulseEffect * (0.8 + u_hover * 0.8);
      
      float mask = smoothstep(0.49, 0.42, dist);
      gl_FragColor = vec4(finalCol, mask * 0.92);
    }
  `,

  dataProvenance: `
    ${FRAGMENT_SHADER_HEADER}
    void main() {
      vec2 st = v_uv - 0.5;
      float dist = length(st);
      
      // Quantized matrix grid for data snapshot verification
      float cells = 5.0 + floor(u_seed_params.x * 4.0);
      vec2 grid = floor(v_uv * cells) / cells;
      
      float t = u_time * (u_seed_params.z * 1.0);
      float n = snoise(grid * 6.0 + vec2(0.0, t * 0.8));
      
      float scanline = sin((v_uv.y + t * 0.2) * 30.0) * 0.5 + 0.5;
      
      vec3 col = mix(u_color1, u_color2, n * 0.5 + 0.5);
      col += u_color3 * scanline * 0.25;
      
      float mask = step(dist, 0.48);
      gl_FragColor = vec4(col, mask * 0.9);
    }
  `,
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

export class IdenticonShaderInstance {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private animFrameId: number | null = null;
  private startTime: number = performance.now();
  private isDestroyed = false;

  private mode: ShaderMode = "reportSeal";
  private params: IdenticonParams;
  private hoverValue = 0;
  private targetHover = 0;
  private stateValue = 0.5;

  constructor(canvas: HTMLCanvasElement, params: IdenticonParams, mode: ShaderMode = "reportSeal") {
    this.canvas = canvas;
    this.params = params;
    this.mode = mode;
    this.initGL();
  }

  public setMode(mode: ShaderMode) {
    if (this.mode !== mode) {
      this.mode = mode;
      this.initGL();
    }
  }

  public updateParams(params: IdenticonParams) {
    this.params = params;
  }

  public setHover(hover: boolean) {
    this.targetHover = hover ? 1.0 : 0.0;
  }

  public setStateValue(val: number) {
    this.stateValue = Math.max(0, Math.min(1, val));
  }

  private initGL() {
    try {
      this.gl =
        this.canvas.getContext("webgl", { alpha: true, antialias: true, preserveDrawingBuffer: false }) ||
        (this.canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

      if (!this.gl) return;

      const gl = this.gl;
      const vertShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
      const fragShader = this.compileShader(gl, gl.FRAGMENT_SHADER, SHADER_MODE_SOURCES[this.mode]);

      if (!vertShader || !fragShader) return;

      const program = gl.createProgram();
      if (!program) return;

      gl.attachShader(program, vertShader);
      gl.attachShader(program, fragShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Shader program link error:", gl.getProgramInfoLog(program));
        return;
      }

      this.program = program;

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const aPosition = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      this.startLoop();
    } catch (e) {
      console.warn("WebGL initialization failed, falling back to SVG only.", e);
    }
  }

  private compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private startLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const render = () => {
      if (this.isDestroyed || !this.gl || !this.program) return;

      const gl = this.gl;
      const p = this.params;

      this.hoverValue += (this.targetHover - this.hoverValue) * 0.1;

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      const elapsedSec = (performance.now() - this.startTime) / 1000;

      const uTime = gl.getUniformLocation(this.program, "u_time");
      const uResolution = gl.getUniformLocation(this.program, "u_resolution");
      const uColor1 = gl.getUniformLocation(this.program, "u_color1");
      const uColor2 = gl.getUniformLocation(this.program, "u_color2");
      const uColor3 = gl.getUniformLocation(this.program, "u_color3");
      const uSeedParams = gl.getUniformLocation(this.program, "u_seed_params");
      const uHover = gl.getUniformLocation(this.program, "u_hover");
      const uStateVal = gl.getUniformLocation(this.program, "u_state_value");

      gl.uniform1f(uTime, elapsedSec);
      gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);

      const rgb1 = hslToRgb(p.hue1, p.saturation, p.lightness);
      const rgb2 = hslToRgb(p.hue2, p.saturation, p.lightness);
      const rgb3 = hslToRgb(p.hue3, p.saturation, p.lightness);

      gl.uniform3fv(uColor1, rgb1);
      gl.uniform3fv(uColor2, rgb2);
      gl.uniform3fv(uColor3, rgb3);

      gl.uniform4f(
        uSeedParams,
        p.noiseFrequency,
        p.distortionAmount,
        p.shaderSpeed,
        p.shaderUniforms[3]
      );
      gl.uniform1f(uHover, this.hoverValue);
      gl.uniform1f(uStateVal, this.stateValue);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}
