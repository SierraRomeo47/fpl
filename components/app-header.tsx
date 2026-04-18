'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, LogOut, Dices, Trophy, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from 'react';
import { useFPLData } from "@/lib/hooks/use-fpl-data";
import { PlayerDetailModal } from "@/components/insights/player-detail-modal";
import { PlayerAvatar } from "@/components/player-avatar";

export function AppHeader() {
    const pathname = usePathname();
    const router = useRouter();

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const clickOutsideRef = useRef<HTMLDivElement>(null);

    // Call without entryId to only hook into cached bootstrap & fixtures
    const { bootstrap, fixtures } = useFPLData();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (clickOutsideRef.current && !clickOutsideRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (pathname === '/login') {
        return null;
    }

    let searchResults: any[] = [];
    if (bootstrap?.elements && searchTerm.length >= 2) {
        const term = searchTerm.toLowerCase();
        searchResults = bootstrap.elements.filter((p: any) => 
            p.web_name.toLowerCase().includes(term) || 
            p.first_name.toLowerCase().includes(term) || 
            p.second_name.toLowerCase().includes(term)
        ).slice(0, 8);
    }

    const currentEvent = bootstrap?.events?.find((e: any) => e.is_current)?.id || 1;

    return (
        <>
            <header className="sticky top-0 z-30 w-full bg-card border-b border-border h-16 flex items-center justify-between px-4 md:px-6">
                {/* Mobile Branding (only visible when sidebar is hidden on small screens) */}
                <div className="lg:hidden flex items-center gap-2 pl-12 lg:pl-0">
                    <div className="flex items-center justify-center bg-primary text-white w-8 h-8 rounded-md relative overflow-hidden shrink-0">
                        <Dices className="w-4 h-4 absolute" style={{ transform: 'translate(-3px, -3px)' }} />
                        <Trophy className="w-4 h-4 absolute" style={{ transform: 'translate(3px, 3px)' }} />
                    </div>
                    <h2 className="text-primary text-xl font-bold uppercase tracking-tight font-headline">FPL DnD</h2>
                </div>

                {/* Desktop spacer to keep right-side items aligned properly since justify-between is used */}
                <div className="hidden lg:block flex-1"></div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block w-72" ref={clickOutsideRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                        <Input 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsSearchFocused(true);
                            }}
                            onFocus={() => setIsSearchFocused(true)}
                            placeholder="Search players..." 
                            className="pl-9 h-10 w-full bg-surface-container-lowest border-outline-variant focus-visible:ring-primary rounded-lg text-sm"
                        />
                        
                        {/* Search Dropdown */}
                        {isSearchFocused && searchTerm.length >= 2 && (
                            <div className="absolute top-12 left-0 w-full bg-popover text-popover-foreground border border-border shadow-xl rounded-lg overflow-hidden z-50">
                                {searchResults.length > 0 ? (
                                    <ul className="max-h-72 overflow-y-auto py-1">
                                        {searchResults.map((player) => {
                                            const team = bootstrap?.teams?.find((t: any) => t.id === player.team);
                                            const pos = ['', 'GKP', 'DEF', 'MID', 'FWD'][player.element_type];
                                            return (
                                                <li 
                                                    key={player.id} 
                                                    onClick={() => {
                                                        setSelectedPlayer(player);
                                                        setIsSearchFocused(false);
                                                        setSearchTerm('');
                                                    }}
                                                    className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between border-b border-border last:border-0"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <PlayerAvatar
                                                            player={{ ...player, id: player.id }}
                                                            teamBadgeCode={team?.code}
                                                            size="xs"
                                                            dense
                                                        />
                                                        <div>
                                                            <p className="text-sm font-bold text-foreground leading-none mb-1">{player.web_name}</p>
                                                            <p className="text-xs text-muted-foreground leading-none">{team?.short_name} • {pos}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-foreground">£{(player.now_cost / 10).toFixed(1)}m</p>
                                                        <p className="text-[10px] text-muted-foreground">{player.total_points} pts</p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No players found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary/5 transition-colors cursor-pointer">
                                <User className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-surface border-outline-variant rounded-xl shadow-lg">
                            <DropdownMenuItem onClick={handleLogout} className="text-error cursor-pointer focus:bg-error/10 focus:text-error gap-2 p-3 font-semibold">
                                <LogOut className="w-4 h-4" />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Modal strictly overlaying the page */}
            {selectedPlayer && bootstrap && (
                <PlayerDetailModal
                    player={selectedPlayer}
                    team={bootstrap.teams?.find((t: any) => t.id === selectedPlayer.team)}
                    teams={bootstrap.teams || []}
                    fixtures={fixtures || []}
                    currentEvent={currentEvent}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </>
    );
}
