import {ipcMain, dialog} from "electron";
import {exportLabels, persistLabel, updateLabel, deleteLabel, updateAnnotation, deleteAnnotation} from "../../../domain/services/data/command/label.command.js";
import {getAllLabels} from "../../../domain/services/data/query/label.query.js";
import {saveLabelsToCSV} from "../../../domain/services/file/writer/csv.writer.js";

ipcMain.handle('label:create', (event, labelDto) => {
    try {
        return persistLabel(
            labelDto.channelId,
            labelDto.startTime,
            labelDto.endTime,
            labelDto.name,
            labelDto.note
        )
    } catch (error) {
        dialog.showErrorBox('Label Create Error', error.message || String(error))
        throw error
    }
})

ipcMain.handle('label:getAll', (event) => {
    return getAllLabels();
})

ipcMain.handle('label:update', (event, labelId, updateFields) => {
    return updateLabel(labelId, updateFields);
})

ipcMain.handle('label:delete', (event, labelId) => {
    return deleteLabel(labelId);
})

ipcMain.handle('annotation:update', (event, annotationId, updateFields) => {
    try {
        return updateAnnotation(annotationId, updateFields);
    } catch (error) {
        dialog.showErrorBox('Annotation Update Error', error.message || String(error))
        throw error
    }
})

ipcMain.handle('annotation:delete', (event, annotationId) => {
    try {
        return deleteAnnotation(annotationId);
    } catch (error) {
        dialog.showErrorBox('Annotation Delete Error', error.message || String(error))
        throw error
    }
})

ipcMain.handle('dialog:showError', (event, title, message) => {
    dialog.showErrorBox(title, message);
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