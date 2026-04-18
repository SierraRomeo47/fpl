'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Users } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function SimplifiedLogin() {
    const [entryId, setEntryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const id = parseInt(entryId);

        if (isNaN(id) || id <= 0) {
            setError('Please enter a valid FPL team ID');
            return;
        }

        setLoading(true);

        try {
            // Validate via our proxy
            const res = await fetch(`/api/fpl/entry/${id}`, {
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error('Team ID not found');
            }

            const data = await res.json();

            const sessionRes = await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    entryId: id,
                    teamName: data.name,
                    playerName: `${data.player_first_name} ${data.player_last_name}`
                }),
            });
            
            if (!sessionRes.ok) {
                throw new Error('Failed to create session');
            }

            // Small delay to ensure cookie is processed by browser
            await new Promise(resolve => setTimeout(resolve, 200));
            
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to find team. Please check your ID.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex w-full">
            {/* Left Editorial Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-surface-container-low relative overflow-hidden flex-col justify-between p-12 sm:p-14 border-r-2 border-outline-variant/30">
                <div className="z-10 w-full max-w-lg">
                    <BrandLogo size="hero" showTagline tone="editorial" />
                </div>
                <div className="z-10 mt-auto w-full max-w-lg">
                    <h1 className="text-[3.5rem] leading-none font-bold text-on-surface mb-6 font-headline tracking-tight">The High-Contrast Curator.</h1>
                    <p className="text-lg text-on-surface-variant font-body mb-8">
                        Experience your fantasy football data securely backed by multi-source integration. Gain the edge with Live Gameweek Analysis, Effective Ownership mapping, and predictive rank tracking.
                    </p>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-sm font-bold text-primary">
                            <Activity className="w-5 h-5" />
                            <span>Live Matchday Point & BPS Tracking</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-primary">
                            <Users className="w-5 h-5" />
                            <span>Mini-League Rivalry Sweeper</span>
                        </div>
                    </div>
                </div>
                {/* Decorative Pattern / Background Image */}
                <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1508344928928-7137b29de218?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-multiply" ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/80 to-transparent z-0"></div>
            </div>

            {/* Right Functional Canvas */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 bg-surface relative">
                {/* Mobile Brand (Visible only on small screens) */}
                <div className="mb-16 w-full max-w-lg lg:hidden">
                    <BrandLogo size="lg" showTagline />
                </div>

                <div className="max-w-md w-full mx-auto lg:mx-0">
                    {/* Form Header */}
                    <div className="mb-12">
                        <h2 className="text-4xl font-bold text-foreground font-headline mb-4 tracking-tight">Access Dashboard</h2>
                        <p className="text-base text-muted-foreground font-body leading-relaxed">Enter your official Fantasy Premier League Team ID below. You can find this in the URL of your team points page on the official FPL site.</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div>
                            <label className="block text-[0.75rem] font-bold text-foreground font-label uppercase tracking-widest mb-3" htmlFor="team_id">
                                FPL Team ID
                            </label>
                            <input 
                                className={`block w-full px-4 py-5 bg-background border-2 ${error ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'} text-foreground font-body text-lg rounded-md focus:outline-none transition-colors`} 
                                id="team_id" 
                                name="team_id" 
                                placeholder="e.g. 1234567" 
                                required 
                                type="text"
                                value={entryId}
                                onChange={(e) => {
                                    setEntryId(e.target.value);
                                    if (error) setError('');
                                }}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive border border-destructive rounded-md font-body text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            className="w-full flex items-center justify-center gap-3 py-5 px-8 border-2 border-transparent rounded-lg shadow-sm text-lg font-bold font-label text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all group disabled:opacity-50 disabled:cursor-not-allowed" 
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Connecting...' : 'View Live Analytics'}
                        </button>
                    </form>

                    {/* Security Signal */}
                    <div className="mt-12 p-6 bg-muted rounded-lg border border-border flex items-start gap-4">
                        <span className="material-symbols-outlined text-muted-foreground mt-0.5">lock</span>
                        <p className="text-sm font-body text-muted-foreground">
                            <strong>100% Secure & Read-Only.</strong> We only require read access to public FPL data to generate your live insights and mini-league tracking.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
