import {ipcMain, dialog} from "electron"
import {
    deleteAnnotation,
    deleteLabel, exportLabels,
    createAnnotation,
    updateAnnotation,
    updateLabel, OverlapError
} from "../../../domain/services/data/command/label.command.js";

import {getAllLabels} from "../../../domain/services/data/query/label.query.js";
import {saveLabelsToCSV} from "../../../domain/services/file/writer/csv.writer.js";


ipcMain.removeHandler('annotation:create')
ipcMain.handle('annotation:create', (event, labelDto) => {
    try {
        return createAnnotation(
            labelDto.channelId,
            labelDto.startTime,
            labelDto.endTime,
            labelDto.name,
            labelDto.note
        )
    } catch (error) {
        if (!(error instanceof OverlapError)) {
            dialog.showErrorBox('Label Creation Error', error.message)
        }
        console.trace(error.message)
    }
})

ipcMain.removeHandler('annotation:update')
ipcMain.handle('annotation:update', (event, annotationId, updateFields) => {
    try {
        return updateAnnotation(annotationId, updateFields)
    } catch (error) {
        if (!(error instanceof OverlapError)) {
            dialog.showErrorBox('Annotation Update Error', error.message)
        }
            console.trace(error.message)
    }
})

ipcMain.removeHandler('annotation:delete')
ipcMain.handle('annotation:delete', (event, annotationId) => {
    try {
        return deleteAnnotation(annotationId)
    } catch (error) {
        dialog.showErrorBox('Annotation Deletion Error', error.message)
    }
})

ipcMain.removeAllListeners('label:export')
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

ipcMain.removeHandler('label:getAll')
ipcMain.handle('label:getAll', (event) => {
    try {
        return getAllLabels()
    } catch (error) {
        dialog.showErrorBox('Label Retrieval Error', error.message)
    }
})

ipcMain.removeHandler('label:update')
ipcMain.handle('label:update', (event, labelId, updateFields) => {
    try {
        return updateLabel(labelId, updateFields)
    } catch (error) {
        dialog.showErrorBox('Label Update Error', error.message)
    }

})

ipcMain.removeHandler('label:delete')
ipcMain.handle('label:delete', (event, labelId) => {
    try {
        return deleteLabel(labelId)
    } catch (error) {
        dialog.showErrorBox('Label Deletion Error', error.message)
    }

})