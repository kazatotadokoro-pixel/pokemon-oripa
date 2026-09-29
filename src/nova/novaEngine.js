/* オリパラック 超新星（SUPERNOVA）開封演出エンジン
 * WebGL2 で HDR シーン → ブルーム → ポスト処理（衝撃波の歪み・ズームブラー・色収差・トーンマップ・粒子感）
 * tier: 0=ハズレ(白) 1=4等(青) 2=3等(赤) 3=2等(金) 4=1等(虹)
 * 使い方: const p = createNovaPlayer(canvas, {tier, cardImage, onDone}); p.start(); ... p.destroy();
 */
const W = 540, H = 960;
let scale = 1;
let seed = 7;
let MT = null;           // GL state for the current player
let AC = null, master = null, scheduled = [];
let soundOn = true;
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function rnd(i){ let t = (i*0x6D2B79F5 + seed*0x9E3779B9)|0; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296; }
const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a, v));
const lerp = (a,b,u) => a + (b-a)*u;
const easeOut = u => 1 - Math.pow(1-u, 3);

// 5段階の色と、結果タイトルに出す文字（サイトの等級に合わせてある）
const BT = [
  {name:'ハズレ', en:'NEXT CHANCE', sub:'またチャレンジしよう', col:'#e9eef7'},
  {name:'4等',    en:'4TH PRIZE',   sub:'4等',               col:'#3ea8ff'},
  {name:'3等',    en:'3RD PRIZE',   sub:'3等 当選',          col:'#ff4d5e'},
  {name:'2等',    en:'2ND PRIZE',   sub:'2等 当選',          col:'#ffd34d'},
  {name:'1等',    en:'GRAND PRIZE', sub:'1等 当選',          col:'#ff7ad9', rainbow:true},
];
export const tierFromRank = rankNum => ({1:4, 2:3, 3:2, 4:1}[rankNum] ?? 0);

const GLSL_FS_VERT = `#version 300 es
in vec2 aP; out vec2 vUv; void main(){ vUv = aP*.5+.5; gl_Position = vec4(aP,0.,1.); }`;

const GLSL_PT_V = `#version 300 es
in vec4 aA; in vec3 aC;
uniform vec2 uCam, uShake; uniform float uZoom, uScale;
out vec4 vC;
void main(){
  vec2 s = (aA.xy - uCam - uShake - vec2(270.,480.))*uZoom + vec2(270.,480.);
  gl_Position = vec4(s.x/540.*2.-1., 1.-s.y/960.*2., 0., 1.);
  gl_PointSize = max(1., aA.z*uScale*uZoom);
  vC = vec4(aC, aA.w);
}`;

const GLSL_PT_F = `#version 300 es
precision highp float; in vec4 vC; out vec4 o;
void main(){ vec2 d = gl_PointCoord-.5; float a = exp(-dot(d,d)*16.); o = vec4(vC.rgb*vC.a*a, 0.); }`;

const GLSL_CARD_V = `#version 300 es
in vec2 aP; out vec2 vUv;
uniform vec2 uSize, uPos; uniform float uRY, uRX, uRZ, uZ;
uniform vec2 uCam, uShake; uniform float uZoom;
void main(){
  vec3 v = vec3(aP*uSize, 0.);
  float cz=cos(uRZ), sz=sin(uRZ); v.xy = vec2(cz*v.x - sz*v.y, sz*v.x + cz*v.y);
  float cy=cos(uRY), sy=sin(uRY); v = vec3(cy*v.x + sy*v.z, v.y, -sy*v.x + cy*v.z);
  float cx=cos(uRX), sx=sin(uRX); v = vec3(v.x, cx*v.y - sx*v.z, sx*v.y + cx*v.z);
  v.z += uZ;
  float f = 1100., wc = (f + v.z)/f;
  vec2 w = uPos + v.xy/wc;
  vec2 scr = (w - uCam - uShake - vec2(270.,480.))*uZoom + vec2(270.,480.);
  gl_Position = vec4((scr.x/540.*2.-1.)*wc, (1.-scr.y/960.*2.)*wc, 0., wc);
  vUv = aP + .5;
}`;

const GLSL_CARD_F = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform float uBack, uMat, uSweep, uAlpha, uEdge; uniform vec3 uGlow; uniform vec2 uSize;
uniform vec4 uUV; uniform float uRad;
void main(){
  vec2 px = vUv*uSize, q = min(px, uSize-px); float rad = uRad > 0. ? uRad : 18.;
  if(q.x<rad && q.y<rad && length(vec2(rad)-q) > rad) discard;
  vec2 l = uBack > .5 ? vec2(1.-vUv.x, vUv.y) : vUv;
  vec4 rr = uUV.z > 0. ? uUV : vec4(0.,0.,1.,1.);
  vec4 tx = texture(uTex, rr.xy + l*rr.zw);
  if(tx.a < .02) discard;
  vec3 tex = pow(tx.rgb, vec3(2.2));
  vec3 c = mix(uGlow*3., tex, uMat);
  float band = exp(-pow((vUv.x*.8 + vUv.y*.6 - uSweep)/.07, 2.));
  c += vec3(1.)*band*1.1*uMat;
  c += uGlow*exp(-min(q.x,q.y)/5.)*uEdge;
  float al = uAlpha*tx.a;
  o = vec4(c*al, al);
}`;

const GLSL_TEXT_F = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform float uAlpha, uWipe, uBoost;
void main(){
  vec4 t = texture(uTex, vUv);
  float m = smoothstep(uWipe, uWipe-.08, abs(vUv.x-.5)*2.);
  float a = t.a*m*uAlpha;
  o = vec4(pow(t.rgb, vec3(2.2))*uBoost*a, a);
}`;

const GLSL_BRIGHT = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc;
void main(){ vec3 c = texture(uSrc, vUv).rgb; float l = max(c.r, max(c.g, c.b)); o = vec4(c*max(0., l-.85)/max(l,1e-4), 1.); }`;

const GLSL_BLUR = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform vec2 uDir;
void main(){
  vec3 c = texture(uSrc, vUv).rgb*.227;
  c += (texture(uSrc, vUv+uDir*1.385).rgb + texture(uSrc, vUv-uDir*1.385).rgb)*.316;
  c += (texture(uSrc, vUv+uDir*3.231).rgb + texture(uSrc, vUv-uDir*3.231).rgb)*.070;
  o = vec4(c, 1.);
}`;

const GLSL_COMP = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uB1, uB2, uB3;
uniform float uT, uCA, uZB, uExp, uGrain;
uniform vec2 uShockC; uniform float uShockR, uShockA;
uniform vec2 uZC; uniform float uPinch;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 uv = vUv;
  vec2 asp = vec2(540./960., 1.);
  { vec2 pd = (uv - uZC)*asp; float pr = length(pd); uv = uZC + (uv - uZC)*(1. + uPinch*(1. - smoothstep(0., .9, pr))); }
  vec2 d = (uv - uShockC)*asp; float r = length(d);
  float k = exp(-pow((r - uShockR)/.035, 2.))*uShockA;
  if(r > 0.) uv -= (d/r)/asp*k*.025;
  vec2 cd = uv - uZC;
  vec3 c = vec3(0.);
  if(uZB > .002){
    for(int i=0;i<8;i++){
      float s = 1. - uZB*float(i)/8.;
      vec2 u2 = uZC + cd*s;
      c.r += texture(uScene, u2 + cd*uCA).r;
      c.g += texture(uScene, u2).g;
      c.b += texture(uScene, u2 - cd*uCA).b;
    }
    c /= 8.;
  } else {
    c = vec3(texture(uScene, uv + cd*uCA).r, texture(uScene, uv).g, texture(uScene, uv - cd*uCA).b);
  }
  c += (texture(uB1, uv).rgb*.5 + texture(uB2, uv).rgb*.75 + texture(uB3, uv).rgb*1.)*.85;
  c = aces(c*uExp);
  c = pow(c, vec3(1./2.2));
  float vig = smoothstep(1.2, .35, length((vUv-.5)*vec2(1.,1.25)));
  c *= mix(.5, 1., vig);
  c += (h(vUv*vec2(1234.,987.) + fract(uT*7.3)) - .5)*uGrain;
  o = vec4(c, 1.);
}`;

const GLSL_NOVA = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uT;
uniform vec2 uShake; uniform float uZoom; uniform float uRoll;
uniform float uWarp, uTravel, uSpeed; uniform vec3 uTunCol; uniform float uTunI;
uniform float uGateR; uniform vec3 uGateCol; uniform float uGateI;
uniform float uStarR; uniform vec3 uStarCol; uniform float uStarI;
uniform float uCore; uniform float uNovaT; uniform vec3 uNovaCol; uniform float uNovaI;
uniform float uBH, uBHR, uRB, uFlash, uStars;
out vec4 o;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
vec3 hue(float h){ return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.); }
vec3 starfield(vec2 p){
  vec3 acc = vec3(0.);
  for(int L=0; L<2; L++){
    float cell = L==0 ? 26. : 11.;
    vec2 q = p + float(L)*vec2(31.,17.);
    vec2 g = floor(q/cell), f = fract(q/cell); float r = h21(g);
    float dens = L==0 ? .88 : .92;
    if(r > dens){
      vec2 d = (vec2(h21(g+3.1),h21(g+7.7)) - f)*cell;
      float tw = .6+.4*sin(uT*(1.+3.*h21(g+1.3)) + r*40.);
      acc += mix(vec3(.75,.82,1.), vec3(1.,.88,.75), h21(g+5.))*(L==0 ? .9 : .45)*tw*pow((r-dens)/(1.-dens),2.)*1.5/(1.+dot(d,d)*1.4);
    }
  }
  return acc;
}
void main(){
  vec2 uv = gl_FragCoord.xy/uRes;
  vec2 s = vec2(uv.x*540., (1.-uv.y)*960.);
  vec2 C = vec2(270., 470.);
  vec2 d = (s - C)/uZoom + uShake;
  float cr = cos(uRoll), sr = sin(uRoll); d = vec2(cr*d.x - sr*d.y, sr*d.x + cr*d.y);
  float r = length(d), a = atan(d.y, d.x);
  vec3 col = vec3(.0008,.001,.003);
  vec2 ds = d;
  if(uBH > 0.){ float rs = uBHR; ds = d*(1. - uBH*rs*rs*1.7/max(r*r, rs*rs*.9)); }
  col += starfield(ds + C)*uStars;
  col += vec3(.01,.02,.05)*pow(fbm(ds*.004 + 3.), 3.)*uStars*2.;
  if(uWarp > 0.){
    for(int L=0; L<3; L++){
      float A = 90. + float(L)*55.;
      float bin = floor((a/6.2831853 + .5)*A);
      float hh = h21(vec2(bin, float(L)*17.3 + 1.));
      float ac = (bin + .2 + .6*h21(vec2(bin, float(L)*5.1 + 2.)))/A*6.2831853 - 3.14159265;
      float z = fract(hh*7.13 + uTravel*(.35 + .25*hh));
      float rs = 18. + 900.*pow(z, 2.6);
      float len = rs*uSpeed*(.22 + .35*hh) + 1.;
      float da = abs(mod(a - ac + 3.14159265, 6.2831853) - 3.14159265);
      float w = da*r;
      float along = smoothstep(rs - len, rs, r)*step(r, rs);
      float br = exp(-w*w/(.7 + rs*.004))*along*(.35 + z*1.8);
      col += mix(vec3(.85,.92,1.25), uTunCol*1.3, .55*hh)*br*uWarp*.75;
    }
    float zz = 90./max(r, 1.);
    float n = fbm(vec2(a*2.5/3.14159 + uT*.1, zz*6. - uTravel*1.4));
    col += uTunCol*uTunI*(smoothstep(90., 560., r)*pow(n, 4.5)*1.5 + exp(-r/40.)*.6);
  }
  if(uGateI > 0.){ float e = r - uGateR, th = 5. + uGateR*.035;
    col += uGateCol*uGateI*(exp(-e*e/(2.*th*th))*3.5 + exp(-abs(e)/70.)*.35); }
  if(uStarI > 0.){
    float R = uStarR;
    if(r < R){
      vec2 q = d/R; float z = sqrt(max(0., 1. - dot(q,q)));
      vec2 sp = q/(z + .6);
      float n = fbm(sp*3. + vec2(uT*.15, -uT*.1)), n2 = fbm(sp*9. - uT*.35);
      col += uStarCol*uStarI*(.28 + 1.1*n*n + .35*n2)*pow(z, .5) + vec3(1.)*uStarI*pow(z, 4.)*.18;
    } else {
      float e = r - R, ray = fbm(vec2(a*6., uT*.4));
      col += uStarCol*uStarI*(exp(-e/(R*.12 + 2.))*.9 + exp(-e/(R*.7 + 5.))*.35*ray);
    }
  }
  col += vec3(1.)*uCore*(3./(1. + r*r*.05)) + uStarCol*uCore*exp(-r/28.);
  if(uNovaT >= 0.){
    float tn = uNovaT;
    float rn = 720.*(1. - exp(-tn*1.3));
    float n = fbm(vec2(a*3., r*.01 - tn*.4)), n2 = fbm(d*.012 + tn*.1);
    float shell = exp(-pow((r - rn)/(28. + tn*45.), 2.))*(.55 + 1.5*n);
    float inner = smoothstep(rn, 0., r)*pow(n2, 3.2)*1.1*exp(-tn*.5);
    vec3 nc = uNovaCol;
    if(uRB > 0.) nc = mix(nc, hue(fract(a/6.283 + tn*.2 + r*.001))*.9 + .15, uRB);
    vec3 neb = mix(nc, vec3(.22,.3,.85)*.7, smoothstep(.35, .75, n2)*(1. - uRB*.7));
    col += uNovaI*(nc*shell*3.*exp(-tn*.45) + neb*inner);
    col += vec3(1.,.95,.9)*uNovaI*exp(-tn*2.4)*50./(1. + r*r*.004);
    float e2 = r - tn*1150.; col += vec3(1.)*uNovaI*exp(-e2*e2/900.)*exp(-tn*1.7)*2.2;
  }
  if(uBH > 0.){
    float rs = uBHR;
    vec2 q = vec2(d.x, d.y*3.2); float rq = length(q), ang = atan(q.y, q.x);
    float disk = smoothstep(rs*1.35, rs*1.8, rq)*smoothstep(rs*4.4, rs*2.2, rq);
    float swirl = fbm(vec2(ang*3. - uT*2.6, rq*.03));
    vec3 dc = mix(vec3(1.35,.7,.3), hue(fract(ang/6.283 - uT*.3))*1.6, uRB*.0 + 1.);
    col += dc*disk*(.45 + 1.6*swirl)*(1. + .8*sin(ang))*uBH*1.6;
    float pr = abs(r - rs*1.15); col += vec3(1.,.9,.8)*exp(-pr*pr/6.)*uBH*2.6;
    col *= mix(1., smoothstep(rs*.94, rs*1.04, r), uBH);
  }
  col += uFlash;
  o = vec4(col, 1.);
}`;

function metCompile(gl, vs, fs){
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aP'); gl.bindAttribLocation(p, 0, 'aA'); gl.bindAttribLocation(p, 1, 'aC');
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){ const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return {p, u};
}

function metFBO(gl, w, h){
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return {fb, tex, w, h};
}

function metTex(gl, source){
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

function metResize(){
  const gl = MT.gl, w = Math.round(W*scale), h = Math.round(H*scale);
  if(MT.w === w && MT.h === h) return;
  MT.w = w; MT.h = h; MT.c.width = w; MT.c.height = h;
  ['scene','half','l1a','l1b','l2a','l2b','l3a','l3b'].forEach(k => { const f = MT[k]; if(f){ gl.deleteFramebuffer(f.fb); gl.deleteTexture(f.tex); } });
  const q = (d) => [Math.max(1, Math.round(w/d)), Math.max(1, Math.round(h/d))];
  MT.scene = metFBO(gl, w, h);
  MT.half = metFBO(gl, ...q(2));
  MT.l1a = metFBO(gl, ...q(4)); MT.l1b = metFBO(gl, ...q(4));
  MT.l2a = metFBO(gl, ...q(8)); MT.l2b = metFBO(gl, ...q(8));
  MT.l3a = metFBO(gl, ...q(16)); MT.l3b = metFBO(gl, ...q(16));
}

const MFONT_EN = '"Cinzel","Noto Serif JP","Noto Serif CJK JP",serif';

const MFONT_JP = '"Noto Serif JP","Noto Serif CJK JP","Hiragino Mincho ProN",serif';

function metGoldGrad(x, y0, y1){ const g = x.createLinearGradient(0,y0,0,y1); g.addColorStop(0,'#fff2c4'); g.addColorStop(.45,'#d9a943'); g.addColorStop(.55,'#b9862a'); g.addColorStop(1,'#f6dc92'); return g; }

function metBackCanvas(){
  const c = document.createElement('canvas'); c.width = 600; c.height = 840; const x = c.getContext('2d');
  const g = x.createRadialGradient(300,380,40,300,420,560); g.addColorStop(0,'#1d2656'); g.addColorStop(1,'#060918');
  x.fillStyle = g; x.fillRect(0,0,600,840);
  x.save(); x.translate(300,400); x.strokeStyle = 'rgba(214,178,94,.28)'; x.lineWidth = 1;
  for(let i=0;i<48;i++){ x.rotate(Math.PI/48); x.beginPath(); x.ellipse(0,0,230,86,0,0,Math.PI*2); x.stroke(); }
  x.strokeStyle = 'rgba(214,178,94,.18)';
  for(let r=110;r<280;r+=14){ x.beginPath(); x.arc(0,0,r,0,Math.PI*2); x.stroke(); }
  x.restore();
  x.strokeStyle = metGoldGrad(x,0,840); x.lineWidth = 4; roundRectOn(x,20,20,560,800,14); x.stroke();
  x.lineWidth = 1.2; roundRectOn(x,32,32,536,776,10); x.stroke();
  for(const [cx,cy] of [[32,32],[568,32],[32,808],[568,808]]){ x.save(); x.translate(cx,cy); x.rotate(Math.PI/4); x.fillStyle = '#e7c46b'; x.fillRect(-6,-6,12,12); x.restore(); }
  x.save(); x.translate(300,400);
  x.beginPath(); x.arc(0,0,86,0,Math.PI*2); x.fillStyle = 'rgba(6,9,24,.85)'; x.fill();
  x.lineWidth = 5; x.strokeStyle = metGoldGrad(x,-86,86); x.stroke();
  x.lineWidth = 1.2; x.beginPath(); x.arc(0,0,74,0,Math.PI*2); x.stroke();
  x.fillStyle = metGoldGrad(x,-40,40); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 84px ${MFONT_EN}`; x.fillText('O',0,6);
  x.restore();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = metGoldGrad(x,690,730);
  x.font = `600 34px ${MFONT_EN}`; if('letterSpacing' in x) x.letterSpacing = '12px'; x.fillText('ORIPALUCK',306,706);
  x.font = `400 13px ${MFONT_EN}`; if('letterSpacing' in x) x.letterSpacing = '7px'; x.fillStyle = 'rgba(231,196,107,.75)'; x.fillText('TRADING CARD ORIPA',304,746);
  return c;
}

function roundRectOn(x,px,py,w,h,r){ x.beginPath(); x.moveTo(px+r,py); x.arcTo(px+w,py,px+w,py+h,r); x.arcTo(px+w,py+h,px,py+h,r); x.arcTo(px,py+h,px,py,r); x.arcTo(px,py,px+w,py,r); x.closePath(); }

function metFrontCanvas(i, art){
  const c = document.createElement('canvas'); c.width = 600; c.height = 840; const x = c.getContext('2d');
  if(art && art.complete && art.naturalWidth > 0){
    const img = art, r = Math.max(600/img.width, 840/img.height), dw = img.width*r, dh = img.height*r;
    x.drawImage(img, (600-dw)/2, (840-dh)/2, dw, dh); return c;
  }
  const stops = [['#fbfcff','#b9c2d6','#f2f5fb'],null,null,['#fff4c8','#d6a13a','#fff0b8'],null][i] || ['#fff','#ccc','#fff'];
  let g;
  if(BT[i].rainbow){ g = x.createLinearGradient(0,0,600,840); ['#ffd1e8','#fff3b0','#c8ffd9','#bfe6ff','#e3ccff','#ffd1e8'].forEach((s,k,a)=>g.addColorStop(k/(a.length-1),s)); }
  else { g = x.createLinearGradient(0,0,600,840); g.addColorStop(0,stops[0]); g.addColorStop(.5,stops[1]); g.addColorStop(1,stops[2]); }
  x.fillStyle = g; x.fillRect(0,0,600,840);
  x.save(); x.translate(300,380); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2;
  for(let k=0;k<72;k++){ x.rotate(Math.PI*2/72); x.beginPath(); x.moveTo(0,60); x.lineTo(0,520); x.stroke(); }
  x.restore();
  x.strokeStyle = 'rgba(60,40,10,.45)'; x.lineWidth = 3; roundRectOn(x,22,22,556,796,12); x.stroke();
  x.lineWidth = 1; roundRectOn(x,34,34,532,772,8); x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(40,26,6,.85)'; x.font = `700 76px ${MFONT_EN}`; if('letterSpacing' in x) x.letterSpacing = '8px';
  x.fillText(BT[i].en, 304, 380);
  x.font = `600 22px ${MFONT_EN}`; if('letterSpacing' in x) x.letterSpacing = '9px'; x.fillText('ORIPALUCK', 304, 90);
  x.font = `600 40px ${MFONT_JP}`; if('letterSpacing' in x) x.letterSpacing = '10px'; x.fillText(BT[i].name+'リザルト', 305, 740);
  return c;
}

function metTitleCanvas(i){
  const c = document.createElement('canvas'); c.width = 1080; c.height = 320; const x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const T = BT[i];
  let fs = 118; x.font = `600 ${fs}px ${MFONT_EN}`; if('letterSpacing' in x) x.letterSpacing = '26px';
  while(x.measureText(T.en).width > 880 && fs > 50){ fs -= 4; x.font = `600 ${fs}px ${MFONT_EN}`; if('letterSpacing' in x) x.letterSpacing = Math.round(fs*.2)+'px'; }
  const tw = x.measureText(T.en).width;
  let g;
  if(T.rainbow){ g = x.createLinearGradient(540-tw/2,0,540+tw/2,0); ['#ff8fb8','#ffe38a','#8fffb8','#8fd8ff','#c9a0ff'].forEach((s,k,a)=>g.addColorStop(k/(a.length-1),s)); }
  else {
    const m = [['#ffffff','#cfd6e6','#ffffff'],['#e6f5ff','#5aaeff','#dff1ff'],['#ffe6e6','#ff4d61','#ffd9dc'],['#fff5d0','#e0aa3e','#fff1c0']][i];
    g = x.createLinearGradient(0,60,0,190); g.addColorStop(0,m[0]); g.addColorStop(.55,m[1]); g.addColorStop(1,m[2]);
  }
  x.fillStyle = g; x.fillText(T.en, 540+13, 128);
  x.font = `500 34px ${MFONT_JP}`; if('letterSpacing' in x) x.letterSpacing = '14px';
  const sub = T.sub, sw = x.measureText(sub).width;
  x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(sub, 540+7, 250);
  const lc = T.rainbow ? 'rgba(255,255,255,.8)' : (i===0 ? 'rgba(220,228,245,.8)' : T.col);
  x.strokeStyle = lc; x.fillStyle = lc; x.lineWidth = 2;
  for(const sg of [-1,1]){
    const a = 540 + sg*(sw/2 + 34), b = 540 + sg*430;
    x.beginPath(); x.moveTo(a,250); x.lineTo(b,250); x.stroke();
    x.save(); x.translate(b,250); x.rotate(Math.PI/4); x.fillRect(-5,-5,10,10); x.restore();
  }
  return c;
}

function hueRGB(h){ h = ((h%1)+1)%1; return [clamp(Math.abs(h*6-3)-1), clamp(2-Math.abs(h*6-2)), clamp(2-Math.abs(h*6-4))]; }

function metBindQuad(gl, buf){ gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.disableVertexAttribArray(1); }

function metPass(prog, target, setup){
  const gl = MT.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
  gl.viewport(0, 0, target ? target.w : MT.w, target ? target.h : MT.h);
  gl.useProgram(prog.p); metBindQuad(gl, MT.fsq); setup(prog.u);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function metSetTex(u, name, unit, tex){ const gl = MT.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u[name], unit); }

function metIR(){
  if(MT.ir && MT.ir.sampleRate === AC.sampleRate) return MT.ir;
  const len = Math.floor(AC.sampleRate*3.2), b = AC.createBuffer(2, len, AC.sampleRate);
  for(let ch=0; ch<2; ch++){ const d = b.getChannelData(ch); let lp = 0;
    for(let i=0;i<len;i++){ lp = lp*.6 + (Math.random()*2-1)*.4; d[i] = lp*Math.pow(1-i/len, 3.2); } }
  MT.ir = b; return b;
}

const NV_C = {x:270, y:470};

function scheduleNova(tier){
  const s = {mode:'nova', tier, fakeStart:null, stepStart:()=>Infinity, steps:0, fxY:470, capY:120};
  const GAP = 2.7, APPROACH = 2.5, DECIDE = .9;
  s.GAP = GAP; s.APPROACH = APPROACH; s.DECIDE = DECIDE;
  s.seq = [[0],[0,1],[0,1,2],[0,1,2,3],[0,1,2,3]][tier];
  s.gates = s.seq.map((c,k) => ({t: 5.0 + k*GAP, c}));
  const last = s.gates[s.gates.length-1].t;
  s.fakeGate = tier < 3 ? last + GAP : null;          // one more gate comes... and falls apart before it decides
  s.warpEnd = (s.fakeGate !== null ? s.fakeGate : last) + 1.2;
  s.starT = s.warpEnd + .5;
  s.colT = s.starT + 1.4 + [1.0,1.2,1.4,1.6,1.6][tier];
  s.colEnd = s.colT + 1.8;
  s.novaT = s.colEnd + .6;
  s.bhT = tier===4 ? s.novaT + 2.2 : null;
  s.whiteT = tier===4 ? s.bhT + 2.6 : null;
  s.emerge = tier===4 ? s.whiteT + 1.6 : s.novaT + 2.4;
  s.flyEnd = s.emerge + 1.6;
  s.flip = s.flyEnd + [0,.4,.7,1.0,1.2][tier];
  s.reveal = s.flip + .55;
  s.end = s.reveal + 4.8;
  s.burst = s.novaT; s.result = s.flip;
  const sp = x => {
    if(x < .6) return 0;
    if(x < 2.8) return Math.pow((x-.6)/2.2, 2)*.85;
    if(x < s.warpEnd){
      let v = .8;
      for(const g of s.gates){ if(x >= g.t) v += .1; const q = x - g.t; if(q > -.6 && q < 0) v += 1.1*Math.pow((q+.6)/.6, 2); else if(q >= 0 && q < .5) v += 1.1*Math.exp(-q*7); if(q >= .5 && q < 1.6) v -= .25*Math.sin((q-.5)/1.1*Math.PI); }
      if(s.fakeGate !== null){ const q = x - s.fakeGate; if(q > -DECIDE && q < .8) v -= .35*Math.sin(clamp((q+DECIDE)/(DECIDE+.8))*Math.PI); }
      return Math.max(.3, v);
    }
    const q = x - s.warpEnd; return q < .45 ? 1.2*Math.pow(1-q/.45, 3) : 0;
  };
  s.speedAt = sp;
  const N = Math.ceil(s.end*60)+2, tr = new Float32Array(N); let acc = 0;
  for(let k=0;k<N;k++){ tr[k] = acc; acc += sp(k/60)/60; }
  s.travel = tr;
  s.info = t => ({col: BT[tier].col, rainbow: !!BT[tier].rainbow, lvl: Math.max(0, tier-1), plate: BT[tier].name+'リザルト'});
  s.phases = [
    {key:'点火', a:0, b:2.8},
    {key:'ワープ', a:2.8, b:s.warpEnd},
    {key:'到達', a:s.warpEnd, b:s.colT},
    {key:'崩壊', a:s.colT, b:s.novaT},
    {key:'超新星', a:s.novaT, b: tier===4 ? s.bhT : s.emerge},
    ...(tier===4 ? [{key:'黒洞', a:s.bhT, b:s.emerge}] : []),
    {key:'顕現', a:s.emerge, b:s.reveal},
    {key:'結果', a:s.reveal, b:s.end},
  ];
  return s;
}

function nvTravel(S,t){ const x = clamp(t*60, 0, S.travel.length-2), k = Math.floor(x); return lerp(S.travel[k], S.travel[k+1], x-k); }

function nvTunCol(S,t){
  let cur = null, st = 0, prev = [.55,.7,1.1];
  for(const g of S.gates) if(t >= g.t){ prev = cur || prev; cur = MCOL[g.c]; st = g.t; }
  if(!cur) return [.55,.7,1.1];
  const u = clamp((t-st)/.2); return [lerp(prev[0],cur[0],u), lerp(prev[1],cur[1],u), lerp(prev[2],cur[2],u)];
}

function nvFinal(S){ return MCOL[S.tier]; }

function nvParticles(S,t){
  const P = MT.parts; let n = 0;
  const push = (x,y,s,a,r,g,b) => { if(n >= 4000 || a <= .003) return; const o = n*7; P[o]=x; P[o+1]=y; P[o+2]=s; P[o+3]=a; P[o+4]=r; P[o+5]=g; P[o+6]=b; n++; };
  const C = NV_C;
  for(const g of S.gates){                                         // burst as each gate passes
    const q = t - g.t; if(q < 0 || q > .8) continue;
    const c = MCOL[g.c];
    for(let i=0;i<90;i++){ const id = 30000 + i*3 + Math.round(g.t*100); const a = rnd(id)*Math.PI*2, sp = 500 + rnd(id+1)*900;
      const r = 40 + sp*q; push(C.x + Math.cos(a)*r, C.y + Math.sin(a)*r, 3 + rnd(id+2)*3, 1-q/.8, c[0]*2.2, c[1]*2.2, c[2]*2.2); }
  }
  if(S.fakeGate !== null){                                         // the fake gate crumbles
    const q = t - (S.fakeGate - S.DECIDE); 
    if(q >= 0 && q < 1.2){ const R0 = 12 + 900*Math.pow(clamp((S.fakeGate - S.DECIDE - S.fakeGate + S.APPROACH)/S.APPROACH), 3.4);
      for(let i=0;i<120;i++){ const id = 38000 + i*3, a = rnd(id)*Math.PI*2, r = R0 + q*(40 + rnd(id+1)*120), al = (1 - q/1.2)*.8;
        push(C.x + Math.cos(a)*r, C.y + Math.sin(a)*r + 160*q*q, 2 + rnd(id+2)*2, al, 1.1, 1.15, 1.3); } }
  }
  const qc = t - S.colT;                                           // matter pulled into the collapsing star
  if(qc >= 0 && t < S.novaT){
    const c = nvFinal(S);
    for(let i=0;i<220;i++){ const id = 31000 + i*3, d0 = rnd(id)*1.2, age = qc - d0; if(age < 0 || age > .9) continue;
      const u = age/.9, a0 = rnd(id+1)*Math.PI*2 + u*2.5, r = (420 + rnd(id+2)*260)*Math.pow(1-u, 1.6);
      push(C.x + Math.cos(a0)*r, C.y + Math.sin(a0)*r, 2 + 3*u, Math.min(1, u*4)*(1-u*.3), c[0]*2, c[1]*2, c[2]*2); }
  }
  const burstAt = (t0, count, seedBase, rainbow, speedMul) => {
    const q = t - t0; if(q < 0) return;
    const c = nvFinal(S);
    for(let i=0;i<count;i++){
      const id = seedBase + i*3, life = 1.4 + rnd(id)*1.6; if(q > life) continue;
      const a = rnd(id+1)*Math.PI*2, sp = (220 + rnd(id+2)*1000)*speedMul, dr = (1 - Math.exp(-q*1.6))/1.6;
      const x = C.x + Math.cos(a)*sp*dr, y = C.y + Math.sin(a)*sp*dr;
      let cc = i%5===0 ? [1.6,1.6,1.6] : c;
      if(rainbow){ const h = hueRGB(i/count); cc = [h[0]*1.5, h[1]*1.5, h[2]*1.5]; }
      const al = 1 - q/life;
      push(x, y, 2.5 + rnd(id+3)*4, al, cc[0]*2.2, cc[1]*2.2, cc[2]*2.2);
      const vx = Math.cos(a)*sp*Math.exp(-q*1.6), vy = Math.sin(a)*sp*Math.exp(-q*1.6);      // short trail
      for(let k=1;k<4;k++) push(x - vx*.012*k, y - vy*.012*k, (2.5 + rnd(id+3)*4)*(1 - k*.2), al*(1 - k*.25), cc[0]*1.8, cc[1]*1.8, cc[2]*1.8);
    }
  };
  if(!(S.bhT !== null && t > S.bhT + .8)) burstAt(S.novaT, 320, 32000, false, 1);
  if(S.bhT !== null){
    const qb = t - S.bhT;
    if(qb >= 0 && t < S.whiteT){                                     // sparks orbiting the black hole
      for(let i=0;i<170;i++){ const id = 33000 + i*3, rr = 90 + rnd(id)*120, sp = 3.2*Math.pow(90/rr, 1.5), a = rnd(id+1)*Math.PI*2 + qb*sp;
        const h = hueRGB((a/(Math.PI*2) + t*.1) % 1), al = clamp(qb/.6)*(.5 + .5*Math.sin(a*3 + i));
        push(C.x + Math.cos(a)*rr, C.y + Math.sin(a)*rr/3.2, 2 + rnd(id+2)*2.5, al, h[0]*2, h[1]*2, h[2]*2); }
    }
    burstAt(S.whiteT, 380, 34000, true, 1.2);
  }
  const qe = t - S.emerge;                                          // light trail behind the incoming card
  if(qe >= 0 && qe < 1.8){
    const c = BT[S.tier].rainbow ? null : nvFinal(S);
    for(let i=0;i<60;i++){ const id = 35000 + i*3, a = rnd(id)*Math.PI*2, r = 20 + rnd(id+1)*160*clamp(qe/1.4), al = (1 - clamp((qe-1.2)/.6))*.6;
      const cc = c || hueRGB((i/60 + t*.2) % 1);
      push(C.x + Math.cos(a)*r, C.y + Math.sin(a)*r*1.3, 2 + rnd(id+2)*2, al*Math.max(0, Math.sin(t*8 + i)), cc[0]*2, cc[1]*2, cc[2]*2); }
  }
  const fm = t - (S.flip + .27);
  if(fm >= 0) for(let i=0;i<110;i++){
    const id = 36000+i*3, life = .6 + rnd(id)*.7; if(fm > life) continue;
    const a = rnd(id+1)*Math.PI*2, sp = 150 + rnd(id+2)*500, dr = (1-Math.exp(-fm*4))/4;
    const c = BT[S.tier].rainbow ? hueRGB(i/110) : nvFinal(S);
    push(C.x + Math.cos(a)*sp*dr, C.y + Math.sin(a)*sp*dr, 2+rnd(id+3)*3, 1-fm/life, c[0]*2+.6, c[1]*2+.6, c[2]*2+.6);
  }
  if(t > S.reveal){
    for(let i=0;i<40;i++){
      const a = rnd(37000+i)*Math.PI*2, r = 1.05 + rnd(37100+i)*.4, tw = Math.max(0, Math.sin(t*2.4 + i*2.1));
      const c = BT[S.tier].rainbow ? hueRGB((i/40 + t*.1)%1) : [1,1,1];
      push(C.x + Math.cos(a)*165*r, C.y + Math.sin(a)*225*r, 3+tw*5, tw*.9, c[0]*1.8, c[1]*1.8, c[2]*1.8);
    }
  }
  return n;
}

function frameNova(S,t){
  metResize(); metTextures();
  const gl = MT.gl, C = NV_C, fin = nvFinal(S), rb = !!BT[S.tier].rainbow;

  const speed = S.speedAt(t);
  const warp = t < S.warpEnd + .5 ? clamp(t/1.2)*(t > S.warpEnd ? clamp(1 - (t - S.warpEnd)/.5) : 1) : 0;
  const tun = nvTunCol(S,t);
  // next/current gate ring
  let gateR = 0, gateI = 0, gateCol = [1,1,1];
  const ringR = q => 12 + 900*Math.pow(clamp((q + S.APPROACH)/S.APPROACH), 3.4);
  const flick = .55 + .45*Math.sin(t*37)*Math.sin(t*13.3);
  const gateList = S.gates.map(g => ({t:g.t, c:g.c, fake:false})).concat(S.fakeGate !== null ? [{t:S.fakeGate, c:-1, fake:true}] : []);
  for(const g of gateList){
    const q = t - g.t; if(q <= -S.APPROACH || q >= .18) continue;
    gateR = ringR(q);
    const undecided = q < -S.DECIDE;
    if(g.fake){
      if(undecided){ gateI = clamp((q + S.APPROACH)/.4)*(.25 + .3*flick); gateCol = [.7,.75,.85]; }
      else { const u = clamp((q + S.DECIDE)/.55); gateI = (1 - u)*(.4 + .6*(rnd(Math.floor(t*50)) > .5 ? 1 : .2)); gateR += (rnd(Math.floor(t*50)+7)-.5)*30*u; gateCol = [.6,.62,.7]; if(u >= 1) gateI = 0; }
    } else {
      if(undecided){ gateI = clamp((q + S.APPROACH)/.4)*(.25 + .3*flick); gateCol = [.7,.75,.85]; }
      else { const u = q + S.DECIDE; gateI = (q < 0 ? 1 + 1.6*Math.exp(-u*6) : 1 - q/.18); gateCol = MCOL[g.c]; }
    }
  }
  // the star: approach, hold, collapse
  let starR = 0, starI = 0, core = 0;
  if(t >= S.starT && t < S.colEnd){
    const qa = t - S.starT;
    starR = lerp(30, 200, easeOut(clamp(qa/1.2)));
    starI = clamp(qa/.5);
    if(t >= S.colT){ const u = clamp((t - S.colT)/1.4); starR *= Math.pow(1 - u, 2.2); starR = Math.max(starR, 4); starI *= 1 + u*1.5; }
  }
  if(t >= S.colEnd && t < S.novaT) core = .5 + .4*Math.sin((t - S.colEnd)*40);
  // nova / white hole
  let novaT = -1, novaI = 1, rbAmt = 0, novaCol = fin;
  if(t >= S.novaT){ novaT = t - S.novaT; }
  let bh = 0, bhR = 55;
  if(S.bhT !== null){
    if(t >= S.bhT && t < S.whiteT){ bh = clamp((t - S.bhT)/.6); bhR = 40 + 22*easeOut(clamp((t - S.bhT)/1.5)); novaI = 1 - clamp((t - S.bhT)/.8)*.85; }
    if(t >= S.whiteT){ novaT = t - S.whiteT; rbAmt = 1; novaI = 1.2; }
  }
  // camera
  let zoom = 1, roll = .12*Math.sin(t*.35) + (t < S.warpEnd ? .25*clamp((t-2.2)/5)*Math.sin(t*.6) : 0);
  let A = t < S.warpEnd && t > 1 ? 1.5*speed : 0;
  for(const g of S.gates){ const q = t - g.t; if(q >= 0) { A += 10*Math.exp(-q*6); zoom += .06*Math.exp(-q*5); } }
  if(t >= S.colT && t < S.novaT) zoom += .12*easeOut(clamp((t - S.colT)/1.8));
  if(novaT >= 0){ A += 22*Math.exp(-novaT*3.5); zoom += .15*Math.exp(-novaT*3); }
  if(S.whiteT !== null && t >= S.whiteT){ const q = t - S.whiteT; A += 18*Math.exp(-q*4); }
  if(S.bhT !== null && t >= S.bhT && t < S.whiteT) A += 2 + 3*clamp((t - S.whiteT + .8)/.8);
  if(reduceMotion) A = 0;
  const fq = Math.floor(t*30), shake = {x:(rnd(fq*2+41)-.5)*2*A, y:(rnd(fq*2+42)-.5)*2*A};
  let flash = 0;
  for(const g of S.gates){ const q = t - g.t; if(q >= 0) flash += .35*Math.exp(-q*12); }
  if(novaT >= 0 && !(S.whiteT !== null && t >= S.whiteT)) flash += 1.6*Math.exp(-novaT*6);
  if(S.whiteT !== null && t >= S.whiteT) flash += 1.8*Math.exp(-(t - S.whiteT)*6);
  { const q = t - (S.flip + .27); if(q >= 0) flash += .7*Math.exp(-q*9); }
  const starsAmt = 1 - warp*.55;

  metPass(MT.nova, MT.scene, U => {
    gl.uniform2f(U.uRes, MT.w, MT.h); gl.uniform1f(U.uT, t);
    gl.uniform2f(U.uShake, shake.x, shake.y); gl.uniform1f(U.uZoom, zoom); gl.uniform1f(U.uRoll, roll);
    gl.uniform1f(U.uWarp, warp); gl.uniform1f(U.uTravel, nvTravel(S,t)); gl.uniform1f(U.uSpeed, Math.min(1.6, speed)*.9);
    gl.uniform3f(U.uTunCol, ...tun); gl.uniform1f(U.uTunI, warp*(.6 + .25*S.gates.filter(g => t >= g.t).length));
    gl.uniform1f(U.uGateR, gateR); gl.uniform3f(U.uGateCol, ...gateCol); gl.uniform1f(U.uGateI, gateI);
    gl.uniform1f(U.uStarR, starR); gl.uniform3f(U.uStarCol, ...fin); gl.uniform1f(U.uStarI, starI);
    gl.uniform1f(U.uCore, core); gl.uniform1f(U.uNovaT, novaT); gl.uniform3f(U.uNovaCol, ...novaCol); gl.uniform1f(U.uNovaI, novaI);
    gl.uniform1f(U.uBH, bh); gl.uniform1f(U.uBHR, bhR); gl.uniform1f(U.uRB, rbAmt); gl.uniform1f(U.uFlash, flash); gl.uniform1f(U.uStars, starsAmt);
  });
  const camU = u => { gl.uniform2f(u.uCam, 0, 10); gl.uniform2f(u.uShake, shake.x, shake.y); gl.uniform1f(u.uZoom, zoom); };

  gl.enable(gl.BLEND);
  const n = nvParticles(S,t);
  if(n > 0){
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(MT.pt.p); camU(MT.pt.u); gl.uniform1f(MT.pt.u.uScale, scale);
    gl.bindBuffer(gl.ARRAY_BUFFER, MT.pbuf); gl.bufferData(gl.ARRAY_BUFFER, MT.parts.subarray(0, n*7), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 28, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 16);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disableVertexAttribArray(1);
  }
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  if(t >= S.emerge){
    const qe = t - S.emerge, u = easeOut(clamp(qe/1.4));
    const fu = clamp((t - S.flip)/.55), fe = fu<.5 ? 4*fu*fu*fu : 1 - Math.pow(-2*fu+2,3)/2;
    const hold = t > S.flyEnd && t < S.flip ? 1 : 0, after = t - S.reveal;
    let ry = Math.PI + (1-u)*(-8*Math.PI) + fe*Math.PI; if(after > 0) ry += .12*Math.sin(after*1.1);
    const rx = .07*Math.sin(t*.9) + (1-u)*.6, rz = .025*Math.sin(t*.7) + (1-u)*1.2 + hold*(rnd(Math.floor(t*40)+3)-.5)*.02;
    const back = Math.cos(ry)*Math.cos(rx) < 0;
    gl.useProgram(MT.card.p); metBindQuad(gl, MT.quad); const U = MT.card.u; camU(U);
    gl.uniform2f(U.uSize, 300, 420); gl.uniform2f(U.uPos, C.x + hold*(rnd(Math.floor(t*40))-.5)*3, C.y + (after > 0 ? Math.sin(after*1.6)*5 : 0) + hold*(rnd(Math.floor(t*40)+9)-.5)*3);
    gl.uniform1f(U.uRY, ry); gl.uniform1f(U.uRX, rx); gl.uniform1f(U.uRZ, rz); gl.uniform1f(U.uZ, lerp(9000, 0, u));
    metSetTex(U, 'uTex', 0, back ? MT.back : MT.fronts[S.tier]);
    gl.uniform1f(U.uBack, back ? 1 : 0); gl.uniform1f(U.uMat, clamp((qe - .5)/.8)); gl.uniform1f(U.uSweep, after > 0 ? ((after*.55) % 1.8) - .3 : -1);
    gl.uniform1f(U.uAlpha, clamp(qe/.25)); gl.uniform1f(U.uEdge, after > 0 ? .5 : 2 + hold*(1.5 + 1.5*Math.max(0, Math.sin((t - S.flyEnd)*Math.PI*2/.45))));
    const gc = rb ? hueRGB((t*.15)%1) : fin; gl.uniform3f(U.uGlow, gc[0]*.8, gc[1]*.8, gc[2]*.8);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const tq = t - S.reveal - .15;
  if(tq > 0){
    gl.useProgram(MT.text.p); metBindQuad(gl, MT.quad); const U = MT.text.u;
    gl.uniform2f(U.uCam, 0, 0); gl.uniform2f(U.uShake, 0, 0); gl.uniform1f(U.uZoom, 1);
    gl.uniform2f(U.uSize, 600, 178); gl.uniform2f(U.uPos, 270, 118 - 6*(1-easeOut(clamp(tq/.9))));
    gl.uniform1f(U.uRY, 0); gl.uniform1f(U.uRX, 0); gl.uniform1f(U.uRZ, 0); gl.uniform1f(U.uZ, 0);
    metSetTex(U, 'uTex', 0, MT.titles[S.tier]);
    gl.uniform1f(U.uAlpha, clamp(tq/.4)); gl.uniform1f(U.uWipe, easeOut(clamp(tq/.9))*1.12); gl.uniform1f(U.uBoost, 2.3);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  gl.disable(gl.BLEND);

  metPass(MT.bright, MT.half, U => metSetTex(U, 'uSrc', 0, MT.scene.tex));
  const blur = (src, a, b) => {
    metPass(MT.blur, a, U => { metSetTex(U, 'uSrc', 0, src.tex); gl.uniform2f(U.uDir, 1/a.w, 0); });
    metPass(MT.blur, b, U => { metSetTex(U, 'uSrc', 0, a.tex); gl.uniform2f(U.uDir, 0, 1/b.h); });
  };
  blur(MT.half, MT.l1a, MT.l1b); blur(MT.l1b, MT.l2a, MT.l2b); blur(MT.l2b, MT.l3a, MT.l3b);

  let shockR = 0, shockA = 0;
  for(const g of S.gates){ const q = t - g.t; if(q >= 0 && q < 1){ shockR = q*1.3; shockA = .6*Math.exp(-q*3); } }
  if(novaT >= 0){ const q = S.whiteT !== null && t >= S.whiteT ? t - S.whiteT : t - S.novaT; shockR = q*.9; shockA = 1.4*Math.exp(-q*2); }
  let ca = .0012 + .004*Math.min(1.5, speed)*warp, zb = .06*Math.min(1.5, speed)*warp, pinch = 0;
  for(const g of S.gates){ const q = t - g.t; if(q >= 0){ ca += .01*Math.exp(-q*5); zb += .05*Math.exp(-q*6); } }
  if(t >= S.colT && t < S.novaT) pinch = .45*Math.pow(clamp((t - S.colT)/1.4), 2);
  if(novaT >= 0){ ca += .022*Math.exp(-novaT*2.5); zb += .32*Math.exp(-novaT*1.3); pinch = -.3*Math.exp(-novaT*4); }
  { const q = t - (S.flip+.27); if(q >= 0) ca += .006*Math.exp(-q*6); }
  let exp = clamp(t/.8)*(1 - .25*warp);
  if(t >= S.warpEnd && t < S.starT) exp *= .7;
  if(t >= S.colEnd && t < S.novaT) exp *= .6;
  metPass(MT.comp, null, U => {
    metSetTex(U, 'uScene', 0, MT.scene.tex); metSetTex(U, 'uB1', 1, MT.l1b.tex); metSetTex(U, 'uB2', 2, MT.l2b.tex); metSetTex(U, 'uB3', 3, MT.l3b.tex);
    gl.uniform1f(U.uT, t); gl.uniform1f(U.uCA, ca); gl.uniform1f(U.uZB, Math.min(.6, zb)); gl.uniform1f(U.uExp, exp); gl.uniform1f(U.uGrain, .045);
    gl.uniform2f(U.uShockC, .5, 1 - C.y/960); gl.uniform1f(U.uShockR, shockR); gl.uniform1f(U.uShockA, shockA);
    gl.uniform2f(U.uZC, .5, 1 - C.y/960); gl.uniform1f(U.uPinch, pinch);
  });
}

function novaSounds(S,fromT,speed){
  const base = AC.currentTime - fromT/speed, T = x => base + x/speed;
  const comp = AC.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .25;
  const sat = AC.createWaveShaper(); sat.curve = satCurve(); sat.oversample = '4x';
  const makeup = AC.createGain(); makeup.gain.value = .65;
  const lim = AC.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .12;
  comp.connect(sat); sat.connect(makeup); makeup.connect(lim); lim.connect(master);
  const dry = AC.createGain(); dry.gain.value = .85; dry.connect(comp);
  const rev = AC.createConvolver(); rev.buffer = metIR(); const wet = AC.createGain(); wet.gain.value = .6; rev.connect(wet); wet.connect(comp);
  const route = (node, send=.5, pan=0) => { let n = node; if(pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; } n.connect(dry); const s = AC.createGain(); s.gain.value = send; n.connect(s); s.connect(rev); return n; };
  const env = (g, t0, peak, att, dur) => { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0+att); g.gain.exponentialRampToValueAtTime(.0001, t0+dur); };
  const osc0 = (type, f, t0, dur, peak, o={}) => { const s = AC.createOscillator(), g = AC.createGain(); s.type = type; s.frequency.setValueAtTime(f, t0); if(o.f2) s.frequency.exponentialRampToValueAtTime(o.f2, t0+(o.glide||dur)); if(o.detune) s.detune.value = o.detune; env(g, t0, peak, o.att||.005, dur); s.connect(g); route(g, o.send ?? .5, o.pan||0); s.start(t0); s.stop(t0+dur+.1); scheduled.push(s); return s; };
  const osc = (type, f, t0, dur, peak, o={}) => {
    const s0 = osc0(type, f, t0, dur, peak, o);
    if(type === 'sine' && f < 140){                      // body layer: 2.5x / 4x harmonics + a click so the hit reads on phone speakers
      osc0('triangle', f*2.5, t0, Math.min(dur, .9), peak*.45, {...o, f2: o.f2 ? o.f2*2.5 : undefined});
      osc0('sawtooth', f*4, t0, Math.min(dur, .35), peak*.12, {...o, f2: o.f2 ? o.f2*4 : undefined, send: .2});
    }
    return s0;
  };
  const bell = (t0, f, peak, send=.8, pan=0) => { const c = AC.createOscillator(), m = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain();
    c.frequency.value = f; m.frequency.value = f*3.5; mg.gain.setValueAtTime(f*2.2, t0); mg.gain.exponentialRampToValueAtTime(f*.05, t0+1.6);
    m.connect(mg); mg.connect(c.frequency); env(g, t0, peak, .003, 2.8); c.connect(g); route(g, send, pan);
    c.start(t0); m.start(t0); c.stop(t0+3); m.stop(t0+3); scheduled.push(c, m); };
  const noiseBuf = (() => { const len = AC.sampleRate*2, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); for(let i=0;i<len;i++) d[i] = Math.random()*2-1; return b; })();
  const nz = (t0, dur, peak, o={}) => { const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = AC.createBiquadFilter(); f.type = o.type||'bandpass'; f.Q.value = o.Q||1;
    f.frequency.setValueAtTime(o.f0||1000, t0); if(o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t0+dur); const g = AC.createGain();
    if(o.swell){ g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0+dur*.95); g.gain.linearRampToValueAtTime(0, t0+dur); } else env(g, t0, peak, o.att||.005, dur);
    s.connect(f); f.connect(g); route(g, o.send ?? .4); s.start(t0); s.stop(t0+dur+.05); scheduled.push(s); };
  const ev = (x, fn) => { if(x >= fromT) fn(T(x)); };

  // warp engine: detuned saws through a lowpass that follows the speed, cut dead at the exit
  const w0 = Math.max(fromT, .5);
  if(w0 < S.warpEnd){
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; const g = AC.createGain();
    for(let x = w0; x <= S.warpEnd + .05; x += .05){ const v = S.speedAt(x); lp.frequency.setValueAtTime(420 + v*2600, T(x)); }
    g.gain.setValueAtTime(0, T(w0)); g.gain.linearRampToValueAtTime(.08, T(Math.min(S.warpEnd, 2.4))); g.gain.setValueAtTime(.08, T(S.warpEnd - .02)); g.gain.linearRampToValueAtTime(0, T(S.warpEnd + .04));
    lp.connect(g); route(g, .35);
    [[55,-8],[55,8],[110,0],[82.4,-4],[220,5],[330,-6],[440,3]].forEach(([f,dt]) => { const s = AC.createOscillator(); s.type = 'sawtooth'; s.frequency.setValueAtTime(f, T(w0)); s.frequency.linearRampToValueAtTime(f*1.6, T(S.warpEnd)); s.detune.value = dt; s.connect(lp); s.start(T(w0)); s.stop(T(S.warpEnd + .1)); scheduled.push(s); });
    nz(T(w0), S.warpEnd - w0, .09, {f0:600, f1:2600, Q:.8, att:1.2, send:.3});
  }
  ev(.4, a => { osc('sine', 38, a, 2.2, .35, {f2:70, att:1.5, send:.3}); bell(a+.1, 1318.5, .03, .95); });
  const approach = (tp) => {
    ev(tp - S.APPROACH, a => { nz(a, S.APPROACH - S.DECIDE, .1, {f0:300, f1:2400, Q:2.5, swell:true, send:.4}); osc('sawtooth', 82, a, S.APPROACH - S.DECIDE, .03, {f2:165, att:1.2, send:.4}); });
    for(let x = tp - S.APPROACH + .35; x < tp - S.DECIDE - .1; x += .5) ev(x, a => { osc('sine', 58, a, .16, .45, {f2:40, send:.2}); osc('sine', 52, a+.15, .14, .3, {f2:36, send:.2}); });
  };
  S.gates.forEach((g, k) => {
    approach(g.t);
    const f = [1046.5, 1318.5, 1568, 2093][k] || 2093;
    ev(g.t - S.DECIDE, a => { bell(a, f, .1, .85); bell(a+.04, f*1.5, .05, .9); bell(a+.08, f*2, .03, .95); nz(a, S.DECIDE, .16, {f0:800, f1:6000, Q:1.5, swell:true, send:.4}); });
    ev(g.t, a => { osc('sine', 85, a, 1.1, .75, {f2:32, send:.3}); nz(a, .5, .45, {type:'lowpass', f0:3200, f1:260, send:.5}); nz(a, .06, .25, {type:'highpass', f0:4000, send:.3}); });
  });
  if(S.fakeGate !== null){
    approach(S.fakeGate);
    ev(S.fakeGate - S.DECIDE, a => { osc('triangle', 900, a, .7, .07, {f2:160, send:.7}); nz(a, .6, .1, {f0:4000, f1:300, Q:1, send:.5}); osc('sine', 110, a, .6, .15, {f2:55, send:.3}); });
  }
  ev(S.warpEnd, a => { osc('sine', 60, a, .5, .4, {f2:40, send:.3}); osc('sine', 6200, a+.1, 1.2, .006, {send:.1, att:.3}); });
  ev(S.starT, a => { [65.4, 98, 130.8].forEach((f,k) => osc('sine', f, a, S.colT - S.starT + .3, .09, {att:.8, send:.5, detune:k*3})); nz(a, S.colT - S.starT, .03, {type:'lowpass', f0:400, f1:300, att:.8, send:.4}); });
  ev(S.colT, a => { nz(a, 1.4, .3, {type:'highpass', f0:200, f1:8000, Q:.7, swell:true, send:.4}); osc('sine', 70, a, 1.4, .25, {f2:900, att:1.3, send:.3}); osc('sawtooth', 55, a, 1.4, .05, {f2:440, att:1.3, send:.4}); });
  [0, .25].forEach(dx => ev(S.colEnd + .02 + dx, a => { osc('sine', 58, a, .16, .6, {f2:40, send:.2}); }));
  ev(S.novaT, a => {
    osc('sine', 72, a, 2.6, 1.0, {f2:24, glide:2.2, send:.35});
    nz(a, 1.6, .8, {type:'lowpass', f0:3500, f1:180, Q:.5, send:.6});
    nz(a, .09, .4, {type:'highpass', f0:4000, send:.3});
    [261.63, 329.63, 392, 523.25].forEach((f,k) => osc('sawtooth', f, a+.3, 3.5, .02, {att:1.2, send:.95, detune:k*5-7}));
  });
  if(S.bhT !== null){
    ev(S.bhT, a => { const s = osc('sine', 44, a, S.whiteT - S.bhT, .5, {att:.5, send:.3}); osc('triangle', 820, a, 2.1, .05, {f2:180, send:.8}); nz(a, S.whiteT - S.bhT, .06, {type:'lowpass', f0:200, f1:900, att:.8, send:.5}); });
    ev(S.whiteT - 1.2, a => nz(a, 1.2, .25, {type:'highpass', f0:300, f1:9000, swell:true, send:.4}));
    ev(S.whiteT, a => { osc('sine', 66, a, 2.4, .9, {f2:26, send:.35}); nz(a, 1.2, .6, {type:'lowpass', f0:4000, f1:250, send:.6});
      for(let j=0;j<12;j++) bell(a+.03+j*.04, [2093,2349,2637,3136,3520,4186][j%6]*(j>5?1.5:1), .035, .95, Math.sin(j)*.7); });
  }
  ev(S.emerge, a => { nz(a, 1.4, .14, {f0:300, f1:3000, Q:1.2, swell:true, send:.5}); bell(a+.2, 880, .05, .9); });
  for(let x = S.flyEnd + .1; x < S.flip - .1; x += .45) ev(x, a => { osc('sine', 58, a, .16, .5, {f2:40, send:.2}); osc('sine', 52, a+.15, .14, .35, {f2:36, send:.2}); });
  ev(S.flip, a => { nz(a, .45, .18, {f0:500, f1:5000, Q:1.5, send:.4, att:.02}); osc('sine', 120, a+.27, .6, .35, {f2:55, send:.3}); });
  const chords = [[523.25,659.25,783.99],[523.25,659.25,783.99,987.77],[523.25,659.25,783.99,987.77,1174.66],[523.25,659.25,783.99,1046.5,1174.66,1318.5],[523.25,659.25,783.99,1046.5,1174.66,1318.5,1567.98,2093]][S.tier];
  ev(S.reveal, a => {
    chords.forEach((f, k) => bell(a + k*.07, f, .07, .85, (k%2 ? .3 : -.3)));
    chords.forEach((f, k) => osc('triangle', f/2, a + .3 + k*.11, .9, .06, {send:.8, pan: k%2 ? .4 : -.4}));
    if(S.tier >= 3){ [0,1,2].forEach(k => osc('sawtooth', [261.63,329.63,392][k], a, 3.2, .018, {att:.8, send:.9, detune: k*4-4})); }
    osc('sine', 65.4, a, 4, .12, {att:.5, send:.4});
  });
}

const MCOL = [[1,1,1],[.18,.5,1.25],[1.3,.16,.22],[1.35,.82,.22],[1.35,.82,.22]];

/* ---------- player ---------- */
export function novaSupported(){
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2'); return !!(gl && gl.getExtension('EXT_color_buffer_float')); }
  catch(e){ return false; }
}

// ガチャボタンを押した瞬間に呼ぶ（スマホは操作の直後でないと音が鳴らせないため）
export function primeNovaAudio(){
  try {
    // iPhone: play through the silent switch like a game/video would
    try { if(navigator.audioSession) navigator.audioSession.type = 'playback'; } catch(e){}
    if(!AC){ AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .9; master.connect(AC.destination); }
    if(AC.state !== 'running') AC.resume();
    // unlock (iOS needs a sound started inside the tap)
    const b = AC.createBuffer(1, 1, AC.sampleRate), src = AC.createBufferSource(); src.buffer = b; src.connect(AC.destination); src.start(0);
  } catch(e){}
}
function satCurve(){
  const n = 2048, c = new Float32Array(n), k = 2.2;
  for(let i=0;i<n;i++){ const x = i/(n-1)*2 - 1; c[i] = Math.tanh(k*x)/Math.tanh(k); }
  return c;
}
export function setNovaSound(on){ soundOn = !!on; if(!on) stopSounds(); else if(MT && MT.resync) MT.resync(); }
export function novaAudioRunning(){ return !!(AC && AC.state === 'running'); }
// 演出中にタップされたとき: 音が止まっていたら起こして、今の位置から鳴らし直す
export function wakeNovaAudio(){
  const wasRunning = novaAudioRunning();
  primeNovaAudio();
  if(soundOn && !wasRunning && MT && MT.resync) setTimeout(() => MT && MT.resync && MT.resync(), 60);
}
// 検証用: 効果音をオフラインで書き出して AudioBuffer を返す
export async function renderNovaAudio(tier){
  const S = scheduleNova(tier), sr = 44100, off = new OfflineAudioContext(2, Math.ceil(sr*(S.end+1)), sr);
  const keep = [AC, master, scheduled, MT];
  AC = off; master = off.createGain(); master.gain.value = .9; master.connect(off.destination); scheduled = []; MT = MT || {};
  try { novaSounds(S, 0, 1); return await off.startRendering(); }
  finally { [AC, master, scheduled, MT] = keep; }
}
function stopSounds(){ scheduled.forEach(n => { try { n.stop(); } catch(e){} }); scheduled = []; }

function initGL(canvas){
  const gl = canvas.getContext('webgl2', {antialias:false, alpha:false, depth:false, premultipliedAlpha:false, preserveDrawingBuffer:false, powerPreference:'high-performance'});
  if(!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  const m = { c: canvas, gl, dirty: true };
  MT = m;
  m.nova = metCompile(gl, GLSL_FS_VERT, GLSL_NOVA);
  m.pt = metCompile(gl, GLSL_PT_V, GLSL_PT_F);
  m.card = metCompile(gl, GLSL_CARD_V, GLSL_CARD_F);
  m.text = metCompile(gl, GLSL_CARD_V, GLSL_TEXT_F);
  m.bright = metCompile(gl, GLSL_FS_VERT, GLSL_BRIGHT);
  m.blur = metCompile(gl, GLSL_FS_VERT, GLSL_BLUR);
  m.comp = metCompile(gl, GLSL_FS_VERT, GLSL_COMP);
  m.fsq = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.fsq); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  m.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5,-.5, .5,-.5, -.5,.5, .5,.5]), gl.STATIC_DRAW);
  m.pbuf = gl.createBuffer();
  m.parts = new Float32Array(7*4000);
  return m;
}
function metTextures(){
  const gl = MT.gl;
  if(!MT.dirty && MT.back) return;
  [MT.back, ...(MT.fronts||[]), ...(MT.titles||[])].forEach(t => t && gl.deleteTexture(t));
  MT.back = metTex(gl, metBackCanvas());
  MT.fronts = [0,1,2,3,4].map(i => metTex(gl, metFrontCanvas(i, i === MT.tier ? MT.art : null)));
  MT.titles = [0,1,2,3,4].map(i => metTex(gl, metTitleCanvas(i)));
  MT.dirty = false;
}

/**
 * @param {HTMLCanvasElement} canvas  表示用キャンバス（CSSで画面いっぱいに置く）
 * @param {{tier:number, cardImage?:string, onDone?:()=>void, doneAfter?:number}} opts
 */
export function createNovaPlayer(canvas, opts){
  const m = initGL(canvas);
  if(!m) return null;
  const tier = Math.max(0, Math.min(4, opts.tier|0));
  seed = (Math.random()*1e9)|0;
  const S = scheduleNova(tier);
  m.tier = tier;
  if(opts.cardImage && /^(data:|https?:|\/)/.test(opts.cardImage)){
    const img = new Image(); img.onload = () => { m.dirty = true; }; img.src = opts.cardImage; m.art = img;
  }
  const onFonts = () => { m.dirty = true; };
  if(document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', onFonts);
  const scales = [Math.min(2, Math.max(1, window.devicePixelRatio || 1)), 1.5, 1.25, 1].filter((v,i,a) => a.indexOf(v) === i && v <= a[0]);
  let si = 0, slow = 0, raf = 0, t0 = 0, last = 0, done = false, lost = false;
  scale = scales[0];
  const doneAt = S.reveal + (opts.doneAfter ?? 2.2);
  const onLost = e => { e.preventDefault(); lost = true; finish(); };
  canvas.addEventListener('webglcontextlost', onLost);
  function finish(){ if(done) return; done = true; opts.onDone && opts.onDone(); }
  function loop(now){
    raf = requestAnimationFrame(loop);
    if(now - last < 15.5) return;
    last = now;
    const t = (now - t0)/1000;
    MT = m; scale = scales[si];
    const a = performance.now();
    try { frameNova(S, t); } catch(e){ console.error(e); finish(); return; }
    const dt = performance.now() - a;
    if(dt > 14) slow++; else slow = Math.max(0, slow-1);
    if(slow > 8 && si < scales.length-1){ si++; slow = 0; }
    if(t >= doneAt) finish();
  }
  return {
    duration: doneAt,
    start(){
      t0 = performance.now(); last = 0;
      m.resync = () => { if(!AC || done) return; stopSounds(); try { const cur = MT; MT = m; novaSounds(S, (performance.now() - t0)/1000, 1); MT = cur; } catch(e){ console.error(e); } };
      if(soundOn && AC){ try { MT = m; novaSounds(S, 0, 1); } catch(e){ console.error(e); } }
      raf = requestAnimationFrame(loop);
    },
    skip(){ stopSounds(); finish(); },
    destroy(){
      cancelAnimationFrame(raf); stopSounds();
      canvas.removeEventListener('webglcontextlost', onLost);
      if(document.fonts && document.fonts.removeEventListener) document.fonts.removeEventListener('loadingdone', onFonts);
      if(!lost){ const ext = m.gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext(); }
      if(MT === m) MT = null;
    },
  };
}
