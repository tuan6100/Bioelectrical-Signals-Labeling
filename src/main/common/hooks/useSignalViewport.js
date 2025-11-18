import { useState, useCallback } from 'react';

export function useSignalViewport(durationMs) {
    const [viewport, setViewport] = useState(() => ({
        startMs: 0,
        endMs: durationMs ? Math.min(durationMs, 1000) : 1000
    }));

    const updateViewport = useCallback((vp) => {
        setViewport(vp);
    }, []);

    const resetViewport = useCallback(() => {
        setViewport({
            startMs: 0,
            endMs: durationMs || 1000
        });
    }, [durationMs]);

    return { viewport, updateViewport, resetViewport };
}