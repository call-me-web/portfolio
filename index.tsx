import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import emailjs from '@emailjs/browser';
import {
  Terminal,
  Cpu,
  Send,
  Layers,
  X,
  Github,
  Linkedin,
  ExternalLink,
  Zap,
  Globe,
  Mail,
  ArrowRight,
  User,
  Twitter,
  Copy,
  Check,
  Code,
  FileCode,
  Server,
  Box,
  Layout,
  Database,
  Palette
} from 'lucide-react';

// --- WebGL Shader Implementation ---

const VERTEX_SHADER = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  // Simple noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float ratio = u_resolution.x / u_resolution.y;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= ratio;

    vec2 mouse = u_mouse / u_resolution.xy * 2.0 - 1.0;
    mouse.x *= ratio;

    float t = u_time * 0.15;
    
    // Create organic glass-like movement
    float n = snoise(p * 0.8 + t);
    n += 0.5 * snoise(p * 1.5 - t * 0.8);
    
    // Prismatic / Chromatic Aberration logic
    float r = snoise(p * 1.0 + n * 0.1 + t);
    float g = snoise(p * 1.0 + n * 0.11 + t + 0.02);
    float b = snoise(p * 1.0 + n * 0.12 + t + 0.04);
    
    vec3 color = vec3(r, g, b);
    
    // Mix with deep background colors
    vec3 base = vec3(0.02, 0.02, 0.05);
    vec3 cyan = vec3(0.0, 0.6, 0.8) * 0.15;
    vec3 purple = vec3(0.5, 0.0, 0.5) * 0.1;
    
    vec3 finalColor = mix(base, cyan, r);
    finalColor = mix(finalColor, purple, b);
    
    // Add specular highlights (prismatic edges)
    float edge = smoothstep(0.4, 0.5, abs(fract(n * 2.0) - 0.5));
    finalColor += edge * vec3(0.4, 0.8, 1.0) * 0.05;

    // Mouse interactive light
    float dist = length(p - mouse);
    float light = smoothstep(0.8, 0.0, dist);
    finalColor += light * vec3(0.1, 0.2, 0.3);

    // Vignette
    finalColor *= 1.0 - length(p * 0.4);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const WebGLBackground = ({ mousePos }: { mousePos: { x: number, y: number } }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const program = gl.createProgram()!;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAGMENT_SHADER);
    gl.compileShader(fs);

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const posAttrib = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttrib);
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');

    let animationId: number;
    const render = (time: number) => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, time * 0.001);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      // Map mousePos (-1 to 1) to canvas space
      const mx = (mousePos.x + 1) * 0.5 * canvas.width;
      const my = (1 - (mousePos.y + 1) * 0.5) * canvas.height;
      gl.uniform2f(mouseLoc, mx, my);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [mousePos]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60" />;
};

// --- Configuration & Dynamic Data ---

const CONFIG = {
  identity: {
    name: "FAHIM KHAN",
    role: "Creative Engineer & Software Architect",
    email: "fahimkhanh696@gmail.com",
    socials: {
      github: "https://github.com",
      linkedin: "https://linkedin.com",
      twitter: "https://twitter.com"
    }
  },
  stats: {
    startYear: 2022,
    completedProjects: "15+",
    clients: 9
  },
  about: {
    headline: "Building the future, one clean line of code at a time",
    bio: [
      "A developer navigating the AI era with curiosity, discipline, and a builder’s mindset. I work with Python, JavaScript, Django, React, and modern web tools to create applications that are practical, scalable, and user-focused.",
      "I’m continuously sharpening my skills in software development, English communication, and problem-solving—because technology moves fast, and standing still isn’t an option. My goal is simple: build useful things, think clearly, and grow into someone who creates value at scale."
    ]
  },
  projects: [
    {
      id: "p1",
      title: "Prism Core",
      category: "Website",
      desc: "A custom GLSL raymarching engine built for reactive audio visualizations.",
      tech: ["WebGL", "GLSL", "WebAudio"],
      link: "#"
    },
    {
      id: "p2",
      title: "Void Shell",
      category: "App",
      desc: "Holographic dashboard system for real-time sensor data visualization.",
      tech: ["Three.js", "TypeScript", "React"],
      link: "#"
    },
    {
      id: "p3",
      title: "Glass-Cut UI",
      category: "Design",
      desc: "A framework for physically-based UI elements that react to dynamic lighting.",
      tech: ["Tailwind", "GLSL", "Next.js"],
      link: "#"
    },
    {
      id: "p4",
      title: "Aero Engine",
      category: "Website",
      desc: "Browser-based particle system handling 1M+ particles using GPGPU.",
      tech: ["WebGL 2.0", "D3.js", "Svelte"],
      link: "#"
    }
  ],
  stack: [
    "GLSL Shaders", "WebGL / Three.js", "React / Next.js", "TypeScript",
    "GPU Computing", "Tailwind CSS", "Rust / Wasm", "Generative Art"
  ]
};

// --- Decorative Shards Configuration ---

const DECORATIVE_SHARDS = [
  // Top Left
  { x: -180, y: -250, r: 15, d: 0.5, s: 'clip-sharp-1', w: 'w-2 md:w-6', h: 'h-8 md:h-20' },
  { x: -280, y: -150, r: -10, d: 1.2, s: 'clip-shard-1', w: 'w-3 md:w-5', h: 'h-6 md:h-12' },
  { x: -120, y: -350, r: 45, d: 0.8, s: 'clip-sharp-2', w: 'w-2 md:w-3', h: 'h-10 md:h-24' },
  { x: -380, y: -100, r: 20, d: 1.5, s: 'clip-shard-2', w: 'w-4 md:w-8', h: 'h-4 md:h-8' },
  { x: -80, y: -180, r: -45, d: 0.2, s: 'clip-sharp-3', w: 'w-2 md:w-4', h: 'h-8 md:h-16' },
  { x: -250, y: -300, r: 80, d: 1.8, s: 'clip-shard-3', w: 'w-3 md:w-6', h: 'h-5 md:h-10' },

  // Top Right
  { x: 220, y: -200, r: -15, d: 0.6, s: 'clip-shard-1', w: 'w-3 md:w-6', h: 'h-6 md:h-14' },
  { x: 320, y: -280, r: 30, d: 1.3, s: 'clip-sharp-1', w: 'w-2 md:w-4', h: 'h-12 md:h-28' },
  { x: 160, y: -320, r: -20, d: 0.9, s: 'clip-shard-4', w: 'w-4 md:w-8', h: 'h-4 md:h-8' },
  { x: 400, y: -120, r: 60, d: 1.6, s: 'clip-sharp-2', w: 'w-2 md:w-3', h: 'h-8 md:h-16' },
  { x: 100, y: -140, r: 10, d: 0.3, s: 'clip-sharp-3', w: 'w-3 md:w-5', h: 'h-6 md:h-12' },
  { x: 300, y: -50, r: -50, d: 1.1, s: 'clip-shard-2', w: 'w-5 md:w-10', h: 'h-3 md:h-6' },

  // Bottom Left
  { x: -200, y: 200, r: 25, d: 0.7, s: 'clip-sharp-2', w: 'w-3 md:w-6', h: 'h-6 md:h-12' },
  { x: -300, y: 300, r: -30, d: 1.4, s: 'clip-sharp-1', w: 'w-2 md:w-4', h: 'h-10 md:h-22' },
  { x: -140, y: 280, r: 50, d: 1.0, s: 'clip-shard-3', w: 'w-4 md:w-7', h: 'h-5 md:h-10' },
  { x: -420, y: 150, r: -15, d: 1.7, s: 'clip-sharp-3', w: 'w-3 md:w-5', h: 'h-8 md:h-16' },
  { x: -90, y: 350, r: 70, d: 1.3, s: 'clip-shard-4', w: 'w-2 md:w-4', h: 'h-6 md:h-12' },

  // Bottom Right
  { x: 180, y: 250, r: -25, d: 0.6, s: 'clip-sharp-3', w: 'w-3 md:w-6', h: 'h-6 md:h-14' },
  { x: 280, y: 180, r: 40, d: 1.3, s: 'clip-shard-2', w: 'w-4 md:w-8', h: 'h-4 md:h-8' },
  { x: 140, y: 350, r: -50, d: 0.9, s: 'clip-sharp-2', w: 'w-2 md:w-4', h: 'h-12 md:h-24' },
  { x: 380, y: 220, r: 15, d: 1.6, s: 'clip-sharp-1', w: 'w-3 md:w-6', h: 'h-8 md:h-16' },
  { x: 250, y: 380, r: 80, d: 1.5, s: 'clip-shard-1', w: 'w-2 md:w-5', h: 'h-5 md:h-10' },

  // Outer / Far
  { x: 0, y: -420, r: 90, d: 2.0, s: 'clip-sharp-v', w: 'w-1 md:w-2', h: 'h-12 md:h-24' },
  { x: 0, y: 420, r: 90, d: 2.0, s: 'clip-sharp-v', w: 'w-1 md:w-2', h: 'h-12 md:h-24' },
  { x: -480, y: 0, r: 0, d: 2.0, s: 'clip-sharp-h', w: 'w-12 md:w-24', h: 'h-1 md:h-2' },
  { x: 480, y: 0, r: 0, d: 2.0, s: 'clip-sharp-h', w: 'w-12 md:w-24', h: 'h-1 md:h-2' },
];

// --- Types ---
type SectionId = 'home' | 'about' | 'projects' | 'stack' | 'contact';

// --- Components ---

const Background = ({ mousePos }: { mousePos: { x: number, y: number } }) => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020202]">
    <WebGLBackground mousePos={mousePos} />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.08] mix-blend-overlay"></div>
  </div>
);

// --- Layout ---

const RootLayout = ({ children, mousePos }: { children?: React.ReactNode, mousePos: { x: number, y: number } }) => {
  return (
    <div className="min-h-screen text-white font-sans overflow-hidden select-none cursor-default selection:bg-cyan-500/30">
      <Background mousePos={mousePos} />
      <main className="relative z-10 w-full h-screen">
        {children}
      </main>
    </div>
  );
};

// --- Page Content ---

const glassStyle = `
  bg-gradient-to-br from-white/10 via-white/5 to-white/0 
  backdrop-blur-2xl backdrop-saturate-150 
  border border-white/10 border-t-white/20 border-l-white/20 
  shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] 
  ring-1 ring-white/5
`;

const hoverGlassStyle = `
  hover:bg-white/10 
  hover:border-white/30 hover:border-t-white/40
  hover:shadow-[0_20px_50px_-5px_rgba(31,38,135,0.4),0_0_15px_rgba(103,232,249,0.2)] 
  hover:brightness-110
`;

interface ShardProps {
  id: SectionId;
  className: string;
  children?: React.ReactNode;
  delay?: number;
  baseTransform?: string;
  mousePos: { x: number; y: number };
  activeSection: SectionId | null;
  setActiveSection: (id: SectionId) => void;
  closeSection: () => void;
}

interface DecorativeShardProps {
  className: string;
  delay?: number;
  baseTransform?: string;
  mousePos: { x: number; y: number };
  activeSection: SectionId | null;
}

const DecorativeShard = ({
  className,
  delay = 0,
  baseTransform = "",
  mousePos,
  activeSection
}: DecorativeShardProps) => {
  const pStrength = 15;
  const rx = mousePos.y * pStrength;
  const ry = mousePos.x * -pStrength;

  const isHidden = activeSection !== null;

  return (
    <div
      className={`
        absolute pointer-events-none will-change-transform
        ${isHidden ? 'opacity-0 scale-75 blur-md' : 'opacity-30 mix-blend-soft-light'}
        ${className}
        ${glassStyle}
      `}
      style={{
        transform: `${baseTransform} rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${delay * 10}px)`,
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 5
      }}
    />
  );
};

const Shard = ({
  id,
  className,
  children,
  delay = 0,
  baseTransform = "",
  mousePos,
  activeSection,
  setActiveSection,
  closeSection
}: ShardProps) => {
  const pStrength = 25;
  const rx = mousePos.y * pStrength;
  const ry = mousePos.x * -pStrength;

  const isActive = activeSection === id;
  const isHidden = activeSection !== null && activeSection !== id;
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [formState, setFormState] = useState({ name: '', message: '' });

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Reset states when section closes
  useEffect(() => {
    if (!isActive) {
      setCopied(false);
      setFormState({ name: '', message: '' });
      setStatus('idle');
      setActiveFilter('All');
    }
  }, [isActive]);

  const copyEmail = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(CONFIG.identity.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.message) return;

    setStatus('sending');

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          from_name: formState.name,
          message: formState.message,
          reply_to: CONFIG.identity.email,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
      setFormState({ name: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error('EmailJS Error:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const categories = ['All', ...Array.from(new Set(CONFIG.projects.map(p => p.category)))];
  const filteredProjects = activeFilter === 'All'
    ? CONFIG.projects
    : CONFIG.projects.filter(p => p.category === activeFilter);

  const currentYear = new Date().getFullYear();
  const yearsExp = currentYear - CONFIG.stats.startYear;

  const transitionStyle = {
    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: isActive ? '0ms' : `${delay * 30}ms`
  };

  return (
    <div
      onClick={() => !activeSection && setActiveSection(id)}
      className={`
        absolute cursor-pointer group will-change-transform
        ${isHidden ? 'opacity-0 scale-75 pointer-events-none blur-md' : 'opacity-100 scale-100'}
        ${isActive ? 'z-50 !transform-none inset-0 md:inset-8 w-auto h-auto m-0 cursor-default' : className}
        ${!isActive && !isHidden ? hoverGlassStyle : ''}
        ${glassStyle}
      `}
      style={{
        transform: isActive
          ? 'translate3d(0,0,0) rotateX(0) rotateY(0)'
          : `${baseTransform} rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${delay * 15}px)`,
        clipPath: isActive ? 'none' : undefined,
        ...transitionStyle
      }}
    >
      {!isActive && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      )}

      <div className={`
        relative w-full h-full flex flex-col items-center justify-center p-6 text-center 
        transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}
      `}>
        {!isActive && (
          <div className="flex flex-col items-center gap-4">
            <div className="transition-transform duration-500 group-hover:scale-110 group-hover:text-cyan-200">
              {children}
            </div>
            <span className="text-[10px] font-bold tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 uppercase text-cyan-200">
              {id}
            </span>
          </div>
        )}

        {isActive && (
          <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 shrink-0">
              <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-white/5 border border-white/10 text-cyan-200">
                  {children}
                </div>
                <h2 className="text-4xl md:text-5xl font-[Syncopate] font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40 uppercase tracking-tighter">
                  {id}
                </h2>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); closeSection(); }}
                className="group/close p-3 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
              >
                <X className="w-6 h-6 text-gray-400 group-hover/close:text-white transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">

              {id === 'about' && (
                <div className="grid md:grid-cols-2 gap-12 items-start pb-12">
                  <div className="space-y-6 text-lg text-gray-300 leading-relaxed text-left">
                    <p className="text-3xl font-light text-white mb-6">
                      {CONFIG.about.headline.split('&').map((part, i) => (
                        <span key={i}>
                          {part} {i === 0 && <span className="text-cyan-400">&</span>}<br />
                        </span>
                      ))}
                    </p>
                    {CONFIG.about.bio.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}

                    <div className="pt-8 flex gap-8">
                      <div>
                        <div className="text-4xl font-bold text-white mb-1">{yearsExp}</div>
                        <div className="text-xs uppercase tracking-widest text-cyan-400/80">Years Exp</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-white mb-1">{CONFIG.stats.completedProjects}</div>
                        <div className="text-xs uppercase tracking-widest text-cyan-400/80">Projects</div>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-[500px] w-full max-w-[400px] mx-auto overflow-hidden border border-white/10 bg-gray-800 bg-gradient-to-br from-white/5 to-transparent group/profile">
                    <img
                      src={new URL('./image/portfolio.jpeg', import.meta.url).href}
                      alt="Profile"
                      className="w-full h-[500px] object-cover transition-transform duration-500 group-hover/profile:scale-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </div>
              )}

              {id === 'projects' && (
                <div className="flex flex-col h-full">
                  <div className="flex flex-wrap gap-4 mb-8">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={(e) => { e.stopPropagation(); setActiveFilter(cat); }}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 border ${activeFilter === cat ? 'bg-cyan-500/20 border-cyan-500/50 text-white' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                    {filteredProjects.map((p) => (
                      <div key={p.id} className="group/card relative flex flex-col p-8 bg-black/20 border border-white/10 hover:border-cyan-500/30 hover:bg-white/5 transition-all duration-500 overflow-hidden text-left">
                        <div className="mb-2">
                          <span className="text-[10px] text-cyan-500/80 font-mono border border-cyan-500/20 px-2 py-1 uppercase">{p.category}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3 group-hover/card:text-cyan-200 transition-colors">{p.title}</h3>
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">{p.desc}</p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {p.tech.map(t => (
                            <span key={t} className="text-[10px] font-mono uppercase px-3 py-1.5 bg-white/5 text-cyan-100/60 border border-white/5 group-hover:border-cyan-500/20">{t}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {id === 'stack' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {CONFIG.stack.map((skill, i) => {
                    let Icon = Zap;
                    if (skill.includes('Shader') || skill.includes('WebGL')) Icon = Cpu;
                    else if (skill.includes('React')) Icon = Code;
                    else if (skill.includes('Design')) Icon = Palette;

                    return (
                      <div key={i} className="flex flex-col items-center justify-center gap-3 p-6 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all duration-300 group/skill">
                        <Icon className="w-8 h-8 text-gray-500 group-hover:text-cyan-400" />
                        <span className="font-mono text-sm font-medium text-gray-300 group-hover:text-white">{skill}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {id === 'contact' && (
                <div className="flex flex-col md:flex-row gap-12 h-full pb-12">
                  <div className="flex-1 flex flex-col justify-center text-left space-y-8">
                    <h3 className="text-4xl md:text-5xl font-bold leading-tight text-white">
                      Init Signal <br />
                      <span className="text-cyan-400">Collaborate</span>
                    </h3>
                    <p className="text-gray-400 text-lg max-w-md">Reach out for project inquiries or to talk about shader engineering.</p>
                    <button onClick={copyEmail} className="group flex items-center gap-4 w-fit px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                      <Mail className="w-5 h-5 text-cyan-400" />
                      <span className="font-mono text-sm text-gray-300">{CONFIG.identity.email}</span>
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/10 p-8 flex flex-col justify-center">
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      <input
                        type="text"
                        placeholder="NAME"
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        disabled={status === 'sending'}
                        className="w-full bg-black/20 border border-white/10 p-4 text-white focus:border-cyan-500/50 outline-none disabled:opacity-50"
                      />
                      <textarea
                        placeholder="MESSAGE..."
                        rows={4}
                        value={formState.message}
                        onChange={(e) => setFormState(prev => ({ ...prev, message: e.target.value }))}
                        disabled={status === 'sending'}
                        className="w-full bg-black/20 border border-white/10 p-4 text-white focus:border-cyan-500/50 outline-none resize-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={status === 'sending'}
                        className={`w-full py-4 font-bold transition-colors ${status === 'success' ? 'bg-green-500 text-white' :
                          status === 'error' ? 'bg-red-500 text-white' :
                            'bg-white text-black hover:bg-cyan-400'
                          }`}
                      >
                        {status === 'sending' ? 'SENDING...' :
                          status === 'success' ? 'PACKET SENT' :
                            status === 'error' ? 'FAILED - TRY AGAIN' :
                              'SEND PACKET'}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Page = () => {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (activeSection) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX / width) * 2 - 1;
    const y = (clientY / height) * 2 - 1;
    setMousePos({ x, y });
  };

  const closeSection = () => setActiveSection(null);

  return (
    <RootLayout mousePos={mousePos}>
      <div
        onMouseMove={handleMouseMove}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
      >
        <div className={`relative w-full h-full max-w-6xl max-h-[800px] flex items-center justify-center perspective-[1200px] ${activeSection ? 'z-50' : 'z-10'}`}>

          {!activeSection && (
            <div className="absolute top-10 left-6 md:top-20 md:left-20 pointer-events-none z-0 transition-opacity duration-700">
              <h1 className="text-5xl md:text-[10rem] font-[Syncopate] font-bold text-white/[0.03] leading-none select-none">
                PORT<br />FOLIO
              </h1>
            </div>
          )}

          <div
            className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeSection ? 'opacity-0 scale-90 blur-lg pointer-events-none translate-y-[-50px]' : 'opacity-100 scale-100 blur-0'}`}
            style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)` }}
          >
            <div className="text-center z-10 p-12 relative group cursor-default">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-[50px] group-hover:bg-cyan-400/30 transition-colors duration-700"></div>
              <h2 className="relative text-5xl md:text-8xl font-['Italiana'] tracking-[0.2em] mb-4 text-white/30 drop-shadow-2xl">
                {CONFIG.identity.name.split(' ').map((n, i) => <span key={i} className="block">{n}</span>)}
              </h2>
              <div className="flex items-center justify-center gap-4 opacity-60">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-cyan-300/50"></div>
                <p className="text-cyan-100 font-mono text-xs tracking-[0.4em] uppercase">{CONFIG.identity.role}</p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-cyan-300/50"></div>
              </div>
            </div>
          </div>

          {/* --- DECORATIVE SHARDS --- */}
          {DECORATIVE_SHARDS.map((shard, i) => (
            <DecorativeShard
              key={i}
              delay={shard.d}
              baseTransform={isMobile
                ? `translate(${shard.x * 0.4}px, ${shard.y * 0.5}px) rotate(${shard.r}deg)`
                : `translate(${shard.x}px, ${shard.y}px) rotate(${shard.r}deg)`}
              className={`${shard.w} ${shard.h} ${shard.s}`}
              mousePos={mousePos}
              activeSection={activeSection}
            />
          ))}

          {/* --- CLICKABLE SHARDS --- */}
          <Shard
            id="about"
            delay={1}
            baseTransform={isMobile ? "translate(-80px, -100px) rotate(-4deg)" : "translate(-180px, -140px) rotate(-8deg)"}
            className="w-28 h-36 md:w-40 md:h-52 clip-polygon-1"
            mousePos={mousePos}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <User className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>

          <Shard
            id="projects"
            delay={2}
            baseTransform={isMobile ? "translate(80px, -70px) rotate(4deg)" : "translate(200px, -100px) rotate(6deg)"}
            className="w-32 h-32 md:w-48 md:h-48 clip-polygon-2"
            mousePos={mousePos}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <Layers className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>

          <Shard
            id="stack"
            delay={3}
            baseTransform={isMobile ? "translate(-70px, 90px) rotate(8deg)" : "translate(-140px, 180px) rotate(12deg)"}
            className="w-24 h-24 md:w-36 md:h-36 clip-polygon-3"
            mousePos={mousePos}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <Cpu className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>

          <Shard
            id="contact"
            delay={4}
            baseTransform={isMobile ? "translate(70px, 110px) rotate(-4deg)" : "translate(180px, 150px) rotate(-6deg)"}
            className="w-28 h-40 md:w-40 md:h-52 clip-polygon-4"
            mousePos={mousePos}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <Send className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>
        </div>

        <style>{`
          .clip-polygon-1 { clip-path: polygon(10% 0, 100% 0, 100% 90%, 0% 100%); }
          .clip-polygon-2 { clip-path: polygon(0 0, 100% 10%, 100% 100%, 15% 100%); }
          .clip-polygon-3 { clip-path: polygon(20% 0, 100% 0, 80% 100%, 0% 100%); }
          .clip-polygon-4 { clip-path: polygon(0 0, 80% 0, 100% 100%, 20% 100%); }
          
          .clip-shard-1 { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
          .clip-shard-2 { clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%); }
          .clip-shard-3 { clip-path: polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%); }
          .clip-shard-4 { clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }
          
          .clip-sharp-1 { clip-path: polygon(50% 0, 100% 100%, 0 80%); }
          .clip-sharp-2 { clip-path: polygon(0 0, 100% 20%, 50% 100%); }
          .clip-sharp-3 { clip-path: polygon(20% 0, 100% 0, 80% 100%, 0% 80%); }
          .clip-sharp-v { clip-path: polygon(40% 0, 60% 0, 50% 100%); }
          .clip-sharp-h { clip-path: polygon(0 40%, 100% 50%, 0 60%); }

          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
        `}</style>
      </div>
    </RootLayout>
  );
};

// --- Entry Point ---

const App = () => {
  return <Page />;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);