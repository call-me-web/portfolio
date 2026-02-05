import React, { useState, useRef, MouseEvent, useEffect, useCallback, memo } from 'react';
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

const WebGLBackground = ({ mouseRef }: { mouseRef: React.RefObject<{ x: number, y: number }> }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false });
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
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.uniform1f(timeLoc, time * 0.001);
      gl.uniform2f(resLoc, canvas.width, canvas.height);

      const mouse = mouseRef.current || { x: 0, y: 0 };
      const mx = (mouse.x + 1) * 0.5 * canvas.width;
      const my = (1 - (mouse.y + 1) * 0.5) * canvas.height;
      gl.uniform2f(mouseLoc, mx, my);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, []); // Empty dependency array means this only runs once

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-60" />;
};

// --- Configuration & Dynamic Data ---

const CONFIG = {
  identity: {
    name: "FAHIM KHAN",
    role: "Creative Engineer & Software Architect",
    email: "fahimkhanh696@gmail.com",
    socials: {
      github: "https://github.com/call-me-web",
      linkedin: "https://www.linkedin.com/in/fahim-khan-132525292",
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
      id: "p2",
      title: "News Site",
      category: "MVP",
      desc: "A modern website with a classic look, where creative people share memes, rumors, and original art.",
      tech: ["Next.js", "TypeScript", "React"],
      link: "https://news.gujab9.workers.dev/"
    },
    {
      id: "p3",
      title: "Glass-Cut UI",
      category: "Design",
      desc: "A framework for physically-based UI elements that react to dynamic lighting.",
      tech: ["Tailwind", "GLSL", "Next.js"],
      link: "https://call-me-web.github.io/portfolio/"
    },
    // {
    //   id: "p1",
    //   title: "Prism Core",
    //   category: "Website",
    //   desc: "A custom GLSL raymarching engine built for reactive audio visualizations.",
    //   tech: ["WebGL", "GLSL", "WebAudio"],
    //   link: "#"
    // },
    // {
    //   id: "p4",
    //   title: "Aero Engine",
    //   category: "Website",
    //   desc: "Browser-based particle system handling 1M+ particles using GPGPU.",
    //   tech: ["WebGL 2.0", "D3.js", "Svelte"],
    //   link: "#"
    // }
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

const Background = memo(({ mouseRef }: { mouseRef: React.RefObject<{ x: number, y: number }> }) => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020202]">
    <WebGLBackground mouseRef={mouseRef} />
    <div className="absolute inset-0 bg-[url('./assets/noise.svg')] opacity-[0.08] mix-blend-overlay"></div>
  </div>
));

// --- Layout ---

const RootLayout = ({ children, mouseRef }: { children?: React.ReactNode, mouseRef: React.RefObject<{ x: number, y: number }> }) => {
  return (
    <div className="min-h-screen text-white font-sans overflow-hidden select-none cursor-default selection:bg-cyan-500/30">
      <Background mouseRef={mouseRef} />
      <main className="relative z-10 w-full h-screen">
        {children}
      </main>
    </div>
  );
};

// --- Page Content ---

const glassStyle = `
  bg-transparent
  border border-white/10 border-t-white/20 border-l-white/20
`;

const decorativeGlassStyle = `
  bg-gradient-to-br from-white/20 via-white/5 to-transparent 
  backdrop-blur-3xl backdrop-saturate-[2] 
  border border-white/15 border-t-white/30 border-l-white/30 
  shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] 
  ring-1 ring-white/20
`;

const hoverGlassStyle = `
  hover:bg-white/[0.02] 
  hover:border-white/20 hover:border-t-white/30
  hover:shadow-none
`;

interface ShardProps {
  id: SectionId;
  className: string;
  children?: React.ReactNode;
  delay?: number;
  baseTransform?: string;
  activeSection: SectionId | null;
  setActiveSection: (id: SectionId) => void;
  closeSection: () => void;
}

interface DecorativeShardProps {
  className: string;
  delay?: number;
  baseTransform?: string;
  activeSection: SectionId | null;
}

const DecorativeShard = memo(({
  className,
  delay = 0,
  baseTransform = "",
  activeSection
}: DecorativeShardProps) => {
  const isHidden = activeSection !== null;

  return (
    <div
      className={`
        absolute pointer-events-none will-change-transform
        ${isHidden ? 'opacity-0 scale-75 blur-md' : 'opacity-80 saturate-[2.5]'}
        ${className}
        ${decorativeGlassStyle}
        border-white/40 border-[1px]
      `}
      style={{
        transform: `
          ${baseTransform} 
          translate3d(calc(var(--mx) * ${delay * 40}px), calc(var(--my) * ${delay * 40}px), ${delay * 20}px)
          rotateX(calc(var(--my) * 20deg)) 
          rotateY(calc(var(--mx) * -20deg))
        `,
        transition: isHidden
          ? 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 5
      }}
    >
      {/* Prismatic edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-purple-300/30 to-transparent" />
    </div>
  );
});

const Shard = ({
  id,
  className,
  children,
  delay = 0,
  baseTransform = "",
  activeSection,
  setActiveSection,
  closeSection
}: ShardProps) => {
  const isActive = activeSection === id;
  const isHidden = activeSection !== null && activeSection !== id;
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  // Reset states when section closes
  useEffect(() => {
    if (!isActive) {
      setCopied(false);
      setFormState({ name: '', email: '', message: '' });
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
    if (!formState.name || !formState.email || !formState.message) return;

    setStatus('sending');

    const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (!emailjsPublicKey) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
      return;
    }

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        {
          from_name: formState.name,
          message: formState.message,
          reply_to: formState.email,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
      setFormState({ name: '', email: '', message: '' });
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
        ${isActive ? 'z-50 !transform-none inset-x-0 inset-y-0 md:inset-8 w-auto h-auto m-0 cursor-default' : className}
        ${!isActive && !isHidden ? hoverGlassStyle : ''}
        ${glassStyle}
      `}
      style={{
        transform: isActive
          ? 'translate3d(0,0,0) rotateX(0) rotateY(0)'
          : `${baseTransform} rotateX(calc(var(--my) * 25deg)) rotateY(calc(var(--mx) * -25deg)) translateZ(${delay * 15}px)`,
        clipPath: isActive ? 'none' : undefined,
        ...transitionStyle
      }}
    >
      {!isActive && (
        <>
          {/* Prismatic edge highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-purple-300/10 to-transparent pointer-events-none" />
        </>
      )}

      {/* Premium Window Accents for Active State */}
      {isActive && (
        <>
          <div className="absolute top-0 left-0 w-12 h-px bg-gradient-to-r from-cyan-400 to-transparent z-10" />
          <div className="absolute top-0 left-0 w-px h-12 bg-gradient-to-b from-cyan-400 to-transparent z-10" />
          <div className="absolute bottom-0 right-0 w-12 h-px bg-gradient-to-l from-cyan-400 to-transparent z-10" />
          <div className="absolute bottom-0 right-0 w-px h-12 bg-gradient-to-t from-cyan-400 to-transparent z-10" />
          <div className="absolute top-0 right-0 p-1 flex gap-1 z-10 pointer-events-none">
            <div className="w-1 h-1 bg-white/20" />
            <div className="w-1 h-1 bg-white/40" />
            <div className="w-1 h-1 bg-cyan-400" />
          </div>
        </>
      )}

      <div className={`
        relative w-full h-full flex flex-col items-center justify-center p-2 text-center 
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
          <div className="w-full h-full flex flex-col pt-4 md:pt-6 px-0 md:px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.16,1,0.3,1)">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3 shrink-0 px-3 md:px-4">
              <div className="flex items-center gap-2 md:gap-6 text-left">
                <div className="relative">
                  <div className="absolute -inset-1 bg-cyan-400/20 blur-md rounded-full animate-pulse" />
                  <div className="relative p-1.5 md:p-3.5 bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                    {children}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
                    <span className="text-[7px] md:text-[10px] font-mono tracking-[0.2em] md:tracking-[0.3em] text-cyan-400/60 uppercase truncate">System Active // {id}</span>
                  </div>
                  <h2 className="text-xl md:text-5xl font-[Syncopate] font-bold text-white uppercase tracking-[-0.05em] leading-none">
                    {id}
                  </h2>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); closeSection(); }}
                className="group/close relative p-1.5 md:p-4 hover:bg-white/5 transition-all duration-300 border border-white/5 hover:border-white/20 shrink-0"
              >
                <div className="absolute inset-0 bg-cyan-400/0 group-hover/close:bg-cyan-400/5 transition-colors" />
                <X className="w-4 h-4 md:w-6 md:h-6 text-gray-500 group-hover/close:text-white group-hover/close:rotate-90 transition-all duration-500 ease-out" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-8 custom-scrollbar space-y-8">

              {id === 'about' && (
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start pb-12">
                  <div className="space-y-6 text-left">
                    <p className="text-lg md:text-3xl font-light text-white mb-4 leading-snug">
                      {CONFIG.about.headline.split('&').map((part, i) => (
                        <React.Fragment key={i}>
                          {part} {i === 0 && <span className="text-cyan-400">&</span>}<br />
                        </React.Fragment>
                      ))}
                    </p>
                    {CONFIG.about.bio.map((paragraph, i) => (
                      <p key={i} className="text-sm md:text-lg text-gray-300 leading-relaxed">{paragraph}</p>
                    ))}

                    <div className="pt-4 flex gap-6">
                      <div>
                        <div className="text-2xl md:text-4xl font-bold text-white mb-0.5">{yearsExp}</div>
                        <div className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-400/80">Years Exp</div>
                      </div>
                      <div>
                        <div className="text-2xl md:text-4xl font-bold text-white mb-0.5">{CONFIG.stats.completedProjects}</div>
                        <div className="text-[10px] md:text-xs uppercase tracking-widest text-cyan-400/80">Projects</div>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-[530px] md:h-[450px] w-full md:max-w-[400px] md:mx-auto overflow-hidden border border-white/10 bg-gray-800 bg-gradient-to-br from-white/5 to-transparent group/profile">
                    <img
                      src={new URL('./assets/portfolio.webp', import.meta.url).href}
                      alt="Profile"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/profile:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    {/* Hover Layer - Updated for Mobile Visibility */}
                    <div className="absolute inset-0 bg-cyan-900/40 md:bg-cyan-900/20 md:opacity-0 group-hover/profile:opacity-100 transition-all duration-700 flex flex-col justify-between p-6 overflow-hidden">
                      <div className="flex justify-between items-start pointer-events-none">
                        <div className="w-4 h-4 border-t border-l border-cyan-400/50 group-hover/profile:border-cyan-400 transition-colors duration-500"></div>
                        <div className="w-4 h-4 border-t border-r border-cyan-400/50 group-hover/profile:border-cyan-400 transition-colors duration-500"></div>
                      </div>

                      <div className="text-center pointer-events-none transform md:translate-y-4 group-hover/profile:translate-y-0 transition-transform duration-500">
                        <div className="text-[10px] font-mono text-cyan-400 mb-1 tracking-[0.5em] animate-pulse">IDENTITY_CONFIRMED</div>
                        <div className="text-xs font-['Syncopate'] text-white tracking-widest uppercase">FAHIM KHAN</div>
                      </div>

                      <div className="flex justify-between items-end pointer-events-none">
                        <div className="w-4 h-4 border-b border-l border-cyan-400/50 group-hover/profile:border-cyan-400 transition-colors duration-500"></div>
                        <div className="text-[8px] font-mono text-cyan-400/40 tracking-[0.2em] mb-1">CORE_ARCHITECT_v2.0</div>
                        <div className="w-4 h-4 border-b border-r border-cyan-400/50 group-hover/profile:border-cyan-400 transition-colors duration-500"></div>
                      </div>

                      {/* Scanline effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent h-12 -translate-y-full group-hover/profile:animate-scanline pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {id === 'projects' && (
                <div className="flex flex-col h-full">
                  <div className="flex flex-wrap gap-2 md:gap-4 mb-6">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={(e) => { e.stopPropagation(); setActiveFilter(cat); }}
                        className={`px-3 py-1.5 text-[9px] sm:text-xs font-bold uppercase tracking-widest transition-all duration-300 border ${activeFilter === cat ? 'bg-cyan-500/20 border-cyan-500/50 text-white' : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-8">
                    {filteredProjects.map((p) => (
                      <a
                        key={p.id}
                        href={p.link !== '#' ? p.link : undefined}
                        target={p.link !== '#' ? "_blank" : undefined}
                        rel={p.link !== '#' ? "noopener noreferrer" : undefined}
                        onClick={(e) => p.link === '#' && e.preventDefault()}
                        className={`group/card relative flex flex-col p-5 md:p-8 bg-black/20 border border-white/10 hover:border-cyan-500/30 hover:bg-white/5 transition-all duration-500 overflow-hidden text-left ${p.link !== '#' ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[8px] md:text-[10px] text-cyan-500/80 font-mono border border-cyan-500/20 px-1.5 py-0.5 uppercase">{p.category}</span>
                          {p.link !== '#' && <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-white/20 group-hover/card:text-cyan-400 transition-colors" />}
                        </div>
                        <h3 className="text-lg md:text-2xl font-bold text-white mb-2 group-hover/card:text-cyan-200 transition-colors">{p.title}</h3>
                        <p className="text-gray-400 mb-4 text-xs md:text-sm leading-relaxed">{p.desc}</p>
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {p.tech.map(t => (
                            <span key={t} className="text-[8px] md:text-[10px] font-mono uppercase px-2 py-1 bg-white/5 text-cyan-100/60 border border-white/5 group-hover:border-cyan-500/20">{t}</span>
                          ))}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {id === 'stack' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12">
                  {CONFIG.stack.map((skill, i) => {
                    let Icon = Zap;
                    if (skill.includes('Shader')) Icon = Zap;
                    else if (skill.includes('WebGL')) Icon = Box;
                    else if (skill.includes('React')) Icon = Layout;
                    else if (skill.includes('TypeScript')) Icon = FileCode;
                    else if (skill.includes('GPU')) Icon = Cpu;
                    else if (skill.includes('Tailwind')) Icon = Palette;
                    else if (skill.includes('Rust')) Icon = Terminal;
                    else if (skill.includes('Art')) Icon = Layers;

                    return (
                      <div key={i} className="group/skill relative flex flex-col items-center justify-center gap-6 p-10 bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-500 overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] -rotate-45 translate-x-8 -translate-y-8 group-hover/skill:bg-cyan-500/20 transition-colors" />

                        <div className="relative">
                          <div className="absolute inset-0 bg-cyan-400/20 blur-xl scale-0 group-hover/skill:scale-150 transition-transform duration-500 rounded-full" />
                          <Icon className="relative w-10 h-10 text-gray-500 group-hover/skill:text-cyan-400 group-hover/skill:scale-110 transition-all duration-500" />
                        </div>

                        <div className="space-y-1 text-center">
                          <div className="text-[9px] font-mono text-cyan-400/40 tracking-[0.3em] uppercase mb-1">Module_{i.toString().padStart(2, '0')}</div>
                          <span className="font-mono text-sm font-bold text-gray-300 group-hover/skill:text-white transition-colors block leading-tight">
                            {skill.split(' / ').map((part, idx) => (
                              <React.Fragment key={idx}>
                                {part}
                                {idx < skill.split(' / ').length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </span>
                        </div>

                        {/* Corner Accents */}
                        <div className="absolute bottom-2 right-2 w-1 h-1 bg-white/10 group-hover/skill:bg-cyan-400 transition-colors" />
                        <div className="absolute bottom-2 right-4 w-1 h-1 bg-white/5 group-hover/skill:bg-cyan-400/30 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              )}

              {id === 'contact' && (
                <div className="flex flex-col lg:flex-row gap-16 h-full pb-12 items-center">
                  <div className="flex-1 flex flex-col justify-center text-left space-y-10 w-full">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-[1px] bg-cyan-500/50"></span>
                        <span className="text-[10px] font-mono tracking-[0.5em] text-cyan-400 uppercase">Communication Protocol</span>
                      </div>
                      <h3 className="text-5xl md:text-7xl font-bold leading-[0.9] text-white tracking-tighter">
                        TRANSMIT <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">SIGNAL</span>
                      </h3>
                      <p className="text-gray-400 text-lg max-w-md font-light leading-relaxed">
                        Ready to build something extraordinary? Send a secure transmission or find me on the grid.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <button onClick={copyEmail} className="group relative flex items-center gap-6 p-1 pr-6 bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all duration-500 rounded-full overflow-hidden">
                        <div className="p-4 bg-cyan-500/10 rounded-full group-hover:bg-cyan-500/20 transition-colors">
                          <Mail className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest leading-none mb-1">Direct Access</span>
                          <span className="font-mono text-sm text-gray-200">{CONFIG.identity.email}</span>
                        </div>
                        <div className="ml-auto">
                          {copied ? (
                            <Check className="w-5 h-5 text-green-400 animate-in zoom-in duration-300" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-6 pl-4">
                        <a href={CONFIG.identity.socials.github} target="_blank" rel="noopener noreferrer" className="group p-2 text-gray-500 hover:text-white transition-colors">
                          <Github className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </a>
                        <a href={CONFIG.identity.socials.linkedin} target="_blank" rel="noopener noreferrer" className="group p-2 text-gray-500 hover:text-white transition-colors">
                          <Linkedin className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </a>
                        <a href={CONFIG.identity.socials.twitter} target="_blank" rel="noopener noreferrer" className="group p-2 text-gray-500 hover:text-white transition-colors">
                          <Twitter className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </a>
                        <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Available for Hire</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full max-w-xl">
                    <div className="relative p-1 bg-gradient-to-br from-white/10 to-transparent">
                      <div className="bg-[#050505] p-6 md:p-10 h-[450px] md:h-[500px] flex flex-col relative overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2 text-cyan-400">
                            <Terminal className="w-4 h-4" />
                            <span className="text-xs font-mono tracking-widest uppercase">Secure Transmission</span>
                          </div>
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                          </div>
                        </div>

                        {/* Form */}
                        {status === 'success' ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                              <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h4 className="text-2xl text-white font-bold">Transmission Sent</h4>
                            <p className="text-gray-400 text-sm max-w-xs">Your signal has been encrypted and delivered successfully.</p>
                            <button
                              onClick={() => setStatus('idle')}
                              className="mt-6 px-6 py-2 bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 uppercase tracking-widest hover:bg-white/10 transition-colors"
                            >
                              Send Another
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleFormSubmit} className="flex flex-col gap-6 h-full">
                            <div className="space-y-4">
                              <div className="group border-b border-white/10 focus-within:border-cyan-400/50 transition-colors">
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Identity</label>
                                <input
                                  type="text"
                                  value={formState.name}
                                  onChange={e => setFormState(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="ENTER YOUR NAME"
                                  required
                                  className="w-full bg-transparent p-2 text-white placeholder-white/20 outline-none font-mono text-sm"
                                />
                              </div>
                              <div className="group border-b border-white/10 focus-within:border-cyan-400/50 transition-colors">
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Frequency (Email)</label>
                                <input
                                  type="email"
                                  value={formState.email}
                                  onChange={e => setFormState(prev => ({ ...prev, email: e.target.value }))}
                                  placeholder="ENTER YOUR EMAIL"
                                  required
                                  className="w-full bg-transparent p-2 text-white placeholder-white/20 outline-none font-mono text-sm"
                                />
                              </div>
                              <div className="group border-b border-white/10 focus-within:border-cyan-400/50 transition-colors h-32">
                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Signal</label>
                                <textarea
                                  value={formState.message}
                                  onChange={e => setFormState(prev => ({ ...prev, message: e.target.value }))}
                                  placeholder="ENTER YOUR MESSAGE..."
                                  required
                                  className="w-full h-full bg-transparent p-2 text-white placeholder-white/20 outline-none font-mono text-sm resize-none custom-scrollbar"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={status === 'sending'}
                              className="mt-auto w-full py-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs tracking-[0.2em] uppercase hover:bg-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                              {status === 'sending' ? (
                                <>
                                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                                  Encrypting...
                                </>
                              ) : (
                                <>
                                  Transmit Signal
                                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                              )}
                            </button>
                            {status === 'error' && (
                              <div className="text-red-400 text-xs font-mono text-center mt-2">
                                Connection Protocol Failed. Please retry.
                              </div>
                            )}
                          </form>
                        )}

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[60px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 blur-[60px] pointer-events-none" />
                      </div>
                    </div>
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
  const mouseRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (activeSection) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX / width) * 2 - 1;
    const y = (clientY / height) * 2 - 1;

    mouseRef.current = { x, y };

    if (containerRef.current) {
      containerRef.current.style.setProperty('--mx', x.toString());
      containerRef.current.style.setProperty('--my', y.toString());
    }
  }, [activeSection]);

  const closeSection = useCallback(() => setActiveSection(null), []);

  return (
    <RootLayout mouseRef={mouseRef}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        style={{ '--mx': '0', '--my': '0' } as any}
      >
        {!activeSection && (
          <div className="absolute top-4 left-4 md:top-8 md:left-8 pointer-events-none z-0 transition-opacity duration-700">
            <h1 className="text-5xl md:text-[10rem] font-[Syncopate] font-bold text-white/[0.03] leading-none select-none uppercase">
              PORT<br />FOLIO
            </h1>
          </div>
        )}

        <div className={`relative w-full h-full max-w-6xl max-h-[800px] flex items-center justify-center perspective-[1200px] ${activeSection ? 'z-50' : 'z-10'}`}>


          <div
            className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${activeSection ? 'opacity-0 scale-90 blur-lg pointer-events-none translate-y-[-50px]' : 'opacity-100 scale-100 blur-0'}`}
            style={{ transform: `translate(calc(var(--mx) * -15px), calc(var(--my) * -15px))` }}
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
                ? `translate(${shard.x * 0.3}px, ${shard.y * 0.4}px) rotate(${shard.r}deg)`
                : `translate(${shard.x}px, ${shard.y}px) rotate(${shard.r}deg)`}
              className={`${shard.w} ${shard.h} ${shard.s}`}
              activeSection={activeSection}
            />
          ))}

          {/* --- CLICKABLE SHARDS --- */}
          <Shard
            id="about"
            delay={1}
            baseTransform={isMobile ? "translate(-60px, -120px) rotate(-4deg)" : "translate(-180px, -140px) rotate(-8deg)"}
            className="w-24 h-32 md:w-40 md:h-52 clip-polygon-1"
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <User className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>

          <Shard
            id="projects"
            delay={2}
            baseTransform={isMobile ? "translate(60px, -80px) rotate(4deg)" : "translate(200px, -100px) rotate(6deg)"}
            className="w-28 h-28 md:w-48 md:h-48 clip-polygon-2"
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <Layers className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>

          <Shard
            id="stack"
            delay={3}
            baseTransform={isMobile ? "translate(-60px, 80px) rotate(8deg)" : "translate(-140px, 180px) rotate(12deg)"}
            className="w-20 h-20 md:w-36 md:h-36 clip-polygon-3"
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            closeSection={closeSection}
          >
            <Cpu className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </Shard>

          <Shard
            id="contact"
            delay={4}
            baseTransform={isMobile ? "translate(60px, 120px) rotate(-4deg)" : "translate(180px, 150px) rotate(-6deg)"}
            className="w-24 h-36 md:w-40 md:h-52 clip-polygon-4"
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

          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(550px); }
          }
          .animate-scanline { animation: scanline 4s linear infinite; }
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