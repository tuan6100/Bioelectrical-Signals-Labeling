import ExcelJS from "exceljs";

export async function readExcelSession(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sessionSheet = workbook.getWorksheet('Session Info');
    if (!sessionSheet) {
        throw new Error("Invalid Excel file: Missing 'Session Info' sheet");
    }

    const sessionData = {};
    const headerRow = sessionSheet.getRow(1);
    const dataRow = sessionSheet.getRow(2);

    headerRow.eachCell((cell, colNumber) => {
        const header = cell.value;
        if (header) {
            sessionData[header] = dataRow.getCell(colNumber).value;
        }
    });

    const annotations = [];
    const channels = [];

    for (const sheet of workbook.worksheets) {
        if (sheet.name.startsWith('Labels_')) {
            const channelNumber = parseInt(sheet.name.split('_')[1]);
            const headers = {};
            sheet.getRow(1).eachCell((cell, colNumber) => {
                headers[cell.value] = colNumber;
            });

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    let labelName = row.getCell(headers['label_name']).value;
                    if (labelName && typeof labelName === 'object' && labelName.text) {
                        labelName = labelName.text;
                    }
                    annotations.push({
                        channelNumber: channelNumber,
                        labelName: labelName,
                        startTime: row.getCell(headers['start_time']).value,
                        endTime: row.getCell(headers['end_time']).value,
                        note: row.getCell(headers['note'])?.value || ''
                    });
                }
            });
        }
        if (sheet.name.startsWith('Channel_')) {
            const channelNumber = parseInt(sheet.name.split('_')[1]);
            const headers = {};
            sheet.getRow(1).eachCell((cell, colNumber) => {
                headers[cell.value] = colNumber;
            });
            const samples = [];
            let metadata = {};
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 2) {
                    metadata = {
                        channelId: row.getCell(headers['channel_id']).value,
                        channelNumber: row.getCell(headers['channel_number']).value,
                        samplingFrequencyKhz: row.getCell(headers['sampling_frequency']).value,
                        subsampledKhz: row.getCell(headers['subsampled']).value,
                        durationMs: row.getCell(headers['duration']).value,
                    };
                }
                if (rowNumber > 1) {
                    const val = row.getCell(headers['raw_samples']).value;
                    if (val !== null && val !== undefined && val !== "") {
                        samples.push(val);
                    }
                }
            });
            if (Object.keys(metadata).length > 0) {
                channels.push({
                    ...metadata,
                    channelNumber: channelNumber,
                    rawSamplesUv: JSON.stringify(samples)
                });
            }
        }
    }

    return {
        session: sessionData,
        annotations: annotations,
        channels: channels
    };
}