import {ipcMain, dialog} from "electron"
import {
    deleteAnnotation,
    createAnnotation,
    updateAnnotation,
    OverlapError
} from "../../../domain/services/data/command/label.command.js";

import {exportLabels, getAllLabels} from "../../../domain/services/data/query/label.query.js";
import {saveLabelsToCSV} from "../../../domain/services/file/writer/csv.writer.js";
import {saveLabelToExcel} from "../../../domain/services/file/writer/excel.writer.js";
import {getInputFileName} from "../../../domain/services/data/query/session.query.js";
import path from "node:path";
import fs from "node:fs";


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

ipcMain.removeAllListeners('label:exportCsv')
ipcMain.on('label:export', async (event, sessionId) => {
    const data = exportLabels(sessionId)
    const fileManager = await dialog.showSaveDialog({
        title: 'Export Labels to CSV',
        defaultPath: `labels_session_${sessionId}.csv`,
        filters: [
            { name: 'CSV Files', extensions: ['csv'] }
        ]
    })
    if (!fileManager.canceled && fileManager.filePath) {
        await saveLabelsToCSV(data, fileManager.filePath)
    }
})

ipcMain.removeHandler('label:exportExcel')
ipcMain.on('label:exportExcel', async (event, sessionId, channelId) => {
    try {
        const inputFileName = getInputFileName(sessionId)
            .replace(path.extname(getInputFileName(sessionId)), '')
        const fileManager = await dialog.showSaveDialog({
            title: 'Export Labels to CSV',
            defaultPath: `${inputFileName}.xlsx`,
            filters: [
                { name: 'Excel Files', extensions: ['xlsx'] }
            ]
        })
        if (fileManager.canceled || !fileManager.filePath) return
        const chosenPath = fileManager.filePath
        const baseDir = path.dirname(chosenPath)
        const baseName = path.basename(chosenPath)
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const folderName = `${day}-${month}-${year}`;
        const targetDir = path.join(baseDir, folderName);
        await fs.promises.mkdir(targetDir, { recursive: true })
        const targetPath = path.join(targetDir, baseName)
        await saveLabelToExcel(channelId, targetPath)
    } catch (error) {
        dialog.showErrorBox('Export Error', error.message)
        console.trace(error)
    }
})


ipcMain.removeHandler('label:getAll')
ipcMain.handle('label:getAll', () => {
    try {
        return getAllLabels()
    } catch (error) {
        dialog.showErrorBox('Label Retrieval Error', error.message)
    }
})