'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTeamBadgeUrls } from '@/lib/player-photo-utils';

export function TeamBadgeImage({
    teamCode,
    className,
    alt = '',
}: {
    teamCode: number;
    className?: string;
    alt?: string;
}) {
    const urls = useMemo(() => getTeamBadgeUrls(teamCode), [teamCode]);
    const [i, setI] = useState(0);

    useEffect(() => {
        setI(0);
    }, [teamCode]);

    return (
        <img
            src={urls[i] ?? urls[0]}
            alt={alt}
            className={className}
            onError={() => setI((x) => (x < urls.length - 1 ? x + 1 : x))}
        />
    );
}
