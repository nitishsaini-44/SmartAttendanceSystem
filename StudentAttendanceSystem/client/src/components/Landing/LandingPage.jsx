import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    GraduationCap, Scan, ShieldCheck, Users, ClipboardCheck,
    BarChart3, Brain, ChevronRight, ArrowRight, Menu, X,
    CheckCircle2, Camera, Lock, UserCheck,
    Clock, Layers, Eye, Star,
    Database, Server, Code2, BookOpen, TrendingUp,
    UserX, Sparkles, GitBranch, Cpu, Activity,
    MonitorSmartphone, Shield, Fingerprint
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, XAxis, YAxis
} from 'recharts';

const attendanceChartData = [
    { day: 'Mon', present: 88 },
    { day: 'Tue', present: 92 },
    { day: 'Wed', present: 79 },
    { day: 'Thu', present: 95 },
    { day: 'Fri', present: 84 },
    { day: 'Sat', present: 91 },
    { day: 'Sun', present: 87 },
];

function useInView(threshold = 0.12) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
            { threshold }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

function AnimatedCount({ target, suffix = '', duration = 1600 }) {
    const [count, setCount] = useState(0);
    const [ref, inView] = useInView();
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [inView, target, duration]);
    return <span ref={ref}>{count}{suffix}</span>;
}

function ScanningFrame() {
    return (
        <div className="relative w-40 h-40 mx-auto">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400 rounded-tl-sm" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400 rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400 rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400 rounded-br-sm" />
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent scan-line" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
                    <Fingerprint className="w-10 h-10 text-zinc-500" />
                </div>
            </div>
            {[
                { top: '20%', left: '30%' }, { top: '20%', right: '30%' },
                { top: '45%', left: '18%' }, { top: '45%', right: '18%' },
                { top: '65%', left: '38%' },
            ].map((style, i) => (
                <div
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-blue-400 detection-dot"
                    style={{ ...style, animationDelay: `${i * 200}ms` }}
                />
            ))}
            <div className="absolute inset-4 rounded-full border border-blue-400/20 pulse-ring" />
        </div>
    );
}

function DashboardPreview() {
    const students = [
        { name: 'Aditya Sharma', roll: 'CSE-001', status: 'present' },
        { name: 'Priya Mehta',   roll: 'CSE-002', status: 'present' },
        { name: 'Rahul Verma',   roll: 'CSE-003', status: 'absent'  },
        { name: 'Sneha Patel',   roll: 'CSE-004', status: 'present' },
        { name: 'Karan Singh',   roll: 'CSE-005', status: 'late'    },
    ];
    const sc = {
        present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        absent:  'bg-red-500/20 text-red-400 border-red-500/30',
        late:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <div className="absolute -inset-4 bg-blue-600/5 rounded-3xl blur-xl" />
            <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10 rounded-2xl" />
            <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/90 backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/50">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                    <span className="ml-3 text-xs text-zinc-500 font-mono">Smart Attendance System — Teacher Dashboard</span>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Total Students', value: '48', icon: Users,       color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
                            { label: 'Present Today',  value: '41', icon: CheckCircle2,color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
                            { label: 'Absent',         value: '5',  icon: UserX,       color: 'text-red-400',    bg: 'bg-red-500/10'    },
                            { label: 'Late Arrivals',  value: '2',  icon: Clock,       color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
                        ].map(({ label, value, icon: Icon, color, bg }) => (
                            <div key={label} className={`rounded-xl ${bg} border border-zinc-800/50 p-3`}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Icon className={`w-3 h-3 ${color}`} />
                                    <span className="text-[10px] text-zinc-400 leading-tight">{label}</span>
                                </div>
                                <p className={`text-xl font-bold ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-zinc-300">Weekly Attendance</span>
                                <span className="text-xs text-emerald-400 font-semibold">85.4%</span>
                            </div>
                            <ResponsiveContainer width="100%" height={70}>
                                <AreaChart data={attendanceChartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[60, 100]} tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
                                    <Area type="monotone" dataKey="present" stroke="#3b82f6" strokeWidth={1.5} fill="url(#attendGrad)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-medium text-zinc-300">AI Recognition</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-zinc-400">Faces Detected</span>
                                    <span className="text-white font-semibold">48 / 48</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-zinc-400">Matched</span>
                                    <span className="text-emerald-400 font-semibold">41</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-zinc-400">Model</span>
                                    <span className="text-blue-400 font-mono">buffalo_l</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                                    <div className="h-full w-[85%] bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
                                </div>
                                <span className="text-[9px] text-zinc-500">* Sample data for demonstration</span>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
                            <span className="text-xs font-medium text-zinc-300">Recent Activity — CSE / 3rd Year / Sec A</span>
                            <span className="text-[10px] text-zinc-500">* Demo data</span>
                        </div>
                        <div className="divide-y divide-zinc-800/30">
                            {students.map((s, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                            <span className="text-[8px] font-bold text-zinc-300">{s.name.split(' ').map(n => n[0]).join('')}</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-medium text-zinc-200">{s.name}</p>
                                            <p className="text-[9px] text-zinc-500">{s.roll}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium capitalize ${sc[s.status]}`}>
                                        {s.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ id, children, className = '' }) {
    const [ref, inView] = useInView();
    return (
        <section
            id={id}
            ref={ref}
            className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
        >
            {children}
        </section>
    );
}

function Pill({ children, color = 'blue' }) {
    const map = {
        blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
        emerald:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
        purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${map[color]}`}>
            {children}
        </span>
    );
}

// ═══════════════════════════════════════════════
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════
const LandingPage = () => {
    const { isAuthenticated, role, loading } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            if (role === 'admin')        navigate('/admin/dashboard', { replace: true });
            else if (role === 'student') navigate('/student/dashboard', { replace: true });
            else                         navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, role, loading, navigate]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        };
        const handleResize = () => {
            if (window.innerWidth >= 768) setMobileMenuOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const scrollTo = (id) => {
        setMobileMenuOpen(false);
        document.body.style.overflow = '';
        requestAnimationFrame(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
            </div>
        );
    }
    if (isAuthenticated) return null;

    const navLinks = [
        { label: 'Overview',     id: 'overview',   icon: Eye },
        { label: 'Features',     id: 'features',   icon: Sparkles },
        { label: 'How It Works', id: 'howitworks', icon: Cpu },
        { label: 'Technology',   id: 'technology', icon: Layers },
        { label: 'Security',     id: 'security',   icon: ShieldCheck },
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">

            {/* ═══ NAVBAR ═══ */}
            <nav
                aria-label="Main navigation"
                className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
                    scrolled
                        ? 'bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 shadow-xl shadow-black/20'
                        : 'bg-zinc-950/40 backdrop-blur-md md:bg-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button onClick={() => scrollTo('hero')} className="flex items-center gap-3 group" aria-label="Smart Attendance System home">
                            <div className="p-2 rounded-xl bg-white/5 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <div className="hidden sm:block">
                                <span className="text-xs text-zinc-400 block leading-none">Smart</span>
                                <span className="text-sm font-semibold text-white leading-none">Attendance System</span>
                            </div>
                        </button>
                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map(({ label, id }) => (
                                <button key={id} onClick={() => scrollTo(id)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800/60 transition-all duration-200">
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-95 transition-all duration-200 shadow-lg shadow-white/10">
                                Login
                            </Link>
                            <button
                                className="md:hidden p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
                                onClick={() => setMobileMenuOpen(prev => !prev)}
                                aria-label="Toggle navigation menu"
                                aria-expanded={mobileMenuOpen}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══ MOBILE SIDEBAR OVERLAY & DRAWER ═══ */}
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
                    mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
            />

            {/* Mobile Sidebar */}
            <aside
                className={`fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-zinc-950 border-l border-zinc-800/90 shadow-2xl flex flex-col justify-between p-6 transform transition-transform duration-300 ease-in-out md:hidden ${
                    mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
                aria-label="Mobile Navigation Sidebar"
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-5 border-b border-zinc-800/80">
                    <button
                        onClick={() => scrollTo('hero')}
                        className="flex items-center gap-3 text-left group"
                        aria-label="Smart Attendance home"
                    >
                        <div className="p-2 rounded-xl bg-white/5 border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-xs text-zinc-400 block leading-none">Smart</span>
                            <span className="text-sm font-semibold text-white leading-none">Attendance System</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation items */}
                <div className="py-6 flex-1 overflow-y-auto space-y-2">
                    <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Navigation</p>
                    {navLinks.map(({ label, id, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800/80 transition-all text-sm font-medium group text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-zinc-200 group-hover:text-white">{label}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                        </button>
                    ))}
                </div>

                {/* Footer with Login CTA */}
                <div className="pt-5 border-t border-zinc-800/80 space-y-3">
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                        <p className="text-xs text-zinc-400">Institutional Access</p>
                        <p className="text-xs font-medium text-zinc-200 mt-0.5">Faculty, Student & Admin Portal</p>
                    </div>
                    <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full py-3 px-4 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 active:scale-95 transition-all duration-200 shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                    >
                        <span>Login to System</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </aside>

            {/* ═══ HERO ═══ */}
            <div id="hero" className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden">
                <div className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[120px]" />
                <div className="pointer-events-none absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-indigo-600/8 blur-[120px]" />
                <div className="pointer-events-none absolute inset-0 hero-grid opacity-20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <Pill color="blue"><Sparkles className="w-3 h-3" /> AI-Powered Attendance</Pill>
                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
                                    Attendance,<br />
                                    <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                        Reimagined with AI.
                                    </span>
                                </h1>
                                <p className="text-lg text-zinc-400 leading-relaxed max-w-lg">
                                    Automate classroom attendance with intelligent face recognition, secure role-based access, and real-time academic insights—all in one unified platform.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <Link
                                    to="/login"
                                    id="hero-cta-login"
                                    className="group flex items-center gap-2.5 px-6 py-3.5 bg-white text-black text-sm font-bold rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all duration-200 shadow-xl shadow-white/10"
                                >
                                    Get Started <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <button
                                    onClick={() => scrollTo('features')}
                                    id="hero-cta-features"
                                    className="flex items-center gap-2.5 px-6 py-3.5 border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-2xl hover:border-zinc-500 hover:bg-zinc-800/50 active:scale-95 transition-all duration-200"
                                >
                                    Explore Features <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { icon: Brain,      label: 'AI Face Recognition', color: 'text-blue-400'    },
                                    { icon: ShieldCheck,label: 'Role-Based Access',    color: 'text-emerald-400' },
                                    { icon: Activity,   label: 'Real-Time Insights',   color: 'text-purple-400'  },
                                ].map(({ icon: Icon, label, color }) => (
                                    <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
                                        <Icon className={`w-5 h-5 ${color}`} />
                                        <span className="text-[11px] text-zinc-300 font-medium leading-tight">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -top-8 -right-4 z-10 hidden lg:block">
                                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/90 backdrop-blur-xl p-5 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-xs font-medium text-zinc-300">AI Recognition Active</span>
                                    </div>
                                    <ScanningFrame />
                                    <p className="mt-3 text-center text-xs text-zinc-500">InsightFace <span className="font-mono text-blue-400">buffalo_l</span></p>
                                </div>
                            </div>
                            <DashboardPreview />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ STATS BAR ═══ */}
            <Section id="overview" className="py-12 border-y border-zinc-800/50 bg-zinc-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: 3,   suffix: '',  label: 'User Roles',           sub: 'Admin, Teacher, Student' },
                            { value: 512, suffix: '-D',label: 'Face Embeddings',       sub: 'per enrolled student'    },
                            { value: 75,  suffix: '%', label: 'Eligibility Threshold', sub: 'for exam qualification'  },
                            { value: 100, suffix: '%', label: 'Audit Coverage',        sub: 'all admin actions logged'},
                        ].map(({ value, suffix, label, sub }) => (
                            <div key={label} className="text-center">
                                <p className="text-3xl sm:text-4xl font-bold text-white"><AnimatedCount target={value} suffix={suffix} /></p>
                                <p className="mt-1 text-sm font-medium text-zinc-300">{label}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ═══ CORE FEATURES ═══ */}
            <Section id="features" className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <Pill color="purple"><Star className="w-3 h-3" /> Core Features</Pill>
                        <h2 className="text-4xl font-bold text-white">Everything You Need</h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">A comprehensive suite of tools for attendance management, face recognition, and academic oversight.</p>
                    </div>

                    <div className="space-y-6">
                        {/* AI Face Recognition */}
                        <div className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 hover:border-blue-500/30 hover:bg-zinc-900/80 transition-all duration-300 overflow-hidden">
                            <div className="pointer-events-none absolute -right-20 -top-20 w-64 h-64 rounded-full bg-blue-600/5 blur-3xl group-hover:bg-blue-600/10 transition-all duration-500" />
                            <div className="grid lg:grid-cols-2 gap-8 items-center">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <Scan className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-white">AI-Powered Face Recognition</h3>
                                    </div>
                                    <p className="text-zinc-400 mb-5 leading-relaxed">
                                        Powered by InsightFace <span className="font-mono text-blue-400">buffalo_l</span>, the system detects multiple faces from live webcam feeds or classroom group photos, extracts 512-dimensional facial embeddings, and matches them against enrolled students using cosine similarity.
                                    </p>
                                    <ul className="space-y-2">
                                        {['Live webcam face recognition', 'Classroom group-photo scanning', 'Multiple-face simultaneous detection', 'Manual attendance fallback'].map(item => (
                                            <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
                                                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />{item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                    {[
                                        { label: 'Capture', icon: Camera        },
                                        { label: 'Detect',  icon: Eye           },
                                        { label: 'Embed',   icon: Cpu           },
                                        { label: 'Match',   icon: Fingerprint   },
                                        { label: 'Record',  icon: ClipboardCheck},
                                    ].map(({ label, icon: Icon }, i) => (
                                        <React.Fragment key={label}>
                                            <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-700/50 bg-zinc-800/30 min-w-[72px]">
                                                <Icon className="w-6 h-6 text-zinc-300" />
                                                <span className="text-xs font-medium text-zinc-400">{label}</span>
                                            </div>
                                            {i < 4 && <ArrowRight className="w-4 h-4 text-zinc-600 flex-shrink-0 hidden sm:block" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-7 hover:border-emerald-500/30 hover:bg-zinc-900/80 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">Smart Attendance Management</h3>
                                </div>
                                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">Mark, review, and export attendance with full Present / Absent / Late tracking, historical records, manual corrections with mandatory justification, and CSV reports with custom date ranges.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Mark & Review Daily', 'Historical Records', 'Manual Corrections', 'CSV Export'].map(f => (
                                        <div key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />{f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-7 hover:border-amber-500/30 hover:bg-zinc-900/80 transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <TrendingUp className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white">Academic Insights</h3>
                                </div>
                                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">Students see subject-wise attendance breakdowns, the 75% examination eligibility calculator, classes that can be missed safely, and classes required to regain eligibility.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Eligibility Calculator', 'Subject-wise Stats', 'Missed Classes Tracker', 'Recovery Guidance'].map(f => (
                                        <div key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />{f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Three Portals */}
                        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8">
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-semibold text-white mb-2">Three Dedicated Portals</h3>
                                <p className="text-zinc-400 text-sm">Tailored experiences for every role in the institution.</p>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6">
                                {[
                                    { role: 'Administrator', icon: ShieldCheck, border: 'border-amber-500/30', bg: 'bg-amber-500/10',   iconColor: 'text-amber-400',   features: ['Manage students & teachers', 'Academic batch management', 'Institution-wide analytics', 'Administrative audit logs', 'Account provisioning'] },
                                    { role: 'Teacher',       icon: UserCheck,   border: 'border-emerald-500/30',bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', features: ['Access assigned batches', 'AI face scanning', 'Manage classroom attendance', 'Export CSV reports', 'Review attendance history'] },
                                    { role: 'Student',       icon: BookOpen,    border: 'border-blue-500/30',   bg: 'bg-blue-500/10',    iconColor: 'text-blue-400',    features: ['Personal attendance view', 'Subject-wise statistics', 'Exam eligibility status', 'Absence history', 'Recovery plan guidance'] },
                                ].map(({ role, icon: Icon, border, bg, iconColor, features }) => (
                                    <div key={role} className={`rounded-xl border ${border} p-6 space-y-4 bg-black/10`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${bg} border ${border}`}><Icon className={`w-5 h-5 ${iconColor}`} /></div>
                                            <h4 className="font-semibold text-white">{role}</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {features.map(f => (
                                                <li key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                                                    <CheckCircle2 className={`w-3 h-3 ${iconColor} flex-shrink-0`} />{f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ═══ HOW IT WORKS ═══ */}
            <Section id="howitworks" className="py-24 bg-zinc-900/20 border-y border-zinc-800/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <Pill color="emerald"><GitBranch className="w-3 h-3" /> Workflow</Pill>
                        <h2 className="text-4xl font-bold text-white">How It Works</h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">From student enrollment to attendance insights in five seamless steps.</p>
                    </div>
                    <div className="relative">
                        <div className="hidden lg:block absolute top-14 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
                            {[
                                { step: 1, icon: Users,         title: 'Enroll Students',    desc: 'Administrators add student profiles and register face images through the secure admin portal.',                                    color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
                                { step: 2, icon: Camera,        title: 'Detect Faces',       desc: 'The Python AI engine uses RetinaFace/SCRFD to detect faces and extract 512-D facial embeddings.',                              color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                                { step: 3, icon: Brain,         title: 'Recognize Students', desc: 'Detected faces are compared with enrolled students in the relevant academic batch via cosine similarity.',                     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                                { step: 4, icon: ClipboardCheck,title: 'Record Attendance',  desc: 'Recognized students are matched to attendance records. Manual fallback available when needed.',                                color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20'   },
                                { step: 5, icon: BarChart3,     title: 'Access Insights',    desc: 'Teachers review attendance, administrators monitor activity, and students track their academic progress.',                    color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
                            ].map(({ step, icon: Icon, title, desc, color, bg, border }) => (
                                <div key={step} className="flex flex-col items-center text-center">
                                    <div className={`relative z-10 w-14 h-14 rounded-2xl ${bg} border ${border} flex items-center justify-center mb-5 shadow-lg`}>
                                        <Icon className={`w-6 h-6 ${color}`} />
                                        <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-900 border ${border} flex items-center justify-center`}>
                                            <span className={`text-[10px] font-bold ${color}`}>{step}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-semibold text-white mb-2">{title}</h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed max-w-[180px] lg:max-w-none">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>

            {/* ═══ AI TECHNOLOGY ═══ */}
            <Section id="technology" className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <Pill color="blue"><Cpu className="w-3 h-3" /> AI Engine</Pill>
                        <h2 className="text-4xl font-bold text-white">Smart Face Recognition Technology</h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">Enterprise-grade biometric identification powered by state-of-the-art deep learning.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-start">
                        <div className="space-y-5">
                            {[
                                { icon: Brain,  title: 'InsightFace buffalo_l Model',    desc: 'State-of-the-art facial analysis framework providing robust detection and recognition across varied lighting and pose conditions.',                                       pill: 'buffalo_l'    },
                                { icon: Eye,    title: 'RetinaFace / SCRFD Detection',   desc: 'High-accuracy face detection with sub-pixel landmark localization for precise facial alignment before embedding extraction.',                                               pill: 'RetinaFace'   },
                                { icon: Cpu,    title: '512-Dimensional Embeddings',     desc: 'Each enrolled student is represented as a 512-D facial feature vector. Recognition uses cosine similarity against the relevant class roster only.',                       pill: '512-D Vectors' },
                                { icon: Server, title: 'Python Flask Biometric Service', desc: 'A dedicated Flask microservice handles all AI inference via ONNX Runtime. It receives requests from the Node.js API and returns recognition results.',                   pill: 'Flask + ONNX'  },
                            ].map(({ icon: Icon, title, desc, pill }) => (
                                <div key={title} className="flex gap-4 p-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200">
                                    <div className="flex-shrink-0 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 h-fit">
                                        <Icon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <h3 className="font-semibold text-white text-sm">{title}</h3>
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{pill}</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-7">
                            <h3 className="text-sm font-semibold text-zinc-300 mb-6 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-400" /> Recognition Pipeline
                            </h3>
                            {[
                                { step: 'Input',          detail: 'Webcam frame / group photo',                         color: 'bg-blue-500'    },
                                { step: 'Face Detection', detail: 'SCRFD locates all faces in the frame',               color: 'bg-indigo-500'  },
                                { step: 'Alignment',      detail: 'Facial landmarks normalize pose and scale',          color: 'bg-violet-500'  },
                                { step: 'Embedding',      detail: 'ArcFace extracts 512-D feature vector per face',     color: 'bg-purple-500'  },
                                { step: 'Matching',       detail: 'Cosine similarity against batch student embeddings', color: 'bg-pink-500'    },
                                { step: 'Output',         detail: 'Student ID mapped to attendance record',             color: 'bg-emerald-500' },
                            ].map(({ step, detail, color }, i) => (
                                <div key={step} className="flex items-start gap-4">
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <div className={`w-3 h-3 rounded-full ${color}`} />
                                        {i < 5 && <div className="w-0.5 h-8 bg-zinc-800" />}
                                    </div>
                                    <div className="pb-2">
                                        <p className="text-sm font-medium text-zinc-200">{step}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-16">
                        <h3 className="text-center text-lg font-semibold text-zinc-300 mb-8">Full Technology Stack</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                            {[
                                { name: 'React 18',     color: 'text-blue-400'    },
                                { name: 'Vite',         color: 'text-purple-400'  },
                                { name: 'Tailwind CSS', color: 'text-sky-400'     },
                                { name: 'Node.js',      color: 'text-green-400'   },
                                { name: 'Express.js',   color: 'text-zinc-300'    },
                                { name: 'PostgreSQL',   color: 'text-blue-300'    },
                                { name: 'Prisma ORM',   color: 'text-zinc-200'    },
                                { name: 'Python Flask', color: 'text-emerald-400' },
                                { name: 'InsightFace',  color: 'text-indigo-400'  },
                                { name: 'ONNX Runtime', color: 'text-blue-400'    },
                                { name: 'JWT Auth',     color: 'text-amber-400'   },
                                { name: 'Recharts',     color: 'text-pink-400'    },
                                { name: 'Lucide Icons', color: 'text-violet-400'  },
                                { name: 'React Router', color: 'text-red-400'     },
                                { name: 'Docker',       color: 'text-blue-400'    },
                                { name: 'Axios',        color: 'text-purple-400'  },
                            ].map(({ name, color }) => (
                                <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200 text-center group">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                        <Code2 className={`w-4 h-4 ${color}`} />
                                    </div>
                                    <span className={`text-[10px] font-medium ${color} opacity-80 group-hover:opacity-100 transition-opacity leading-tight`}>{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>

            {/* ═══ SECURITY & ARCHITECTURE ═══ */}
            <Section id="security" className="py-24 bg-zinc-900/20 border-t border-zinc-800/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 space-y-3">
                        <Pill color="emerald"><Shield className="w-3 h-3" /> Security</Pill>
                        <h2 className="text-4xl font-bold text-white">Secure Role-Based Architecture</h2>
                        <p className="text-zinc-400 max-w-xl mx-auto">Three-tier RBAC with JWT authentication, batch-scoped permissions, and comprehensive audit logging.</p>
                    </div>

                    <div className="relative max-w-4xl mx-auto mb-16">
                        <div className="flex justify-center mb-6">
                            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 px-8 py-5 text-center min-w-[280px]">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <MonitorSmartphone className="w-5 h-5 text-blue-400" />
                                    <span className="font-semibold text-white">React Frontend</span>
                                </div>
                                <p className="text-xs text-zinc-400">Vite + React 18 + Tailwind CSS + Lucide React</p>
                                <div className="flex justify-center gap-2 mt-3 flex-wrap">
                                    {['Admin Portal', 'Teacher Portal', 'Student Portal'].map(p => (
                                        <span key={p} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">{p}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center mb-6">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500/50 to-indigo-500/50" />
                                <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">JWT Bearer Token</div>
                                <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500/50 to-purple-500/50" />
                            </div>
                        </div>
                        <div className="flex justify-center mb-6">
                            <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 px-8 py-5 text-center min-w-[280px]">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Server className="w-5 h-5 text-indigo-400" />
                                    <span className="font-semibold text-white">Node.js / Express API</span>
                                </div>
                                <p className="text-xs text-zinc-400">JWT Auth + RBAC Middleware + REST Endpoints</p>
                                <div className="flex justify-center gap-2 mt-3">
                                    {['/teacher', '/admin', '/student'].map(p => (
                                        <span key={p} className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-mono">{p}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Database className="w-5 h-5 text-emerald-400" />
                                    <span className="font-semibold text-white">PostgreSQL Database</span>
                                </div>
                                <p className="text-xs text-zinc-400">Prisma ORM + Secure storage</p>
                                <p className="text-[10px] text-zinc-500 mt-1">Students, Teachers, Attendance, Audit Logs</p>
                            </div>
                            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Brain className="w-5 h-5 text-orange-400" />
                                    <span className="font-semibold text-white">Python AI Service</span>
                                </div>
                                <p className="text-xs text-zinc-400">Flask + InsightFace + ONNX Runtime</p>
                                <p className="text-[10px] text-zinc-500 mt-1">Face detection, embedding, matching</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            { icon: Lock,       title: 'JWT Authentication',     desc: 'Stateless token-based authentication with role claims. All protected API routes verify the bearer token before processing.',                                 color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
                            { icon: Layers,     title: 'Three-Tier RBAC',        desc: 'Admin, Teacher, and Student roles each have distinct permissions. Teachers can only access batches they are explicitly assigned to.',                        color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                            { icon: ShieldCheck,title: 'Audit Logging',          desc: 'Every administrative action is recorded with timestamps and actor information for full institutional accountability.',                                       color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20'  },
                            { icon: Shield,     title: 'No Public Registration', desc: 'Accounts can only be provisioned by administrators. Students and teachers cannot self-register, preventing unauthorized access.',                           color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
                        ].map(({ icon: Icon, title, desc, color, bg, border }) => (
                            <div key={title} className={`rounded-xl border ${border} ${bg} p-5 space-y-3`}>
                                <div className={`p-2.5 rounded-xl ${bg} border ${border} w-fit`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <h3 className="font-semibold text-white text-sm">{title}</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* ═══ FINAL CTA ═══ */}
            <Section className="py-24 border-t border-zinc-800/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="relative rounded-3xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-900/90 overflow-hidden p-12 text-center">
                        <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-600/8 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-indigo-600/8 blur-3xl" />
                        <div className="pointer-events-none absolute inset-0 hero-grid opacity-10" />
                        <div className="relative space-y-6">
                            <div className="flex justify-center">
                                <div className="p-4 rounded-2xl bg-white/5 border border-zinc-700">
                                    <GraduationCap className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Make Every Class Count.</h2>
                                <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
                                    Bring intelligent attendance tracking, transparent academic insights, and streamlined classroom management into one platform.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                <Link to="/login" id="cta-login-portal" className="group flex items-center gap-2.5 px-8 py-4 bg-white text-black text-sm font-bold rounded-2xl hover:bg-zinc-100 active:scale-95 transition-all duration-200 shadow-xl shadow-white/10">
                                    Login to Your Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                                <button onClick={() => scrollTo('features')} className="flex items-center gap-2.5 px-8 py-4 border border-zinc-700 text-zinc-300 text-sm font-semibold rounded-2xl hover:border-zinc-500 hover:bg-zinc-800/50 active:scale-95 transition-all duration-200">
                                    View Features
                                </button>
                            </div>
                            <p className="text-xs text-zinc-500 mt-4">Accounts are provisioned by campus administration. Contact your department coordinator for access.</p>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ═══ FOOTER ═══ */}
            <footer className="border-t border-zinc-800/50 bg-zinc-950 py-12" role="contentinfo">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                        <div className="col-span-2 md:col-span-1 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/5 border border-zinc-800">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-zinc-500">Smart</p>
                                    <p className="text-sm font-semibold text-white">Attendance System</p>
                                </div>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed max-w-[200px]">AI-powered classroom attendance management for modern institutions.</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Navigation</h4>
                            <ul className="space-y-2">
                                {navLinks.map(({ label, id }) => (
                                    <li key={id}><button onClick={() => scrollTo(id)} className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors">{label}</button></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Technology</h4>
                            <ul className="space-y-2">
                                {['React 18 + Vite', 'Node.js + Express', 'PostgreSQL + Prisma', 'Python + Flask', 'InsightFace + ONNX', 'JWT + RBAC'].map(t => (
                                    <li key={t} className="text-sm text-zinc-500">{t}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Access</h4>
                            <ul className="space-y-2">
                                {['Admin Portal', 'Teacher Portal', 'Student Portal'].map(label => (
                                    <li key={label}><Link to="/login" className="text-sm text-zinc-500 hover:text-zinc-200 transition-colors">{label}</Link></li>
                                ))}
                            </ul>
                            <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Admin-provisioned access only
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-zinc-800/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-zinc-600">Smart Attendance System - Academic Project</p>
                        <span className="text-xs text-zinc-600">Built with React 18, Node.js, Python, InsightFace</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
