import ExcelJS from "exceljs";
import {shell} from "electron";
import Annotation from "../../../../persistence/dao/annotation.dao.js";
import Channel from "../../../../persistence/dao/channel.dao.js";

export async function saveLabelToExcel(channelId, filePath) {
    const workbook = new ExcelJS.Workbook();
    const channelSheet = workbook.addWorksheet('Channels');
    channelSheet.columns = [
        { header: 'data_kind', key: 'dataKind', width: 15 },
        { header: 'raw_samples', key: 'rawSamples', width: 20 },
        { header: 'raw_sample_unit', key: 'rawSampleUnit', width: 15 },
        { header: 'sampling_frequency', key: 'samplingFrequency', width: 20 },
        { header: 'subsampled', key: 'subsampled', width: 15 },
        { header: 'frequency_unit', key: 'frequencyUnit', width: 15 },
        { header: 'duration', key: 'duration', width: 15 },
        { header: 'duration_unit', key: 'durationUnit', width: 15 },
    ];
    const labelSheet = workbook.addWorksheet('Labels');
    labelSheet.columns = [
        { header: 'label_name', key: 'labelName', width: 20 },
        { header: 'start_time', key: 'startTime', width: 15 },
        { header: 'end_time', key: 'endTime', width: 15 },
        { header: 'time_unit', key: 'timeUnit', width: 10 },
        { header: 'note', key: 'note', width: 30 },
    ];

    const channel = Channel.findOneById(channelId, true);

    if (channel) {
        let samplesArray = [];
        if (channel.rawSamplesUv) {
            try {
                let parsedData = channel.rawSamplesUv;
                while (typeof parsedData === 'string') {
                    try {
                        parsedData = JSON.parse(parsedData);
                    } catch (e) {
                        break;
                    }
                }
                if (Array.isArray(parsedData)) {
                    samplesArray = parsedData;
                } else {
                    samplesArray = [parsedData];
                }
            } catch (e) {
                console.error(`Error processing samples for channel ${channelId}`, e);
            }
        }

        if (samplesArray.length > 0) {
            for (let i = 0; i < samplesArray.length; i++) {
                channelSheet.addRow({
                    dataKind: (i === 0) ? channel.dataKind : null,
                    rawSamples: samplesArray[i],
                    rawSampleUnit: (i === 0) ? 'uV' : null,
                    samplingFrequency: (i === 0) ? channel.samplingFrequencyKhz : null,
                    subsampled: (i === 0) ? channel.subsampledKhz : null,
                    frequencyUnit: (i === 0) ? 'kHz' : null,
                    duration: (i === 0) ? channel.durationMs : null,
                    durationUnit: (i === 0) ? 'ms' : null
                });
            }
        } else {
            channelSheet.addRow({
                dataKind: channel.dataKind,
                rawSamples: "",
                rawSampleUnit: 'uV',
                samplingFrequency: channel.samplingFrequencyKhz,
                subsampled: channel.subsampledKhz,
                frequencyUnit: 'kHz',
                duration: channel.durationMs,
                durationUnit: 'ms'
            });
        }
        const annotations = Annotation.findByChannelId(channelId);
        if (annotations && annotations.length > 0) {
            annotations.forEach(ann => {
                labelSheet.addRow({
                    labelName: ann.label_name || 'Unknown',
                    startTime: ann.start_time_ms,
                    endTime: ann.end_time_ms,
                    timeUnit: 'ms',
                    note: ann.note || ''
                });
            });
        }
    }
    await workbook.xlsx.writeFile(filePath);
    const openResult = await shell.openPath(filePath);
    if (openResult) {
        console.warn(`Failed to open exported file: ${openResult}`);
    }

    return filePath;
}