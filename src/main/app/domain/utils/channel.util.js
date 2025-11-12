import Channel from "../../persistence/dao/channel.dao.js";


export function extractChannelsFromJson(jsonData, sessionId) {
    const channels = [];
    let lastChannelNumber = null;

    function walk(obj) {
        if (!obj || typeof obj !== "object") return;
        for (const [key, value] of Object.entries(obj)) {
            if (!value || typeof value !== "object") continue;
            if ("Store Data" in value) {
                const data = value["Store Data"];
                const channelNumber = parseInt(data["Channel Number"]) || 0;
                lastChannelNumber = channelNumber || lastChannelNumber;

                const raw = data["Averaged Data(mV)<1920>"] || data["Averaged Data(mV)"] || null;

                const ch = new Channel(
                    sessionId,
                    channelNumber,
                    "average",
                    null,
                    raw ? JSON.stringify(raw.split(",").map(v => parseFloat(v.replace(",", ".").trim()))) : "[]",
                    parseFloat(data["Sampling Frequency(kHz)"]) || null,
                    parseFloat(data["Subsampled(kHz)"]) || null,
                    parseFloat(data["Sweep Duration(ms)"]) || null,
                    null,
                    data["Algorithm"] || null
                );

                channels.push(ch);
            }

            if ("Trace Data" in value) {
                const data = value["Trace Data"];
                const channelNumber = parseInt(data["Channel Number"]) || lastChannelNumber || 0;
                lastChannelNumber = channelNumber;
                const raw = data["Sweep  Data(mV)<1920>"] || data["Sweep  Data(mV)"] || null;
                const ch = new Channel(
                    sessionId,
                    channelNumber,
                    "trace",
                    parseInt(key) || null,
                    raw ? JSON.stringify(raw.split(",").map(v => parseFloat(v.replace(",", ".").trim()))) : "[]",
                    parseFloat(data["Sampling Frequency(kHz)"]) || null,
                    parseFloat(data["Subsampled(kHz)"]) || null,
                    parseFloat(data["Sweep Duration(ms)"]) || null,
                    null,
                    data["Algorithm"] || null
                );
                channels.push(ch);
            }

            if ("LongTrace Data" in value) {
                const data = value["LongTrace Data"];
                const channelNumber = parseInt(data["Channel Number"]) || lastChannelNumber || 0;
                lastChannelNumber = channelNumber;
                const raw = data["LongTrace Data(mV)<96000>"] || data["LongTrace Data(mV)"] || null;
                const ch = new Channel(
                    sessionId,
                    channelNumber,
                    "longtrace",
                    null,
                    raw ? JSON.stringify(raw.split(",").map(v => parseFloat(v.replace(",", ".").trim()))) : "[]",
                    parseFloat(data["Sampling Frequency(kHz)"]) || null,
                    parseFloat(data["Subsampled(kHz)"]) || null,
                    parseFloat(data["Sweep Duration(ms)"]) || null,
                    parseFloat(data["Trace Duration(ms)"]) || null,
                    data["Algorithm"] || null
                );
                channels.push(ch);
            }

            walk(value);
        }
    }

    walk(jsonData);
    return channels;
}
