import { useState, useEffect } from 'react';
import { fetchSessionDashboard } from '../api';

export function useFetchSession(sessionId) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [session, setSession] = useState(null);
    const [channels, setChannels] = useState([]);
    const [channelId, setChannelId] = useState(null);
    const [defaultSignal, setDefaultSignal] = useState(null);
    const [samples, setSamples] = useState([]);
    const [samplingRate, setSamplingRate] = useState(null);
    const [durationMs, setDurationMs] = useState(null);
    const [labels, setLabels] = useState([]);

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
                setDefaultSignal(sig || null);
                const cid = data.defaultChannel?.channelId || (chs.length ? chs[0].channelId : null);
                setChannelId(cid);
                if (sig) {
                    setSamples(sig.samples || []);
                    setSamplingRate(sig.samplingRateHz || null);
                    setDurationMs(
                        sig.durationMs ||
                        (sig.samples?.length ? sig.samples[sig.samples.length - 1].time : null)
                    );
                    const ann = sig.annotations
                        ? Array.isArray(sig.annotations)
                            ? sig.annotations
                            : [sig.annotations]
                        : [];
                    setLabels(
                        ann.map(a => ({
                            annotationId: a.annotationId,
                            startTimeMs: a.startTimeMs,
                            endTimeMs: a.endTimeMs,
                            labelName: a.label?.name || a.labelName || 'Unknown',
                            note: a.note || null,
                            label: a.label || null
                        }))
                    );
                } else {
                    setSamples([]);
                    setLabels([]);
                    setSamplingRate(null);
                    setDurationMs(null);
                }
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
        samples,
        samplingRate,
        durationMs,
        labels,
        setChannelId,
        setSamples,
        setLabels
    };
}
