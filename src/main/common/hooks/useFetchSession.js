import { useState, useEffect, useRef } from 'react';
import { fetchSessionDashboard, fetchChannelSamples } from "../api/index.js";

export function useFetchSession(sessionId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);
    const [channels, setChannels] = useState([]);
    const [channelId, setChannelId] = useState(null);
    const [defaultSignal, setDefaultSignal] = useState(null);
    const [labels, setLabels] = useState([]);
    const fetchIdRef = useRef(0);

    const processAnnotations = (signal) => {
        if (signal?.annotations) {
            const ann = Array.isArray(signal.annotations) ? signal.annotations : [signal.annotations];
            return ann.map(a => ({
                annotationId: a.annotationId,
                startTimeMs: a.startTimeMs,
                endTimeMs: a.endTimeMs,
                labelName: a.label?.name || a.labelName || 'Unknown',
                note: a.note || null,
                timeline: a.timeline,
                label: a.label || null
            }));
        }
        return [];
    };

    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);
        fetchSessionDashboard(sessionId)
            .then(data => {
                setSession(data.session || null);
                const chs = data.session?.channels || [];
                setChannels(chs);
                const sig = data.defaultChannel?.signal || null;
                const cid = data.defaultChannel?.channelId || (chs.length ? chs[0].channelId : null);
                if (sig && cid) {
                    try {
                        const cacheKey = `signalCache_${sessionId}`;
                        const cachedSignals = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
                        cachedSignals[cid] = sig;
                        sessionStorage.setItem(cacheKey, JSON.stringify(cachedSignals));
                    } catch (e) {
                        console.error("Failed to write initial signal to sessionStorage:", e);
                    }
                }

                setDefaultSignal(sig || null);
                setChannelId(cid);
                setLabels(processAnnotations(sig));
            })
            .catch(err => {
                console.error(err);
                setError(err);
            })
            .finally(() => setLoading(false));
    }, [sessionId]);

    useEffect(() => {
        if (!channelId || !sessionId) return;
        const cacheKey = `signalCache_${sessionId}`;
        try {
            const cachedSignals = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
            if (cachedSignals[channelId]) {
                const cachedSignal = cachedSignals[channelId];
                setDefaultSignal(cachedSignal);
                setLabels(processAnnotations(cachedSignal));
                return;
            }
        } catch (e) {
            console.error("Failed to read from sessionStorage cache:", e);
        }
        const fetchId = ++fetchIdRef.current;
        setLoading(true);

        fetchChannelSamples(channelId)
            .then(sig => {
                if (fetchId === fetchIdRef.current) {
                    if (sig) {
                        try {
                            const cachedSignals = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
                            cachedSignals[channelId] = sig;
                            sessionStorage.setItem(cacheKey, JSON.stringify(cachedSignals));
                        } catch (e) {
                            console.error("Failed to write to sessionStorage cache:", e);
                        }
                    }
                    setDefaultSignal(sig || null);
                    setLabels(processAnnotations(sig));
                }
            })
            .catch(err => {
                if (fetchId === fetchIdRef.current) {
                    console.error(err);
                    setError(err);
                }
            })
            .finally(() => {
                if (fetchId === fetchIdRef.current) {
                    setLoading(false);
                }
            });

    }, [channelId, sessionId]);

    return {
        loading,
        error,
        session,
        channels,
        channelId,
        defaultSignal,
        labels,
        setChannelId,
        setLabels
    };
}
