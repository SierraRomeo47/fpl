'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            const res = await fetch(`/api/fpl/entry/${id}`);

            if (!res.ok) {
                throw new Error('Team ID not found');
            }

            const data = await res.json();

            // Save to session
            await fetch('/api/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entryId: id,
                    teamName: data.name,
                    playerName: `${data.player_first_name} ${data.player_last_name}`
                }),
            });

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to find team. Please check your ID.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border border-border bg-card shadow-2xl">
                <CardHeader className="space-y-6 text-center pb-8 pt-8">
                    <div className="flex justify-center">
                        <div className="w-28 h-28 flex items-center justify-center">
                            <Image 
                                src="/logo.svg" 
                                alt="FPL DnD Logo" 
                                width={112} 
                                height={112} 
                                className="w-full h-full"
                                priority
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <CardTitle className="text-4xl font-bold text-foreground">
                            FPL DnD
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground">
                            Enter your FPL Team ID to get started
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="entryId" className="text-sm font-medium">
                                Team ID
                            </label>
                            <Input
                                id="entryId"
                                type="number"
                                placeholder="e.g. 6167064"
                                value={entryId}
                                onChange={(e) => setEntryId(e.target.value)}
                                required
                                className="text-lg"
                            />
                            <p className="text-xs text-muted-foreground">
                                Find your Team ID in your FPL URL: fantasy.premierleague.com/entry/<strong>YOUR_ID</strong>/
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? 'Connecting...' : 'View Dashboard'}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-border">
                        <p className="text-xs text-muted-foreground text-center">
                            ✅ No cookies needed! All public FPL data via secure proxy.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
