import Channel from "@biosignal/app/persistence/dao/channel.dao.js";

function toNumber(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    let s = String(v).trim();
    if (!s) return null;
    s = s.replace(/\s+/g, "");
    if (s.includes(",") && s.includes(".")) {
        s = s.replace(/,/g, "");
    } else if (s.includes(",")) {
        s = s.replace(/,/g, ".");
    }
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
}

function findDataKey(data, baseKey) {
    const patterns = [
        `${baseKey}(mV)<1920>`,
        `${baseKey}(mV)<96000>`,
        `${baseKey}(µV)<1920>`,
        `${baseKey}(µV)<96000>`,
        `${baseKey}<1920>`,
        `${baseKey}<96000>`,
        `${baseKey}(mV)`,
        `${baseKey}(µV)`,
        baseKey
    ];
    for (const pattern of patterns) {
        const foundKey = Object.keys(data).find(k => k.trim().toLowerCase() === pattern.trim().toLowerCase());
        if (foundKey) return { key: foundKey, value: data[foundKey] };
    }
    const normalizedBase = baseKey.replace(/\s+/g, " ").trim().toLowerCase();
    for (const [k, v] of Object.entries(data)) {
        const normalizedKey = k.replace(/\s+/g, " ").trim().toLowerCase();
        if (normalizedKey.includes(normalizedBase)) {
            return { key: k, value: v };
        }
    }
    return null;
}

function getUnitScale(valueObj) {
    const adcKey = Object.keys(valueObj).find(k => k.toLowerCase().includes("adc unit"));
    if (!adcKey) return 1.0;
    const val = toNumber(valueObj[adcKey]);
    if (isNaN(val)) return 1.0;
    const keyLower = adcKey.toLowerCase();
    if (keyLower.includes("mv")) {
        return val * 1000.0;
    }
    return val;
}

function deriveScale(matchedKey, dataObj, containerObj) {
    const keyStr = (matchedKey || "").toLowerCase();
    if (keyStr.includes("(µv)") || keyStr.includes("(uv)")) return 1.0;
    if (keyStr.includes("(mv)")) return 1000.0;
    let scale = getUnitScale(dataObj || {});
    if (scale !== 1.0) return scale;
    scale = getUnitScale(containerObj || {});
    return scale || 1.0;
}

function parseRawSamples(raw, scale = 1.0) {
    if (!raw) return [];
    let arr = [];
    if (typeof raw === "string") {
        let trimmed = raw.trim();
        if (trimmed.startsWith("[")) {
            try {
                arr = JSON.parse(trimmed);
            } catch {
                arr = trimmed.split(",").map(v => parseFloat(v));
            }
        } else if (trimmed.includes(",")) {
            arr = trimmed
                .split(",")
                .map(v => parseFloat(v.trim()))
                .filter(v => !isNaN(v));
        } else {
            const single = parseFloat(trimmed);
            if (!isNaN(single)) arr = [single];
        }
    } else if (Array.isArray(raw)) {
        arr = raw.map(v => parseFloat(v));
    }
    return arr.map(v => Number((v * scale).toFixed(8)));
}

/**
 * Extracts channel information from JSON data and creates channel objects.
 *
 * @param {Object} jsonData - The JSON data containing channel information.
 * @param {string} sessionId - The session ID associated with the channels.
 * @returns {Channel[]} - An array of Channel objects.
 */
export function extractChannelsFromJson(jsonData, sessionId) {
    const channels = [];
    let lastChannelNumber = null;
    function walk(obj) {
        if (!obj || typeof obj !== "object") return;
        for (const [key, value] of Object.entries(obj)) {
            if (!value || typeof value !== "object") continue;
            if ("Store Data" in value) {
                const data = value["Store Data"];
                const channelNumber = parseInt(data["Channel Number"]) || lastChannelNumber || 0;
                lastChannelNumber = channelNumber;
                const found = findDataKey(data, "Averaged Data");
                const scale = deriveScale(found?.key || null, data, value);
                const samples = parseRawSamples(found?.value, scale);
                const ch = new Channel(
                    null,
                    sessionId,
                    channelNumber,
                    "average",
                    null,
                    JSON.stringify(samples),
                    toNumber(data["Sampling Frequency(kHz)"]) ?? null,
                    toNumber(data["Subsampled(kHz)"]) ?? null,
                    toNumber(data["Sweep Duration(ms)"]) ?? null,
                    null,
                    data["Algorithm"] || null
                );
                channels.push(ch);
            }

            if ("Trace Data" in value) {
                const data = value["Trace Data"];
                const channelNumber = parseInt(data["Channel Number"]) || lastChannelNumber || 0;
                lastChannelNumber = channelNumber;
                const found = findDataKey(data, "Sweep  Data");
                const scale = deriveScale(found?.key || null, data, value);
                const samples = parseRawSamples(found?.value, scale);
                const ch = new Channel(
                    null,
                    sessionId,
                    channelNumber,
                    "trace",
                    parseInt(key) || null,
                    JSON.stringify(samples),
                    toNumber(data["Sampling Frequency(kHz)"]) ?? null,
                    toNumber(data["Subsampled(kHz)"]) ?? null,
                    toNumber(data["Sweep Duration(ms)"]) ?? null,
                    null,
                    data["Algorithm"] || null
                );
                channels.push(ch);
            }

            if ("LongTrace Data" in value) {
                const data = value["LongTrace Data"];
                const channelNumber = parseInt(data["Channel Number"]) || lastChannelNumber || 0;
                lastChannelNumber = channelNumber;
                const found = findDataKey(data, "LongTrace Data");
                const scale = deriveScale(found?.key || null, data, value);
                const samples = parseRawSamples(found?.value, scale);
                const ch = new Channel(
                    null,
                    sessionId,
                    channelNumber,
                    "longtrace",
                    null,
                    JSON.stringify(samples),
                    toNumber(data["Sampling Frequency(kHz)"]) ?? null,
                    toNumber(data["Subsampled(kHz)"]) ?? null,
                    toNumber(data["Sweep Duration(ms)"]) ?? null,
                    toNumber(data["Trace Duration(ms)"]) ?? null,
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

