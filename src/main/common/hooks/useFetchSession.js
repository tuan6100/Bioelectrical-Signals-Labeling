import { useState, useEffect, useRef } from 'react';
import { fetchSessionWorkspace, fetchChannelSamples, fetchChannelAnnotations } from "../api/index.js";

export function useFetchSession(sessionId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);
    const [channels, setChannels] = useState([]);
    const [channelId, setChannelId] = useState(null);
    const [defaultSignal, setDefaultSignal] = useState(null);
    const [labels, setLabels] = useState([]);
    const fetchIdRef = useRef(0);

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionStatusUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionStatusUpdated(updatedSession => {
                if (updatedSession.sessionId === sessionId) {
                    setSession(prev => ({
                        ...prev,
                        status: updatedSession.status,
                        updatedAt: updatedSession.updatedAt
                    }));
                }
            });
            return () => unsubscribe();
        }
    }, [sessionId]);

    const formatAnnotations = (list) => {
        if (!Array.isArray(list)) return [];
        return list.map(a => ({
            annotationId: a.annotationId,
            startTimeMs: a.startTimeMs ?? a.startTime,
            endTimeMs: a.endTimeMs ?? a.endTime,
            labelName: a.label?.name || a.labelName || 'Unknown',
            note: a.note || null,
            timeline: a.timeline,
            label: a.label || null
        }));
    };

    const processAnnotations = (signal) => {
        if (signal?.annotations) {
            const ann = Array.isArray(signal.annotations) ? signal.annotations : [signal.annotations];
            return formatAnnotations(ann);
        }
        return [];
    };

    const saveSignalToCache = (sId, cId, signalData) => {
        if (!signalData || !cId) return;
        try {
            const cacheKey = `signalCache_${sId}`;
            const cachedSignals = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
            const { annotations, ...signalWithoutAnnotations } = signalData;
            cachedSignals[cId] = signalWithoutAnnotations;
            sessionStorage.setItem(cacheKey, JSON.stringify(cachedSignals));
        } catch (e) {
            console.error("Failed to write signal to sessionStorage:", e);
        }
    };

    useEffect(() => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);
        fetchSessionWorkspace(sessionId)
            .then(data => {
                setSession(data.session || null);
                const chs = data.session?.channels || [];
                setChannels(chs);
                const sig = data.defaultChannel?.signal || null;
                const cid = data.defaultChannel?.channelId || (chs.length ? chs[0].channelId : null);
                if (sig && cid) {
                    saveSignalToCache(sessionId, cid, sig);
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
        const fetchId = ++fetchIdRef.current;
        const cacheKey = `signalCache_${sessionId}`;

        let cachedSignal = null;
        try {
            const cachedSignals = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
            if (cachedSignals[channelId]) {
                cachedSignal = cachedSignals[channelId];
            }
        } catch (e) {
            console.error("Failed to read from sessionStorage cache:", e);
        }
        if (cachedSignal) {
            setDefaultSignal(cachedSignal);
            setLoading(true);
            fetchChannelAnnotations(channelId)
                .then(annotations => {
                    if (fetchId === fetchIdRef.current) {
                        setLabels(formatAnnotations(annotations));
                    }
                })
                .catch(err => {
                    if (fetchId === fetchIdRef.current) {
                        console.error("Error fetching annotations for cached signal:", err);
                    }
                })
                .finally(() => {
                    if (fetchId === fetchIdRef.current) {
                        setLoading(false);
                    }
                });
            return;
        }
        setLoading(true);
        fetchChannelSamples(channelId)
            .then(sig => {
                if (fetchId === fetchIdRef.current) {
                    if (sig) {
                        saveSignalToCache(sessionId, channelId, sig);
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