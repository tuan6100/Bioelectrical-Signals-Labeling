import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllSessions } from '../api/index.js';

export function useSessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasLoaded, setHasLoaded] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchSessions = useCallback(async () => {
        if (loading) return;
        try {
            setLoading(true);
            setError("");
            const res = await fetchAllSessions();
            const allSessions = Array.isArray(res)
                ? res
                : (Array.isArray(res?.contents) ? res.contents : []);

            if (!mountedRef.current) return;
            setSessions(allSessions);
        } catch (e) {
            console.error(e);
            if (mountedRef.current) setError("Failed to load sessions.");
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setHasLoaded(true);
            }
        }
    }, [loading]);

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionStatusUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionStatusUpdated(updatedSession => {
                setSessions(prevSessions => prevSessions.map(s =>
                    s.sessionId === updatedSession.sessionId
                        ? { ...s, status: updatedSession.status, updatedAt: updatedSession.updatedAt }
                        : s
                ));
            });
            return () => unsubscribe();
        }
    }, []);

    useEffect(() => {
        if (window.biosignalApi?.on?.sessionsUpdated) {
            const unsubscribe = window.biosignalApi.on.sessionsUpdated(() => {
                fetchSessions();
            });
            return () => unsubscribe();
        }
    }, [fetchSessions]);

    const removeSession = (sessionId) => {
        setSessions(prev =>
            prev.filter(session => session.sessionId !== sessionId)
        );
    };

    return {
        sessions,
        loading,
        error,
        hasLoaded,
        fetchSessions,
        removeSession
    };
}