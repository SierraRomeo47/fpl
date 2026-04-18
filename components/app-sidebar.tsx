'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, History, CheckSquare, Trophy, Menu, X as XIcon, LogOut, ArrowLeftRight, Moon, Sun, Gamepad2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { getPlayerInitials } from '@/lib/player-photo-utils';

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [sessionData, setSessionData] = useState<{ teamName: string; playerName: string } | null>(null);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (pathname === '/login') return;
        fetch('/api/session/create')
            .then(res => res.json())
            .then(data => {
                if (!data.error && data.teamName) {
                    setSessionData(data);
                }
            })
            .catch(console.error);
    }, [pathname]);

    // Map routes to sidebar items. Using existing routes, but labels map to design.
    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/squad', icon: ArrowLeftRight, label: 'Transfers' }, // Design uses Transfers for Squad/Pick Team conceptually
        { href: '/leagues', icon: Trophy, label: 'Leagues' },
        { href: '/insights', icon: CheckSquare, label: 'Scout' }, // Design uses Scout for Insights/AI conceptually
        { href: '/history', icon: History, label: 'History' },
        { href: '/playground', icon: Gamepad2, label: 'Playground' },
    ];

    // Don't show sidebar on login page
    if (pathname === '/login') {
        return null;
    }

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (response.ok) {
                router.push('/login');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <>
            {/* Mobile Hamburger Toggle (Visible only on lg and below) */}
            <div className="lg:hidden fixed top-0 left-0 p-4 z-50">
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-surface-container-lowest shadow-sm border border-outline-variant rounded-md">
                    {isOpen ? <XIcon className="w-6 h-6 text-on-surface" /> : <Menu className="w-6 h-6 text-on-surface" />}
                </Button>
            </div>

            {/* Sidebar Overlay for Mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed top-0 left-0 z-40 flex w-64 min-h-[100dvh] flex-col bg-card lg:border-0
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:static lg:min-h-full lg:translate-x-0 lg:self-stretch
            `}>
                {/* Branding lockup */}
                <div className="p-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex rounded-lg outline-none ring-offset-background transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => setIsOpen(false)}
                    >
                        <BrandLogo size="lg" />
                    </Link>
                </div>

                {/* User Profile Area */}
                <div className="px-4 mb-6">
                    <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 border border-outline-variant shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-[#1c1b1b] flex items-center justify-center flex-shrink-0 border-2 border-primary/20">
                            {sessionData?.teamName ? (
                                <span className="text-white font-bold text-sm tracking-widest">{getPlayerInitials(sessionData.teamName)}</span>
                            ) : (
                                <Users className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-on-surface truncate" title={sessionData?.teamName || "Manager Dashboard"}>
                                {sessionData?.teamName || "Manager Dashboard"}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate" title={sessionData?.playerName || "Gameweek Active"}>
                                {sessionData?.playerName || "Gameweek Active"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation — no flex-1 so Dark mode / Logout sit directly under History */}
                <nav className="shrink-0 px-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
                        const Icon = item.icon;

                        return (
                            <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                                <div className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                    ${isActive 
                                        ? 'bg-primary text-white font-bold shadow-md' 
                                        : 'text-on-surface hover:bg-black/5 hover:text-black font-medium'}
                                `}>
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-on-surface-variant'}`} />
                                    <span className="text-sm tracking-wide">{item.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Partition + theme / account (directly below History, not pinned to viewport bottom) */}
                <div className="mt-4 shrink-0 border-t border-border px-4 pb-6 pt-4 flex flex-col gap-1">
                    {mounted && (
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-3 text-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    </Button>
                </div>
            </aside>
        </>
    );
}
