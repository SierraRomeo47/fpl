'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Flame, DollarSign, Brain, Sparkles, ArrowRight } from 'lucide-react';
import { FixtureDifficulty } from './fixture-difficulty';
import { getPlayerPhotoUrls, getTeamBadgeUrl, getPlayerInitials } from '@/lib/player-photo-utils';
import { hasFavorableFixtures } from '@/lib/fixture-utils';

interface EnhancedPlayerCardProps {
    player: any;
    team: any;
    teams: any[];
    fixtures: any[];
    currentEvent: number;
    rank?: number;
    onClick?: () => void;
}

function getAIAnalysisTags(player: any): Array<{ text: string; icon: any; color: string }> {
    const tags: Array<{ text: string; icon: any; color: string }> = [];
    const form = parseFloat(player.form) || 0;
    const ownership = parseFloat(player.selected_by_percent) || 0;
    const price = player.now_cost / 10;
    const expectedPoints = parseFloat(player.ep_next) || 0;

    // Solid performer
    if (form >= 6.0) {
        tags.push({
            text: `Solid performer averaging ${form.toFixed(1)} points/game`,
            icon: Flame,
            color: 'text-orange-500'
        });
    }

    // Budget friendly
    if (price <= 5.5 && player.total_points > 30) {
        tags.push({
            text: `Budget friendly at £${price.toFixed(1)}m`,
            icon: DollarSign,
            color: 'text-green-500'
        });
    }

    // Expected points
    if (expectedPoints >= 6.0) {
        tags.push({
            text: `Expected ${expectedPoints.toFixed(1)} pts next GW`,
            icon: Brain,
            color: 'text-cyan-500'
        });
    }

    return tags.slice(0, 2);
}



export function EnhancedPlayerCard({
    player,
    team,
    teams,
    fixtures,
    currentEvent,
    rank,
    onClick
}: EnhancedPlayerCardProps) {
    const [photoUrlIndex, setPhotoUrlIndex] = useState(0);
    const [photoFailed, setPhotoFailed] = useState(false);
    const photoUrls = getPlayerPhotoUrls({ code: player.code, photo: player.photo, web_name: player.web_name, team: player.team });

    const aiTags = getAIAnalysisTags(player);
    const form = parseFloat(player.form) || 0;
    const ownership = parseFloat(player.selected_by_percent) || 0;
    const price = player.now_cost / 10;
    const ppm = player.now_cost > 0 ? (player.total_points / (player.now_cost / 10)) : 0;
    const expectedPoints = parseFloat(player.ep_next) || 0;

    const handlePhotoError = () => {
        if (photoUrlIndex < photoUrls.length - 1) {
            // Try next URL
            setPhotoUrlIndex(photoUrlIndex + 1);
        } else {
            // All URLs failed, show fallback
            setPhotoFailed(true);
        }
    };

    return (
        <button
            onClick={onClick}
            className="w-full bg-card/50 border border-primary/20 rounded-lg p-4 text-left hover:bg-card/70 hover:border-primary/40 transition-all relative group"
        >
            {/* Rank Badge - Top Left */}
            {rank && (
                <Badge
                    variant="outline"
                    className="absolute top-2 left-2 text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 z-10"
                >
                    #{rank}
                </Badge>
            )}

            {/* Player Header with Team Badge */}
            <div className="flex items-start gap-3 mb-3">
                {/* Player Photo with Team Badge Overlay */}
                <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-500/10">
                        {!photoFailed ? (
                            <img
                                key={photoUrlIndex}
                                src={photoUrls[photoUrlIndex]}
                                alt={player.web_name}
                                className="w-full h-full object-cover"
                                onError={handlePhotoError}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                                {getPlayerInitials(player.web_name)}
                            </div>
                        )}
                    </div>
                    {/* Team Badge */}
                    {team && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border border-primary/30 overflow-hidden">
                            <img
                                src={getTeamBadgeUrl(team.code)}
                                alt={team.short_name}
                                className="w-full h-full object-contain p-0.5"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Player Name & Team */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{player.web_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{team?.name || 'Unknown'}</p>
                </div>
            </div>

            {/* AI Analysis Tags */}
            {aiTags.length > 0 && (
                <div className="mb-3 p-2 bg-primary/5 rounded border border-primary/10">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-semibold">AI Analysis</span>
                    </div>
                    <div className="space-y-1">
                        {aiTags.map((tag, idx) => {
                            const Icon = tag.icon;
                            return (
                                <div key={idx} className="flex items-center gap-1 text-[9px]">
                                    <Icon className={`w-3 h-3 ${tag.color}`} />
                                    <span className={tag.color}>{tag.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Metrics Grid (4 columns) */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
                <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                    <p className="text-[9px] text-gray-700 font-bold">Form</p>
                    <p className="font-bold text-xs text-primary">{form.toFixed(1)}</p>
                </div>
                <div className="text-center p-2 bg-[--success]/10 rounded border border-[--success]/20">
                    <p className="text-[9px] text-gray-700 font-bold">Points</p>
                    <p className="font-bold text-xs text-gray-900">{player.total_points}</p>
                </div>
                <div className="text-center p-2 bg-[--warning]/10 rounded border border-[--warning]/20">
                    <p className="text-[9px] text-gray-700 font-bold">Price</p>
                    <p className="font-bold text-xs text-gray-900">£{price.toFixed(1)}m</p>
                </div>
                <div className="text-center p-2 bg-accent/10 rounded border border-accent/20">
                    <p className="text-[9px] text-gray-700 font-bold">Own</p>
                    <p className="font-bold text-xs text-gray-900">{ownership.toFixed(1)}%</p>
                </div>
            </div>

            {/* Secondary Metrics Grid (2x2) */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
                <div className="text-center p-1.5 bg-accent/10 rounded border border-accent/20">
                    <p className="text-[9px] text-gray-700 font-bold">Pts/£m</p>
                    <p className="font-bold text-sm text-gray-900">{ppm.toFixed(1)}</p>
                </div>
                <div className="text-center p-1.5 bg-secondary/10 rounded border border-secondary/20">
                    <p className="text-[9px] text-gray-700 font-bold">Bonus</p>
                    <p className="font-bold text-sm text-gray-900">{player.bonus || 0}</p>
                </div>
                <div className="text-center p-1.5 bg-secondary/10 rounded border border-secondary/20">
                    <p className="text-[9px] text-gray-700 font-bold">Minutes</p>
                    <p className="font-bold text-sm text-gray-900">{player.minutes || 0}</p>
                </div>
                <div className="text-center p-1.5 bg-primary/10 rounded border border-primary/20">
                    <p className="text-[9px] text-gray-700 font-bold">xPts</p>
                    <p className="font-bold text-sm text-primary">{expectedPoints.toFixed(1)}</p>
                </div>
            </div>

            {/* Fixture Difficulty */}
            <div className="mb-2">
                <p className="text-[10px] text-muted-foreground mb-1.5">Next 5 Fixtures:</p>
                <FixtureDifficulty
                    teamId={team?.id || player.team}
                    fixtures={fixtures}
                    teams={teams}
                    currentEvent={currentEvent}
                />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-primary/10">
                <span className="text-muted-foreground">{ownership.toFixed(1)}% owned</span>
                <span className="text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    View Details <ArrowRight className="w-3 h-3" />
                </span>
            </div>
        </button>
    );
}
