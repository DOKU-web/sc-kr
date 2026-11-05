"use strict";
// 크게 보기의 바디캠 효과입니다. 새 영상 프레임이 올 때만 그리므로 멈춘 영상은 GPU를 쓰지 않습니다.
(function () {
  const VERTEX = `
    attribute vec2 p;
    varying vec2 v;
    void main() {
      v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
      gl_Position = vec4(p, 0.0, 1.0);
    }`;

  const FRAGMENT = `
    precision mediump float;
    varying vec2 v;
    uniform sampler2D tex;
    uniform float k;
    uniform float seed;
    void main() {
      vec2 c = v * 2.0 - 1.0;
      float r2 = dot(c, c);
      vec2 q = c * (1.0 + k * 0.16 * r2) / (1.0 + k * 0.32);
      vec3 color = texture2D(tex, q * 0.5 + 0.5).rgb;
      float vignette = 1.0 - k * 0.6 * smoothstep(0.45, 1.9, r2);
      float scan = 1.0 - k * 0.08 * step(1.0, mod(gl_FragCoord.y, 3.0));
      float noise = fract(sin(dot(gl_FragCoord.xy + seed, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      gl_FragColor = vec4(color * vignette * scan + noise * 0.07 * k, 1.0);
    }`;

  function shader(gl, type, source) {
    const unit = gl.createShader(type);
    gl.shaderSource(unit, source);
    gl.compileShader(unit);
    return gl.getShaderParameter(unit, gl.COMPILE_STATUS) ? unit : null;
  }

  // 지원하지 않는 PC이면 null을 돌려줍니다. 그때는 CSS 효과만 씁니다.
  function create(canvas, video) {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return null;
    const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const strength = gl.getUniformLocation(program, "k");
    const seed = gl.getUniformLocation(program, "seed");
    let level = 0.6;
    let callback = 0;
    let running = false;
    let frames = 0;

    function draw() {
      if (!running) return;
      callback = video.requestVideoFrameCallback(draw);
      if (!video.videoWidth) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform1f(strength, level);
      gl.uniform1f(seed, (frames++ % 64) * 7.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return {
      start() {
        if (running) return;
        running = true;
        callback = video.requestVideoFrameCallback(draw);
      },
      stop() {
        running = false;
        video.cancelVideoFrameCallback(callback);
      },
      level(value) { level = value; },
      get frames() { return frames; },
    };
  }

  // 그리드 효과에 쓰는 노이즈 무늬입니다. 한 번만 만들고 움직이지 않습니다.
  function noiseImage() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 96;
    const context = canvas.getContext("2d");
    const image = context.createImageData(96, 96);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.random() * 255;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 40;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL("image/png");
  }

  window.SckrFx = { create, noiseImage };
})();
