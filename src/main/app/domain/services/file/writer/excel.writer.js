import ExcelJS from "exceljs"
import {shell} from "electron"
import {exportSessionData} from "../../data/query/label.query.js"

export async function saveSessionToExcel(sessionId, filePath) {
    const data = exportSessionData(sessionId)
    if (!data || !data.session) {
        console.error("Session not found")
        return null
    }
    let { session, channelsData } = data
    if (session.status === 'REQUEST_DOUBLE_CHECK') {
        session.status = 'WAIT_FOR_DOUBLE_CHECK'
    }
    const workbook = new ExcelJS.Workbook()
    const sessionSheet = workbook.addWorksheet('Session Info')

    sessionSheet.columns = [
        { header: 'session_id', key: 'session_id', width: 15 },
        { header: 'patient_id', key: 'patient_id', width: 20 },
        { header: 'measurement_type', key: 'measurement_type', width: 20 },
        { header: 'start_time', key: 'start_time', width: 25 },
        { header: 'end_time', key: 'end_time', width: 25 },
        { header: 'status', key: 'status', width: 25 },
        { header: 'input_file_name', key: 'input_file_name', width: 30, style: { alignment: { wrapText: true, vertical: 'top' } } },
        { header: 'updated_at', key: 'updated_at', width: 25 }
    ]
    sessionSheet.addRow({
        session_id: session.sessionId,
        patient_id: session.patientId,
        measurement_type: session.measurementType,
        start_time: session.startTime,
        end_time: session.endTime,
        status: session.status,
        input_file_name: session.inputFileName,
        updated_at: session.updatedAt
    })
    sessionSheet.getRow(1).font = { bold: true }

    for (const item of channelsData) {
        const { channel, samplesArray, annotations } = item
        const chNum = channel.channelNumber
        const sheetNameChannel = `Channel_${chNum}`
        const sheetNameLabel = `Labels_${chNum}`
        const channelSheet = workbook.addWorksheet(sheetNameChannel)

        channelSheet.columns = [
            { header: 'data_kind', key: 'dataKind', width: 15 },
            { header: 'raw_samples', key: 'rawSamples', width: 20, style: { alignment: { wrapText: true } } },
            { header: 'raw_sample_unit', key: 'rawSampleUnit', width: 15 },
            { header: 'sampling_frequency', key: 'samplingFrequency', width: 20 },
            { header: 'subsampled', key: 'subsampled', width: 15 },
            { header: 'frequency_unit', key: 'frequencyUnit', width: 15 },
            { header: 'duration', key: 'duration', width: 15 },
            { header: 'duration_unit', key: 'durationUnit', width: 15 },
            { header: 'channel_id', key: 'channelId', width: 10 },
            { header: 'channel_number', key: 'channelNumber', width: 10 }
        ]

        if (samplesArray.length > 0) {
            for (let i = 0; i < samplesArray.length; i++) {
                channelSheet.addRow({
                    dataKind: (i === 0) ? 'EEG' : null,
                    rawSamples: samplesArray[i],
                    rawSampleUnit: (i === 0) ? 'uV' : null,
                    samplingFrequency: (i === 0) ? channel.samplingFrequencyKhz : null,
                    subsampled: (i === 0) ? channel.subsampledKhz : null,
                    frequencyUnit: (i === 0) ? 'kHz' : null,
                    duration: (i === 0) ? channel.durationMs : null,
                    durationUnit: (i === 0) ? 'ms' : null,
                    channelId: (i === 0) ? channel.channelId : null,
                    channelNumber: (i === 0) ? channel.channelNumber : null
                })
            }
        } else {
            channelSheet.addRow({
                rawSamples: "",
                samplingFrequency: channel.samplingFrequencyKhz,
                subsampled: channel.subsampledKhz,
                duration: channel.durationMs,
                channelId: channel.channelId,
                channelNumber: channel.channelNumber
            })
        }

        const labelSheet = workbook.addWorksheet(sheetNameLabel)

        labelSheet.columns = [
            { header: 'label_name', key: 'labelName', width: 20, style: { alignment: { wrapText: true, vertical: 'top' } } },
            { header: 'start_time', key: 'startTime', width: 15 },
            { header: 'end_time', key: 'endTime', width: 15 },
            { header: 'time_unit', key: 'timeUnit', width: 10 },
            { header: 'start_index', key: 'startIndex', width: 15 },
            { header: 'end_index', key: 'endIndex', width: 15 },
            { header: 'note', key: 'note', width: 30, style: { alignment: { wrapText: true, vertical: 'top' } } },
        ]

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
                    hyperlink: `#'${sheetNameChannel}'!B${ann.excelRowStart}`,
                    tooltip: 'Go to start sample'
                };
                startIndexCell.font = { color: { argb: 'FF0000FF' }, underline: true };

                const endIndexCell = row.getCell('endIndex');
                endIndexCell.value = {
                    text: ann.excelRowEnd,
                    hyperlink: `#'${sheetNameChannel}'!B${ann.excelRowEnd}`,
                    tooltip: 'Go to end sample'
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