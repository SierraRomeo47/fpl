'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    getPlayerPhotoUrls,
    getTeamBadgeUrls,
    getPlayerInitials,
    PLAYER_HEADSHOT_IMG_CLASSNAME,
    type PlayerPhotoOptions,
} from '@/lib/player-photo-utils';

export type PlayerAvatarProps = {
    player: PlayerPhotoOptions & { id?: number };
    /** FotMob id when known — adds FotMob CDN URLs to the fallback chain */
    fotmobPlayerId?: number;
    /** Premier League club badge code from `teams[].code` */
    teamBadgeCode?: number;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    imgClassName?: string;
    /** Use 40×40 CDN tiles (e.g. header search results) */
    dense?: boolean;
};

const sizeClasses: Record<NonNullable<PlayerAvatarProps['size']>, string> = {
    xs: 'w-8 h-8 min-w-8 min-h-8 text-[10px]',
    sm: 'w-10 h-10 min-w-10 min-h-10 text-xs',
    md: 'w-16 h-16 min-w-16 min-h-16 text-xl',
    lg: 'w-28 h-28 min-w-28 min-h-28 text-4xl',
    xl: 'w-24 h-24 md:w-40 md:h-40 min-w-24 min-h-24 md:min-w-40 md:min-h-40 text-5xl',
};

export function PlayerAvatar({
    player,
    fotmobPlayerId,
    teamBadgeCode,
    size = 'md',
    className = '',
    imgClassName = '',
    dense,
}: PlayerAvatarProps) {
    const photoOpts: PlayerPhotoOptions = useMemo(
        () => ({
            code: player.code,
            photo: player.photo,
            web_name: player.web_name,
            team: player.team,
            elementId: player.elementId ?? player.id,
            fotmobId: fotmobPlayerId ?? player.fotmobId,
        }),
        [player.code, player.photo, player.web_name, player.team, player.elementId, player.id, fotmobPlayerId, player.fotmobId]
    );

    const urls = useMemo(
        () =>
            getPlayerPhotoUrls(photoOpts, {
                size: dense ? '40x40' : '250x250',
            }),
        [photoOpts, dense]
    );

    const badgeUrls = useMemo(
        () => (teamBadgeCode != null ? getTeamBadgeUrls(teamBadgeCode) : []),
        [teamBadgeCode]
    );

    const [idx, setIdx] = useState(0);
    const [badgeIdx, setBadgeIdx] = useState(0);
    const [phase, setPhase] = useState<'photo' | 'badge' | 'initials'>('photo');

    useEffect(() => {
        setIdx(0);
        setBadgeIdx(0);
        setPhase('photo');
    }, [urls.join('|'), teamBadgeCode]);

    const frame = cn(
        sizeClasses[size],
        'rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted border border-border',
        className
    );

    if (phase === 'initials') {
        return (
            <div className={`${frame} bg-gradient-to-br from-white to-gray-100`}>
                <span className={`font-bold text-gray-800 ${imgClassName}`}>
                    {getPlayerInitials(player.web_name)}
                </span>
            </div>
        );
    }

    if (phase === 'badge' && badgeUrls.length > 0) {
        return (
            <div className={frame}>
                <img
                    src={badgeUrls[badgeIdx] ?? badgeUrls[0]}
                    alt=""
                    className={`w-full h-full object-contain p-0.5 ${imgClassName}`}
                    onError={() => {
                        if (badgeIdx < badgeUrls.length - 1) {
                            setBadgeIdx(badgeIdx + 1);
                        } else {
                            setPhase('initials');
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className={frame}>
            <img
                src={urls[idx] ?? urls[0]}
                alt={player.web_name}
                className={cn('w-full h-full', PLAYER_HEADSHOT_IMG_CLASSNAME, imgClassName)}
                onError={() => {
                    if (idx < urls.length - 1) {
                        setIdx(idx + 1);
                    } else if (badgeUrls.length > 0) {
                        setPhase('badge');
                    } else {
                        setPhase('initials');
                    }
                }}
            />
        </div>
    );
}
