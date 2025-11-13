import {ipcMain, dialog} from "electron";
import {exportLabels, persistLabel} from "../../../domain/services/data/command/label.command.js";
import {saveLabelsToCSV} from "../../../domain/services/file/writer/csv.writer.js";

ipcMain.handle('label:create', (event, labelDto) => {
    return persistLabel(
        labelDto.channelId,
        labelDto.startTime,
        labelDto.endTime,
        labelDto.name,
        labelDto.note
    )
})

ipcMain.on('label:export', async (event, sessionId) => {
    const data = exportLabels(sessionId)
    const result = await dialog.showSaveDialog({
        title: 'Export Labels to CSV',
        defaultPath: `labels_session_${sessionId}.csv`,
        filters: [
            { name: 'CSV Files', extensions: ['csv'] }
        ]
    })
    if (!result.canceled && result.filePath) {
        await saveLabelsToCSV(data, result.filePath)
    }
})