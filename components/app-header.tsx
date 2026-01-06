'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useState, useEffect } from 'react';

export function AppHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Reset logout state when pathname changes (e.g., after successful logout redirect)
    useEffect(() => {
        if (pathname === '/login') {
            setIsLoggingOut(false);
        }
    }, [pathname]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });
            
            if (response.ok) {
                setIsLoggingOut(false); // Reset before navigation
                router.push('/login');
                router.refresh();
            } else {
                console.error('Logout failed');
                setIsLoggingOut(false);
            }
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggingOut(false);
        }
    };

    // Don't show header on login page
    if (pathname === '/login') {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 bg-card/98 backdrop-blur-xl border-b border-primary/30 z-40">
            <div className="max-w-7xl mx-auto px-4 py-2 flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </Button>
            </div>
        </div>
    );
}

