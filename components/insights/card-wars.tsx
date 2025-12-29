'use client';

import { Trophy, Swords, Shield, Zap, Target, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { InsightsPitchView } from './insights-pitch-view';
import { motion } from 'framer-motion';

interface CardWarsProps {
    myTeam: any[]; // Array of picks
    alternateTeam: any[]; // Array of picks
    myTeamPlayers: any[]; // Array of player elements
    alternateTeamPlayers: any[]; // Array of player elements
    teams: any[];
    fixtures: any[];
    currentEvent: number;
    myTeamBudget: number;
    alternateTeamBudget: number;
    onPlayerClick: (player: any) => void;
}

export function CardWars({
    myTeam,
    alternateTeam,
    myTeamPlayers,
    alternateTeamPlayers,
    teams,
    fixtures,
    currentEvent,
    myTeamBudget,
    alternateTeamBudget,
    onPlayerClick
}: CardWarsProps) {
    
    // Calculate team stats
    const calculateTeamStats = (players: any[]) => {
        const totalPoints = players.reduce((sum, p) => sum + (p.total_points || 0), 0);
        const avgForm = players.reduce((sum, p) => sum + (parseFloat(p.form) || 0), 0) / players.length;
        const totalValue = players.reduce((sum, p) => sum + (p.now_cost || 0), 0) / 10;
        const avgICT = players.reduce((sum, p) => sum + (parseFloat(p.ict_index) || 0), 0) / players.length;
        const totalGoals = players.reduce((sum, p) => sum + (p.goals_scored || 0), 0);
        const totalAssists = players.reduce((sum, p) => sum + (p.assists || 0), 0);
        const totalCleanSheets = players.reduce((sum, p) => sum + (p.clean_sheets || 0), 0);
        const avgExpectedPoints = players.reduce((sum, p) => sum + (parseFloat(p.ep_next) || 0), 0) / players.length;
        
        return {
            totalPoints,
            avgForm: avgForm.toFixed(1),
            totalValue: totalValue.toFixed(1),
            avgICT: avgICT.toFixed(1),
            totalGoals,
            totalAssists,
            totalCleanSheets,
            avgExpectedPoints: avgExpectedPoints.toFixed(1)
        };
    };

    const myStats = calculateTeamStats(myTeamPlayers);
    const alternateStats = calculateTeamStats(alternateTeamPlayers);

    // Determine winner for each stat
    const compareStat = (myValue: number, altValue: number, higherBetter: boolean = true) => {
        if (higherBetter) {
            if (myValue > altValue) return 'win';
            if (myValue < altValue) return 'lose';
        } else {
            if (myValue < altValue) return 'win';
            if (myValue > altValue) return 'lose';
        }
        return 'tie';
    };

    // Calculate overall winner
    const myWins = [
        compareStat(parseFloat(myStats.totalPoints), parseFloat(alternateStats.totalPoints)),
        compareStat(parseFloat(myStats.avgForm), parseFloat(alternateStats.avgForm)),
        compareStat(parseFloat(myStats.avgICT), parseFloat(alternateStats.avgICT)),
        compareStat(parseFloat(myStats.totalGoals), parseFloat(alternateStats.totalGoals)),
        compareStat(parseFloat(myStats.totalAssists), parseFloat(alternateStats.totalAssists)),
        compareStat(parseFloat(myStats.totalCleanSheets), parseFloat(alternateStats.totalCleanSheets)),
        compareStat(parseFloat(myStats.avgExpectedPoints), parseFloat(alternateStats.avgExpectedPoints))
    ].filter(result => result === 'win').length;

    const altWins = [
        compareStat(parseFloat(myStats.totalPoints), parseFloat(alternateStats.totalPoints)),
        compareStat(parseFloat(myStats.avgForm), parseFloat(alternateStats.avgForm)),
        compareStat(parseFloat(myStats.avgICT), parseFloat(alternateStats.avgICT)),
        compareStat(parseFloat(myStats.totalGoals), parseFloat(alternateStats.totalGoals)),
        compareStat(parseFloat(myStats.totalAssists), parseFloat(alternateStats.totalAssists)),
        compareStat(parseFloat(myStats.totalCleanSheets), parseFloat(alternateStats.totalCleanSheets)),
        compareStat(parseFloat(myStats.avgExpectedPoints), parseFloat(alternateStats.avgExpectedPoints))
    ].filter(result => result === 'lose').length;

    const overallWinner = myWins > altWins ? 'myTeam' : myWins < altWins ? 'alternate' : 'tie';

    const StatCard = ({ label, myValue, altValue, icon: Icon, unit = '' }: any) => {
        const result = compareStat(
            typeof myValue === 'string' ? parseFloat(myValue) : myValue,
            typeof altValue === 'string' ? parseFloat(altValue) : altValue
        );
        
        const myVal = typeof myValue === 'number' ? myValue.toFixed(1) : myValue;
        const altVal = typeof altValue === 'number' ? altValue.toFixed(1) : altValue;

        return (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border-2 border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    {Icon && <Icon className="w-4 h-4 text-orange-500" />}
                    <span className="text-xs font-bold text-gray-300 uppercase">{label}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    {/* My Team */}
                    <div className={`rounded-lg p-3 text-center border-2 ${
                        result === 'win' ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-500' :
                        result === 'lose' ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500' :
                        'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500'
                    }`}>
                        <p className="text-xl font-black text-white">{myVal}{unit}</p>
                        {result === 'win' && <Trophy className="w-4 h-4 mx-auto mt-1 text-yellow-300" />}
                        {result === 'lose' && <Target className="w-4 h-4 mx-auto mt-1 text-red-300" />}
                    </div>
                    
                    {/* Alternate Team */}
                    <div className={`rounded-lg p-3 text-center border-2 ${
                        result === 'lose' ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-500' :
                        result === 'win' ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500' :
                        'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500'
                    }`}>
                        <p className="text-xl font-black text-white">{altVal}{unit}</p>
                        {result === 'lose' && <Trophy className="w-4 h-4 mx-auto mt-1 text-yellow-300" />}
                        {result === 'win' && <Target className="w-4 h-4 mx-auto mt-1 text-red-300" />}
                    </div>
                </div>
            </div>
        );
    };

    const getTeam = (teamId: number) => teams.find((t: any) => t.id === teamId);
    const myTeamPicksMap = new Map(myTeam.map((pick: any) => [pick.element, pick]));
    const alternateTeamPicksMap = new Map(alternateTeam.map((pick: any) => [pick.element, pick]));

    return (
        <div className="space-y-6">
            {/* Battle Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-700 to-red-700 p-6 border-4 border-orange-400 shadow-2xl"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
                
                <div className="relative z-10 text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Swords className="w-12 h-12 text-white animate-pulse" />
                        <h2 className="text-4xl font-black text-white tracking-wider drop-shadow-lg">
                            CARD WARS
                        </h2>
                        <Swords className="w-12 h-12 text-white animate-pulse" />
                    </div>
                    
                    {/* Score Display */}
                    <div className="flex items-center justify-center gap-6 mb-4">
                        <div className={`flex-1 max-w-xs rounded-xl p-4 border-4 ${
                            overallWinner === 'myTeam' ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400 shadow-lg' :
                            overallWinner === 'alternate' ? 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-400' :
                            'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-400'
                        }`}>
                            <p className="text-xs font-bold text-white/80 mb-1 uppercase">Your Team</p>
                            <p className="text-3xl font-black text-white">{myWins}</p>
                            <p className="text-xs text-white/70">Wins</p>
                        </div>
                        
                        <div className="text-4xl font-black text-white">VS</div>
                        
                        <div className={`flex-1 max-w-xs rounded-xl p-4 border-4 ${
                            overallWinner === 'alternate' ? 'bg-gradient-to-br from-green-600 to-green-800 border-green-400 shadow-lg' :
                            overallWinner === 'myTeam' ? 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-400' :
                            'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-400'
                        }`}>
                            <p className="text-xs font-bold text-white/80 mb-1 uppercase">Best Alternate</p>
                            <p className="text-3xl font-black text-white">{altWins}</p>
                            <p className="text-xs text-white/70">Wins</p>
                        </div>
                    </div>

                    {/* Budget Display */}
                    <div className="flex items-center justify-center gap-4 text-sm">
                        <Badge variant="secondary" className="px-4 py-2">
                            Your Budget: £{myTeamBudget.toFixed(1)}m
                        </Badge>
                        <Badge variant="secondary" className="px-4 py-2">
                            Alternate Budget: £{alternateTeamBudget.toFixed(1)}m
                        </Badge>
                    </div>
                </div>
            </motion.div>

            {/* Stats Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Points" myValue={myStats.totalPoints} altValue={alternateStats.totalPoints} icon={Trophy} />
                <StatCard label="Avg Form" myValue={myStats.avgForm} altValue={alternateStats.avgForm} icon={TrendingUp} />
                <StatCard label="Avg ICT" myValue={myStats.avgICT} altValue={alternateStats.avgICT} icon={Zap} />
                <StatCard label="Total Goals" myValue={myStats.totalGoals} altValue={alternateStats.totalGoals} icon={Target} />
                <StatCard label="Total Assists" myValue={myStats.totalAssists} altValue={alternateStats.totalAssists} icon={Users} />
                <StatCard label="Clean Sheets" myValue={myStats.totalCleanSheets} altValue={alternateStats.totalCleanSheets} icon={Shield} />
                <StatCard label="Avg xPts (Next GW)" myValue={myStats.avgExpectedPoints} altValue={alternateStats.avgExpectedPoints} icon={TrendingUp} />
                <StatCard label="Team Value" myValue={myStats.totalValue} altValue={alternateStats.totalValue} icon={Trophy} unit="m" />
            </div>

            {/* Teams Side by Side */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* My Team */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className={`text-2xl font-black uppercase ${
                            overallWinner === 'myTeam' ? 'text-green-600' : 'text-gray-400'
                        }`}>
                            Your Team
                        </h3>
                        {overallWinner === 'myTeam' && (
                            <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
                        )}
                    </div>
                    
                    <InsightsPitchView
                        players={myTeamPlayers}
                        teams={teams}
                        fixtures={fixtures}
                        currentEvent={currentEvent}
                        onPlayerClick={onPlayerClick}
                        showRanks={false}
                        picksMap={myTeamPicksMap}
                    />
                </motion.div>

                {/* Alternate Team */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className={`text-2xl font-black uppercase ${
                            overallWinner === 'alternate' ? 'text-green-600' : 'text-gray-400'
                        }`}>
                            Best Alternate Team
                        </h3>
                        {overallWinner === 'alternate' && (
                            <Trophy className="w-8 h-8 text-yellow-500 animate-bounce" />
                        )}
                    </div>
                    
                    <InsightsPitchView
                        players={alternateTeamPlayers}
                        teams={teams}
                        fixtures={fixtures}
                        currentEvent={currentEvent}
                        onPlayerClick={onPlayerClick}
                        showRanks={false}
                        picksMap={alternateTeamPicksMap}
                    />
                </motion.div>
            </div>
        </div>
    );
}

