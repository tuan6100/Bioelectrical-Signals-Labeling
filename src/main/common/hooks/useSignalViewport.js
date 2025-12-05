import {useState, useCallback, useEffect} from 'react';

const INITIAL_ZOOM_MS = 100;

export function useSignalViewport(durationMs) {
    const [viewport, setViewport] = useState(() => ({
        startMs: 0,
        endMs: durationMs || INITIAL_ZOOM_MS
    }));

    useEffect(() => {
        if (durationMs && isFinite(durationMs)) {
            setViewport(vp => {
                const newEnd = Math.min(vp.endMs, durationMs);
                const newStart = Math.min(vp.startMs, Math.max(0, newEnd - 1));
                if (newStart === vp.startMs && newEnd === vp.endMs) {
                    return vp;
                }
                return { startMs: newStart, endMs: newEnd };
            });
        }
    }, [durationMs]);

    const updateViewport = useCallback((vp) => {
        setViewport({
            startMs: Math.max(0, vp.startMs),
            endMs: Math.max(vp.endMs, vp.startMs + 1)
        });
    }, []);

    const resetViewport = useCallback(() => {
        if (durationMs > INITIAL_ZOOM_MS) {
            setViewport({
                startMs: 0,
                endMs: INITIAL_ZOOM_MS
            });
        } else {
            setViewport({
                startMs: 0,
                endMs: durationMs || INITIAL_ZOOM_MS
            });
        }
    }, [durationMs]);

    return { viewport, updateViewport, resetViewport };
}
