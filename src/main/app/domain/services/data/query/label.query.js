import Label from "../../../../persistence/dao/label.dao.js"
import Annotation from "../../../../persistence/dao/annotation.dao.js"
import Channel from "../../../../persistence/dao/channel.dao.js"

export function getAllLabels() {
    return Label.findAll().filter(l => l.name.toLowerCase() !== 'pending')
}

export function exportLabels(channelId) {
    const channel = Channel.findOneById(channelId, true)
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
            while (typeof parsedData === 'string') {
                try {
                    parsedData = JSON.parse(parsedData)
                } catch (e) {
                    break
                }
            }
            samplesArray = Array.isArray(parsedData) ? parsedData : [parsedData]
        } catch (e) {
            console.error(`Error processing samples for channel ${channelId}`, e)
        }
    }
    let annotations = Annotation.findByChannelId(channelId) || []
    const freq = channel.subsampledKhz ?? channel.samplingFrequencyKhz;
    const processedAnnotations = annotations.map(ann => {
        const startIndex = Math.floor(ann.start_time_ms * freq);
        const endIndex = Math.floor(ann.end_time_ms * freq);
        return {
            ...ann,
            sampleStartIndex: startIndex,
            sampleEndIndex: endIndex,
            excelRowStart: startIndex + 3,
            excelRowEnd: endIndex + 3
        };
    });
    return {
        channel,
        samplesArray,
        annotations: processedAnnotations
    }
}