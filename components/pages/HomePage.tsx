
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Code, Layers, MousePointer2, Github } from 'lucide-react';

export function HomePage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-purple-500/30">
            {/* Navbar */}
            <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">L</div>
                        <span className="font-semibold text-lg tracking-tight">Lumina Editor</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
                        <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
                        <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
                        <Link to="/editor" className="px-4 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors">Launch Editor</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div className="relative overflow-hidden pt-32 pb-24 text-center px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none opacity-50" />

                <div className="relative z-10 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-medium mb-8">
                        <Sparkles size={12} />
                        <span>v2.0 Now Available with AI Scripting</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        Edit Video at <br /> the Speed of Code.
                    </h1>

                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                        The first professional video editor built for developers and automation.
                        Script your timeline, generate assets with AI, and build complex effects using JavaScript.
                    </p>

                    <div className="flex items-center justify-center gap-4">
                        <Link to="/editor" className="px-8 py-4 bg-white text-black text-lg font-semibold rounded-lg hover:bg-gray-200 transition-transform active:scale-95 flex items-center gap-2">
                            <MousePointer2 size={18} /> Start Creating
                        </Link>
                        <Link to="/docs" className="px-8 py-4 bg-white/5 border border-white/10 text-white text-lg font-semibold rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                            <Code size={18} /> View API Docs
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Code className="text-blue-400" />}
                        title="Scriptable Timeline"
                        description="Control every clip, effect, and transition using the built-in JavaScript console. Automate repetitive tasks instantly."
                    />
                    <FeatureCard
                        icon={<Sparkles className="text-purple-400" />}
                        title="Generative AI"
                        description="Integrated Gemini AI to generate images, write scripts, and brainstorm ideas directly within the editor."
                    />
                    <FeatureCard
                        icon={<Layers className="text-emerald-400" />}
                        title="Node-Based Effects"
                        description="Create custom transitions and filters using our node-based shader language or raw GLSL."
                    />
                </div>
            </div>

            {/* Footer */}
            <footer className="border-t border-white/5 py-12 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Lumina Editor. MIT License.</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center mb-4 border border-white/5">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-200">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{description}</p>
        </div>
    );
}
