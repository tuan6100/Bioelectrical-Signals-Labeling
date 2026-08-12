import { useState, useCallback, useEffect, useRef } from 'react';

// Đưa mức zoom mặc định về lại đúng 100ms (Chuẩn tỷ lệ hiển thị điện cơ)
const INITIAL_ZOOM_MS = 100;

export function useSignalViewport(durationMs) {
    const [viewport, setViewport] = useState({
        startMs: 0,
        endMs: INITIAL_ZOOM_MS
    });

    const lastDurationRef = useRef(null);

    useEffect(() => {
        if (durationMs && durationMs !== lastDurationRef.current) {
            setViewport({
                startMs: 0,
                // Đảm bảo lấy đúng scale 100ms, trừ khi file tín hiệu quá ngắn (< 100ms)
                endMs: Math.min(durationMs, INITIAL_ZOOM_MS)
            });
            lastDurationRef.current = durationMs;
        }
    }, [durationMs]);

    const updateViewport = useCallback((vp) => {
        setViewport({
            startMs: Math.max(0, vp.startMs),
            endMs: Math.max(vp.endMs, vp.startMs + 1)
        });
    }, []);

    const resetViewport = useCallback(() => {
        setViewport({
            startMs: 0,
            endMs: Math.min(durationMs || INITIAL_ZOOM_MS, INITIAL_ZOOM_MS)
        });
    }, [durationMs]);

    return { viewport, updateViewport, resetViewport };
}