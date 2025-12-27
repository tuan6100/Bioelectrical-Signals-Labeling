import {ipcMain, dialog} from "electron"
import {
    deleteAnnotation,
    createAnnotation,
    updateAnnotation,
    OverlapError
} from "../../../domain/services/data/command/label.command.js";

import {getAllLabels} from "../../../domain/services/data/query/label.query.js";
import {saveSessionToExcel} from "../../../domain/services/file/writer/excel.writer.js";
import {getInputFileName} from "../../../domain/services/data/query/session.query.js";
import path from "node:path";
import fs from "node:fs";
import Store from "electron-store";

const store = new Store();

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
        console.log(`Update field: ${JSON.stringify(updateFields)}`)
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

ipcMain.removeHandler('label:exportExcel')
ipcMain.on('label:exportExcel', async (event, sessionId) => {
    const inputFileName = getInputFileName(sessionId)
        .replace(path.extname(getInputFileName(sessionId)), '')
    const lastExportDir = store.get('lastExportDir');
    let defaultPath = `${inputFileName}.xlsx`;
    if (lastExportDir) {
        defaultPath = path.join(lastExportDir, `${inputFileName}.xlsx`);
    }

    const fileManager = await dialog.showSaveDialog({
        title: 'Export Labels to CSV',
        defaultPath: defaultPath,
        filters: [
            { name: 'Excel Files', extensions: ['xlsx'] }
        ]
    })
    if (fileManager.canceled || !fileManager.filePath) return
    const chosenPath = fileManager.filePath
    const baseDir = path.dirname(chosenPath)
    store.set('lastExportDir', baseDir);
    const baseName = path.basename(chosenPath)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const folderName = `${day}-${month}-${year}`;
    const targetDir = path.join(baseDir, folderName);
    await fs.promises.mkdir(targetDir, { recursive: true })
    const targetPath = path.join(targetDir, baseName)
    try {
        await saveSessionToExcel(sessionId, targetPath)
    } catch (error) {
        if (error.code === 'EBUSY' || error.code === 'EPERM') {
            const response = await dialog.showMessageBox({
                type: 'warning',
                buttons: ['Retry', 'Cancel'],
                defaultId: 0,
                title: 'File is opening',
                message: 'Please close the file before exporting labels.',
            })
            if (response.response === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                return await saveSessionToExcel(sessionId, targetPath)
            }
        } else {
            dialog.showErrorBox('Export Error', error.message)
            console.trace(error)
        }
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