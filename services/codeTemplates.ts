export interface CodeTemplate {
  name: string;
  category: 'backgrounds' | 'animations' | 'text' | 'shapes' | 'effects' | 'scripts';
  description: string;
  html: string;
  css: string;
  js: string;
  type: 'image' | 'video' | 'text' | 'script';
  subtype?: 'transition' | 'effect';
  thumbnail?: string;
}

export const codeTemplates: CodeTemplate[] = [
  // SCRIPTS (Transitions & Effects)
  {
    name: 'Custom Transition (Wipe)',
    category: 'scripts',
    description: 'Custom wipe transition using Canvas API',
    type: 'script',
    subtype: 'transition',
    html: '<!-- No HTML needed for transition scripts -->',
    css: '/* No CSS needed for transition scripts */',
    js: `// Custom Transition Definition
// Must return a Transition object
return {
    id: 'custom-wipe-' + Date.now(),
    name: 'Custom Wipe',
    variables: [
        { name: 'Color', key: 'color', type: 'color', defaultValue: '#ff0000' }
    ],
    apply: (context) => {
        const { ctx, width, height, progress, isExit, params } = context;
        
        // Example: Circular Wipe
        const maxRadius = Math.sqrt(width * width + height * height);
        const p = isExit ? progress : (1 - progress);
        const radius = maxRadius * p;
        
        ctx.fillStyle = params.color || '#000000';
        
        ctx.beginPath();
        ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Return overlay style
        return {
            overlayColor: { 
                style: ctx.fillStyle, 
                opacity: 0.5 // Mix with opacity
            }
        };
    }
};`
  },
  {
    name: 'Custom Effect (Sepia)',
    category: 'scripts',
    description: 'Custom sepia filter effect',
    type: 'script',
    subtype: 'effect',
    html: '',
    css: '',
    js: `// Custom Effect Definition
return {
    id: 'custom-sepia-' + Date.now(),
    name: 'Custom Sepia',
    variables: [
        { name: 'Intensity', key: 'intensity', type: 'number', min: 0, max: 1, defaultValue: 1 }
    ],
    apply: (context) => {
        const { params } = context;
        const intensity = params.intensity || 1;
        
        // Return CSS filter
        return {
            filter: \`sepia(\${intensity})\`
        };
    }
};`
  },

  // BACKGROUNDS
  {
    name: 'Gradient Background',
    category: 'backgrounds',
    description: 'Simple linear gradient',
    type: 'image',
    html: '<div class="gradient"></div>',
    css: `.gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}`,
    js: ''
  },
  {
    name: 'Animated Gradient',
    category: 'backgrounds',
    description: 'Flowing gradient animation',
    type: 'video',
    html: '<div class="animated-gradient"></div>',
    css: `.animated-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #ff0080, #7928ca, #ff0080);
  background-size: 200% 200%;
  animation: gradientShift 3s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}`,
    js: ''
  },

  // TEXT EFFECTS
  {
    name: 'Neon Text',
    category: 'text',
    description: 'Glowing neon text effect',
    type: 'text',
    html: '<h1 class="neon">NEON</h1>',
    css: `.neon {
  font-family: 'Arial Black', sans-serif;
  font-size: 80px;
  font-weight: bold;
  color: #fff;
  text-align: center;
  text-shadow: 
    0 0 10px #00ffff,
    0 0 20px #00ffff,
    0 0 30px #00ffff,
    0 0 40px #00ffff;
  margin: 0;
  padding: 20px;
}`,
    js: ''
  },
  {
    name: 'Glitch Text',
    category: 'text',
    description: 'Animated glitch effect',
    type: 'video',
    html: '<h1 class="glitch" data-text="GLITCH">GLITCH</h1>',
    css: `.glitch {
  font-family: 'Arial Black', sans-serif;
  font-size: 72px;
  font-weight: bold;
  color: #fff;
  text-align: center;
  position: relative;
  margin: 0;
  padding: 20px;
  animation: glitch 1s infinite;
}

@keyframes glitch {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(2px, -2px); }
  60% { transform: translate(-2px, -2px); }
  80% { transform: translate(2px, 2px); }
}`,
    js: ''
  },
  {
    name: 'Typewriter Text',
    category: 'text',
    description: 'Typing animation effect',
    type: 'video',
    html: '<h1 class="typewriter">Hello World!</h1>',
    css: `.typewriter {
  font-family: 'Courier New', monospace;
  font-size: 48px;
  color: #00ff00;
  margin: 0;
  padding: 20px;
  white-space: nowrap;
  overflow: hidden;
  border-right: 3px solid #00ff00;
  animation: typing 2s steps(12) infinite, blink 0.5s step-end infinite;
}

@keyframes typing {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes blink {
  50% { border-color: transparent; }
}`,
    js: ''
  },

  // ANIMATIONS
  {
    name: 'Particle System',
    category: 'animations',
    description: 'Floating particles animation',
    type: 'video',
    html: '<canvas id="canvas"></canvas>',
    css: `body, html { 
  margin: 0; 
  padding: 0; 
  overflow: hidden; 
  background: #000;
}
#canvas { 
  display: block; 
  width: 100%;
  height: 100%;
}`,
    js: `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth || 800;
canvas.height = window.innerHeight || 600;

const particles = [];
for (let i = 0; i < 100; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    radius: Math.random() * 3 + 1
  });
}

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  
  requestAnimationFrame(animate);
}
animate();`
  },
  {
    name: 'Spinning Cube',
    category: 'animations',
    description: '3D CSS cube rotation',
    type: 'video',
    html: `<div class="scene">
  <div class="cube">
    <div class="face front"></div>
    <div class="face back"></div>
    <div class="face right"></div>
    <div class="face left"></div>
    <div class="face top"></div>
    <div class="face bottom"></div>
  </div>
</div>`,
    css: `.scene {
  width: 200px;
  height: 200px;
  perspective: 600px;
  margin: 100px auto;
}

.cube {
  width: 200px;
  height: 200px;
  position: relative;
  transform-style: preserve-3d;
  animation: spin 4s infinite linear;
}

@keyframes spin {
  from { transform: rotateX(0deg) rotateY(0deg); }
  to { transform: rotateX(360deg) rotateY(360deg); }
}

.face {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 2px solid #fff;
  opacity: 0.8;
}

.front  { background: #ff0080; transform: rotateY(0deg) translateZ(100px); }
.back   { background: #0080ff; transform: rotateY(180deg) translateZ(100px); }
.right  { background: #00ff80; transform: rotateY(90deg) translateZ(100px); }
.left   { background: #ff8000; transform: rotateY(-90deg) translateZ(100px); }
.top    { background: #8000ff; transform: rotateX(90deg) translateZ(100px); }
.bottom { background: #ffff00; transform: rotateX(-90deg) translateZ(100px); }`,
    js: ''
  },

  // SHAPES
  {
    name: 'Circle Pattern',
    category: 'shapes',
    description: 'Geometric circle pattern',
    type: 'image',
    html: '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="80" fill="none" stroke="#00ffff" stroke-width="2"/><circle cx="100" cy="100" r="60" fill="none" stroke="#ff00ff" stroke-width="2"/><circle cx="100" cy="100" r="40" fill="none" stroke="#ffff00" stroke-width="2"/></svg>',
    css: `svg {
  width: 100%;
  height: 100%;
}`,
    js: ''
  },
  {
    name: 'Pulsing Circle',
    category: 'shapes',
    description: 'Animated pulsing circle',
    type: 'video',
    html: '<div class="pulse"></div>',
    css: `.pulse {
  width: 200px;
  height: 200px;
  margin: 100px auto;
  background: radial-gradient(circle, #00ffff, #0080ff);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}`,
    js: ''
  },

  // EFFECTS
  {
    name: 'Matrix Rain',
    category: 'effects',
    description: 'Matrix-style falling characters',
    type: 'video',
    html: '<canvas id="matrix"></canvas>',
    css: `body, html { 
  margin: 0; 
  padding: 0; 
  overflow: hidden; 
  background: #000;
}
#matrix { 
  display: block; 
}`,
    js: `const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth || 800;
canvas.height = window.innerHeight || 600;

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#0f0';
  ctx.font = fontSize + 'px monospace';
  
  for (let i = 0; i < drops.length; i++) {
    const text = chars[Math.floor(Math.random() * chars.length)];
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
    
    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

setInterval(draw, 33);`
  },
  {
    name: 'Starfield',
    category: 'effects',
    description: 'Moving starfield effect',
    type: 'video',
    html: '<canvas id="stars"></canvas>',
    css: `body, html { 
  margin: 0; 
  padding: 0; 
  overflow: hidden; 
  background: #000;
}
#stars { 
  display: block; 
}`,
    js: `const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth || 800;
canvas.height = window.innerHeight || 600;

const stars = Array(200).fill().map(() => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  z: Math.random() * canvas.width,
}));

function animate() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  stars.forEach(star => {
    star.z -= 2;
    if (star.z <= 0) {
      star.z = canvas.width;
      star.x = Math.random() * canvas.width;
      star.y = Math.random() * canvas.height;
    }
    
    const x = (star.x - canvas.width / 2) * (canvas.width / star.z) + canvas.width / 2;
    const y = (star.y - canvas.height / 2) * (canvas.width / star.z) + canvas.height / 2;
    const size = (1 - star.z / canvas.width) * 3;
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  });
  
  requestAnimationFrame(animate);
}
animate();`
  },
  // RIPPLE WAS HERE, BUT IS BETTER AS A TEMPLATE VIDEO AS IT WAS
  {
    name: 'Ripple Dissolve',
    category: 'effects',
    description: 'Water ripple transition overlay',
    type: 'video',
    html: '<canvas id="ripple"></canvas>',
    css: `body, html {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}
#ripple {
  display: block;
  width: 100%;
  height: 100%;
}`,
    js: `const canvas = document.getElementById('ripple');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth || 1920;
canvas.height = window.innerHeight || 1080;

const ripples = [];
const maxRipples = 5;
const duration = 2000; // ms
const startTime = Date.now();

// Create ripples
for(let i=0; i<maxRipples; i++) {
  ripples.push({
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 0,
    maxRadius: canvas.width * 1.5,
    speed: 10 + Math.random() * 5,
    delay: i * 200,
    alpha: 1,
    color: '#00ccff'
  });
}

function animate() {
  const elapsed = Date.now() - startTime;
  
  // Clear with fade
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw ripples
  ripples.forEach(r => {
    if (elapsed > r.delay) {
        r.radius += r.speed;
        const progress = Math.min(1, r.radius / r.maxRadius);
        r.alpha = 1 - progress;
        
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(r.x, r.y, r.radius * 0.8, r.x, r.y, r.radius);
        gradient.addColorStop(0, \`rgba(0, 204, 255, 0)\`);
        gradient.addColorStop(1, \`rgba(0, 204, 255, \${r.alpha * 0.5})\`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.lineWidth = 10;
        ctx.strokeStyle = \`rgba(255, 255, 255, \${r.alpha})\`;
        ctx.stroke();
    }
  });

  requestAnimationFrame(animate);
}

animate();`
  }
];

export function getTemplatesByCategory(category: string): CodeTemplate[] {
  if (category === 'all') return codeTemplates;
  return codeTemplates.filter(t => t.category === category);
}

export function getTemplateByName(name: string): CodeTemplate | undefined {
  return codeTemplates.find(t => t.name === name);
}
