import Label from "../../../../persistence/dao/label.dao.js"
import Annotation from "../../../../persistence/dao/annotation.dao.js"
import Channel from "../../../../persistence/dao/channel.dao.js"
import Session from "../../../../persistence/dao/session.dao.js";

export function getAllLabels() {
    return Label.findAll().filter(l => l.name.toLowerCase() !== 'pending')
}

function prepareChannelData(channel) {
    if (!channel) {
        return {
            channel: null,
            samplesArray: [],
            annotations: []
        }
    }

    let samplesArray = []
    if (channel.rawSamplesUv) {
        try {
            let parsedData = channel.rawSamplesUv
            // Parse cho đến khi ra object/array (xử lý trường hợp double stringify)
            while (typeof parsedData === 'string') {
                try {
                    parsedData = JSON.parse(parsedData)
                } catch (e) {
                    break
                }
            }
            samplesArray = Array.isArray(parsedData) ? parsedData : [parsedData]
        } catch (e) {
            console.error(`Error processing samples for channel ${channel.channelId}`, e)
        }
    }

    let annotations = Annotation.findByChannelId(channel.channelId) || []
    const freq = channel.subsampledKhz ?? channel.samplingFrequencyKhz;

    const processedAnnotations = annotations.map(ann => {
        const startIndex = Math.floor(ann.start_time_ms * freq);
        const endIndex = Math.floor(ann.end_time_ms * freq);
        return {
            ...ann,
            sampleStartIndex: startIndex,
            sampleEndIndex: endIndex,
            excelRowStart: startIndex + 2, // +2 vì row header của Excel là 1, data bắt đầu từ 2
            excelRowEnd: endIndex + 2
        };
    });

    return {
        channel,
        samplesArray,
        annotations: processedAnnotations
    }
}

export function exportLabels(channelId) {
    const channel = Channel.findOneById(channelId, true)
    return prepareChannelData(channel)
}

export function exportSessionData(sessionId) {
    const relatedInfo = Session.findAllRelatedById(sessionId)
    if (!relatedInfo) {
        throw new Error("Session not found")
    }
    const channelsData = []
    if (relatedInfo && relatedInfo.channels) {
        for (const chRef of relatedInfo.channels) {
            const fullChannel = Channel.findOneById(chRef.channelId, true)
            if (fullChannel) {
                channelsData.push(prepareChannelData(fullChannel))
            }
        }
    }
    const session = new Session(
        relatedInfo.sessionId,
        relatedInfo.patientId,
        relatedInfo.sessionMeasurementType,
        relatedInfo.sessionStartTime,
        relatedInfo.sessionEndTime,
        relatedInfo.sessionStatus,
        relatedInfo.inputFileName,
        null,
        relatedInfo.sessionUpdatedAt
    )
    return {
        session,
        channelsData: channelsData.sort((a, b) => a.channel.channelNumber - b.channel.channelNumber)
    }
}