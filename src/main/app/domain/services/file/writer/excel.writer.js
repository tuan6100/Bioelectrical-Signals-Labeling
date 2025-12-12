import ExcelJS from "exceljs"
import {shell} from "electron"
import { exportLabels } from "../../data/query/label.query.js"

export async function saveLabelToExcel(channelId, filePath) {
    const workbook = new ExcelJS.Workbook()

    const channelSheet = workbook.addWorksheet('Channels')
    channelSheet.columns = [
        { header: 'data_kind', key: 'dataKind', width: 15 },
        { header: 'raw_samples', key: 'rawSamples', width: 20 }, // Cột B
        { header: 'raw_sample_unit', key: 'rawSampleUnit', width: 15 },
        { header: 'sampling_frequency', key: 'samplingFrequency', width: 20 },
        { header: 'subsampled', key: 'subsampled', width: 15 },
        { header: 'frequency_unit', key: 'frequencyUnit', width: 15 },
        { header: 'duration', key: 'duration', width: 15 },
        { header: 'duration_unit', key: 'durationUnit', width: 15 },
    ]

    const labelSheet = workbook.addWorksheet('Labels')
    labelSheet.columns = [
        { header: 'label_name', key: 'labelName', width: 20 },
        { header: 'start_time', key: 'startTime', width: 15 },
        { header: 'end_time', key: 'endTime', width: 15 },
        { header: 'time_unit', key: 'timeUnit', width: 10 },
        { header: 'start_index', key: 'startIndex', width: 15 },
        { header: 'end_index', key: 'endIndex', width: 15 },
        { header: 'note', key: 'note', width: 30 },
    ]
    const { channel, samplesArray, annotations } = exportLabels(channelId)
    if (channel) {
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
                })
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
            })
        }

        if (annotations && annotations.length > 0) {
            annotations.forEach(ann => {
                const row = labelSheet.addRow({
                    labelName: ann.label_name || 'Unknown',
                    startTime: ann.start_time_ms,
                    endTime: ann.end_time_ms,
                    timeUnit: 'ms',
                    startIndex: null,
                    endIndex: null,
                    note: ann.note || ''
                })
                const startIndexCell = row.getCell('startIndex');
                startIndexCell.value = {
                    text: ann.excelRowStart,
                    hyperlink: `#'Channels'!B${ann.excelRowStart}`,
                    tooltip: 'Đi tới mẫu bắt đầu'
                };
                startIndexCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                const endIndexCell = row.getCell('endIndex');
                endIndexCell.value = {
                    text: ann.excelRowEnd,
                    hyperlink: `#'Channels'!B${ann.excelRowEnd}`,
                    tooltip: 'Đi tới mẫu kết thúc'
                };
                endIndexCell.font = { color: { argb: 'FF0000FF' }, underline: true };
            })
        }
    }

    await workbook.xlsx.writeFile(filePath)
    const openResult = await shell.openPath(filePath)
    if (openResult) {
        console.warn(`Failed to open exported file: ${openResult}`)
    }

    return filePath
}