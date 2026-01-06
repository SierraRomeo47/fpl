'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Home, Users, History, Lightbulb, Trophy } from "lucide-react";

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Dashboard' },
        { href: '/squad', icon: Users, label: 'Squad' },
        { href: '/history', icon: History, label: 'History' },
        { href: '/insights', icon: Lightbulb, label: 'Insights' },
        { href: '/leagues', icon: Trophy, label: 'Leagues' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-card/98 backdrop-blur-xl border-t-2 border-primary/30 shadow-2xl z-50">
            <div className="max-w-7xl mx-auto px-1 md:px-2 lg:px-4 py-2 md:py-3">
                <div className="grid grid-cols-5 gap-1 md:gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "default" : "outline"}
                                    className={`w-full h-auto py-2 md:py-3 flex-col gap-1 md:gap-1.5 transition-all ${isActive
                                        ? 'bg-primary shadow-lg shadow-primary/20 border-primary'
                                        : 'hover:bg-primary/10 hover:border-primary/50'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? '' : 'opacity-70'}`} />
                                    <span className="text-[10px] md:text-xs font-medium">{item.label}</span>
                                </Button>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
