import {fetchSessionDashboard} from "../api/index.js";
import {useEffect, useState} from "react";

export default function Dashboard({ sessionId }) {

    const [session, setSession] = useState(null)
    const [channels, setChannels] = useState([])
    const [selectedChannelId, setSelectedChannelId] = useState(null)
    const [signal, setSignal] = useState(null)

    useEffect(() => {
        fetchSessionDashboard(sessionId)
            .then((data) => {
                setSession(data.session);
                setChannels(data.session?.channels || []);
                const defaultId = data.defaultChannel?.channelId || null;
                setSelectedChannelId(defaultId);
                setSignal(data.defaultChannel?.signal || null);
                console.log(JSON.stringify(data));
            })
            .catch((e) => {
                console.error(e);
            });
    }, [sessionId]);

    return (
        <>
        </>
    )
}