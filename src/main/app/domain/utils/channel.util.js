import Channel from "../../persistence/dao/channel.dao.js"

function toNumber(v) {
    if (v === null || v === undefined) return null
    if (typeof v === "number") return Number.isFinite(v) ? v : null
    let s = String(v).trim()
    if (!s) return null
    s = s.replace(/\s+/g, "")
    if (s.includes(",") && s.includes(".")) {
        s = s.replace(/,/g, "")
    } else if (s.includes(",")) {
        s = s.replace(/,/g, ".")
    }
    const num = parseFloat(s)
    return isNaN(num) ? null : num
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
    ]
    for (const pattern of patterns) {
        const foundKey = Object.keys(data).find(k => k.trim().toLowerCase() === pattern.trim().toLowerCase())
        if (foundKey) return { key: foundKey, value: data[foundKey] }
    }
    const normalizedBase = baseKey.replace(/\s+/g, " ").trim().toLowerCase()
    for (const [k, v] of Object.entries(data)) {
        const normalizedKey = k.replace(/\s+/g, " ").trim().toLowerCase()
        if (normalizedKey.includes(normalizedBase)) {
            return { key: k, value: v }
        }
    }
    return null
}

function getUnitScale(valueObj) {
    const adcKey = Object.keys(valueObj).find(k => k.toLowerCase().includes("adc unit"))
    if (!adcKey) return 1.0
    const val = toNumber(valueObj[adcKey])
    if (isNaN(val)) return 1.0
    const keyLower = adcKey.toLowerCase()
    if (keyLower.includes("mv")) {
        return val * 1000.0
    }
    return val
}

function deriveScale(matchedKey, dataObj, containerObj) {
    const keyStr = (matchedKey || "").toLowerCase()
    if (keyStr.includes("(µv)") || keyStr.includes("(uv)")) return 1.0
    if (keyStr.includes("(mv)")) return 1000.0
    let scale = getUnitScale(dataObj || {})
    if (scale !== 1.0) return scale
    scale = getUnitScale(containerObj || {})
    return scale || 1.0
}

function parseRawSamples(raw, scale = 1.0) {
    if (!raw) return []
    let arr = []
    if (typeof raw === "string") {
        let trimmed = raw.trim()
        if (trimmed.startsWith("[")) {
            try {
                arr = JSON.parse(trimmed)
            } catch {
                arr = trimmed.split(",").map(v => parseFloat(v))
            }
        } else if (trimmed.includes(",")) {
            arr = trimmed
                .split(",")
                .map(v => parseFloat(v.trim()))
                .filter(v => !isNaN(v))
        } else {
            const single = parseFloat(trimmed)
            if (!isNaN(single)) arr = [single]
        }
    } else if (Array.isArray(raw)) {
        arr = raw.map(v => parseFloat(v))
    }
    return arr.map(v => Number((v * scale).toFixed(8)))
}

export function     extractChannelsFromJson(jsonData, sessionId) {
    const channels = []
    const traceSweeps = []
    const longTraceSweeps = []
    let lastChannelNumber = null

    function walk(obj) {
        if (!obj || typeof obj !== "object") return
        for (const [_, value] of Object.entries(obj)) {
            if (!value || typeof value !== "object") continue

            if ("LongTrace Data" in value) {
                const data = value["LongTrace Data"]
                const chKey = findDataKey(data, 'Channel number')?.value || findDataKey(value, 'Channel number')?.value
                const channelNumber = parseInt(chKey) || lastChannelNumber || 1
                lastChannelNumber = channelNumber
                const found = findDataKey(data, "LongTrace Data") || findDataKey(data, "Sweep Data")
                if (found && found.value) {
                    const scale = deriveScale(found?.key || null, data, value)
                    const samples = parseRawSamples(found?.value, scale)
                    if (samples.length > 0) {
                        const subKhz = toNumber(data["Subsampled(kHz)"]) ?? toNumber(data["Sampling Frequency(kHz)"]) ?? null
                        const durationMs = subKhz ? (samples.length / subKhz) : (toNumber(data["Sweep Duration(ms)"]) ?? null)
                        longTraceSweeps.push({
                            channelNumber,
                            samples,
                            subsampledKhz: subKhz,
                            samplingFrequencyKhz: toNumber(data["Sampling Frequency(kHz)"]) ?? subKhz,
                            durationMs
                        })
                    }
                }
            } else if ("Trace Data" in value) {
                const data = value["Trace Data"]
                const chKey = findDataKey(data, 'Channel number')?.value || findDataKey(value, 'Channel number')?.value
                const channelNumber = parseInt(chKey) || lastChannelNumber || 1
                lastChannelNumber = channelNumber
                const found = findDataKey(data, "Sweep Data")
                if (found && found.value) {
                    const scale = deriveScale(found?.key || null, data, value)
                    const samples = parseRawSamples(found?.value, scale)
                    traceSweeps.push({
                        channelNumber,
                        samples,
                        samplingFrequency: toNumber(data["Sampling Frequency(kHz)"]) ?? null,
                        subsampled: toNumber(data["Subsampled(kHz)"]) ?? null,
                        duration: toNumber(data["Sweep Duration(ms)"]) ?? null,
                    })
                }
            } else if ("Store Data" in value) {
                const data = value["Store Data"];
                const channelNumber = parseInt(data["Channel Number"]) || lastChannelNumber || 1;
                lastChannelNumber = channelNumber;
                const found = findDataKey(data, "Averaged Data")
                if (found && found.value) {
                    const scale = deriveScale(found?.key || null, data, value)
                    const samples = parseRawSamples(found?.value, scale)
                    const ch = new Channel(
                        null,
                        sessionId,
                        channelNumber,
                        "Averaged Data",
                        JSON.stringify(samples),
                        parseFloat(data["Sampling Frequency(kHz)"]) || null,
                        parseFloat(data["Subsampled(kHz)"]) || null,
                        parseFloat(data["Sweep Duration(ms)"]) || null,
                        null,
                    );
                    channels.push(ch);
                }
            }

            walk(value)
        }
    }
    walk(jsonData)

    if (longTraceSweeps.length > 0) {
        const longTraceByChannel = {}
        for (const lt of longTraceSweeps) {
            const chNum = lt.channelNumber
            if (!longTraceByChannel[chNum]) longTraceByChannel[chNum] = []
            longTraceByChannel[chNum].push(lt)
        }
        for (const [chNumStr, lts] of Object.entries(longTraceByChannel)) {
            const first = lts[0]
            const combinedSamples = lts.flatMap(s => s.samples)
            const subKhz = first.subsampledKhz || 19.2
            const totalDurationMs = combinedSamples.length / subKhz
            const ltChannel = new Channel(
                null,
                sessionId,
                parseInt(chNumStr),
                'LongTrace Data',
                JSON.stringify(combinedSamples),
                first.samplingFrequencyKhz,
                first.subsampledKhz,
                totalDurationMs
            )
            channels.push(ltChannel)
        }
    }

    if (traceSweeps.length > 0) {
        const sweepsByChannel = {}
        for (const sweep of traceSweeps) {
            const chNum = sweep.channelNumber
            if (!sweepsByChannel[chNum]) sweepsByChannel[chNum] = []
            sweepsByChannel[chNum].push(sweep)
        }
        for (const [chNumStr, sweeps] of Object.entries(sweepsByChannel)) {
            const firstTrace = sweeps[0]
            const combinedSamples = sweeps.flatMap(sweep => sweep.samples)
            const subKhz = firstTrace.subsampled || 19.2
            const totalDurationMs = combinedSamples.length / subKhz
            const combinedTraceChannel = new Channel(
                null,
                sessionId,
                parseInt(chNumStr),
                'Trace Data',
                JSON.stringify(combinedSamples),
                firstTrace.samplingFrequency,
                firstTrace.subsampled,
                totalDurationMs
            )
            channels.push(combinedTraceChannel)
        }
    }

    return channels
}
