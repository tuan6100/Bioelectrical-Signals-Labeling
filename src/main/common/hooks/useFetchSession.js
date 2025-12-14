import { useState, useEffect} from 'react';
import { fetchSessionWorkspace} from "../api/index.js";

export function useFetchSession(sessionId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);
    const [channels, setChannels] = useState([]);
    const [channelId, setChannelId] = useState(null);
    const [defaultSignal, setDefaultSignal] = useState(null);
    const [labels, setLabels] = useState([]);

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