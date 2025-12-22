import {app, dialog} from "electron"
import path from "node:path"
import fs from "node:fs"
import {readFile} from "../domain/services/file/reader/txt.reader.js"
import {persistExcelData, processAndPersistData} from "../domain/services/data/command/session.command.js"
import Store from "electron-store"
import {readExcelSession} from "../domain/services/file/reader/excel.reader.js";

const processTxtFiles = async (mainWindow, filePaths) => {
    if (!filePaths || filePaths.length === 0) {
        return
    }
    try {
        const outputBaseDir = app.getPath('userData')
        const outputStorageDir = path.join(outputBaseDir, 'Local Storage')
        if (!fs.existsSync(outputStorageDir)) {
            fs.mkdirSync(outputStorageDir, { recursive: true })
        }
        const fileReadPromises = filePaths.map(filePath => {
            const tempOutputPath = path.join(outputStorageDir, `temp-${path.basename(filePath)}-${Date.now()}.json`)
            return readFile(filePath, tempOutputPath)
                .finally(() => {
                    fs.promises.rm(tempOutputPath, { force: true }).catch(console.error)
                })
        })
        const results = await Promise.allSettled(fileReadPromises)
        const errors = []
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const resolved = result.value
                if (resolved.json !== null) {
                    processAndPersistData(resolved.inputFileName, resolved.json, resolved.sessionCode)
                } else {
                    console.log(`File already imported, session ID: ${resolved.sessionCode}`)
                }
            } else {
                errors.push({
                    file: path.basename(filePaths[index]),
                    reason: result.reason.message || String(result.reason)
                })
                console.error(`Failed to process file ${filePaths[index]}:`, result.reason)
            }
        })
        mainWindow.webContents.send("sessions:updated", { refresh: Date.now() })
        if (errors.length > 0) {
            const errorDetails = errors.map(e => `${e.file}: ${e.reason}`).join('\n')
            dialog.showErrorBox('File Processing Error', `Some files could not be processed:\n\n${errorDetails}`)
        }
    } catch (err) {
        console.error('Error processing files:', err)
        dialog.showErrorBox('Error', `An unexpected error occurred: ${err.message}`)
    }
}

const processExcelFiles = async (mainWindow, filePaths) => {
    if (!filePaths || filePaths.length === 0) return
    let successCount = 0;
    const errors = [];
    for (const filePath of filePaths) {
        try {
            const excelData = await readExcelSession(filePath);
            persistExcelData(excelData);
            successCount++;
        } catch (err) {
            console.error(`Error processing Excel ${filePath}:`, err);
            errors.push({ file: path.basename(filePath), reason: err.message });
        }
    }
    mainWindow.webContents.send("sessions:updated", { refresh: Date.now() });
    if (errors.length > 0) {
        dialog.showErrorBox('Import Excel Error', `Failed files:\n${errors.map(e => `${e.file}: ${e.reason}`).join('\n')}`);
    } else if (successCount > 0) {
        await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Import Successful',
            message: `Successfully updated ${successCount} session(s) from Excel.`
        });
    }
}

const importRawSubmenu = (mainWindow, defaultDir) => {
    const store = new Store()
    let lastOpenedDir = store.get('userPreferences.lastRawDir') ?? defaultDir
    return {
        label: 'Import Raw Data (.txt)',
        accelerator: 'CmdOrCtrl+I',
        click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Raw Signal Files',
                defaultPath: lastOpenedDir,
                properties: ['openFile', 'multiSelections'],
                filters: [{ name: 'Text Files', extensions: ['txt'] }],
            })

            if (canceled || filePaths.length === 0) return
            store.set('userPreferences.lastRawDir', path.dirname(filePaths[0]))
            await processTxtFiles(mainWindow, filePaths)
        },
    }
}

const importReviewedSubmenu = (mainWindow, defaultDir) => {
    const store = new Store()
    let lastOpenedDir = store.get('userPreferences.lastExcelDir') ?? defaultDir
    return {
        label: 'Import Reviewed Data (.xlsx)',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Import Reviewed Excel Files',
                defaultPath: lastOpenedDir,
                properties: ['openFile', 'multiSelections'],
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
            })

            if (canceled || filePaths.length === 0) return
            store.set('userPreferences.lastExcelDir', path.dirname(filePaths[0]))
            await processExcelFiles(mainWindow, filePaths)
        },
    }
}

const openFolderSubmenu = (mainWindow, defaultDir) => {
    const store = new Store()
    let lastOpenedDir = store.get('userPreferences.lastOpenedDir')?? defaultDir
    const getAllFiles = async (dir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true })
        const files = await Promise.all(entries.map(entry => {
            const res = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                return getAllFiles(res)
            }
            return res.endsWith('.txt') ? res : null
        }))
        return files.flat().filter(Boolean)
    }

    return {
        label: 'Open Folder',
        accelerator: 'CmdOrCtrl+O',
        click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Open Folder',
                defaultPath: lastOpenedDir,
                properties: ['openDirectory'],
            })
            if (canceled || !filePaths || filePaths.length === 0) {
                return
            }
            const folderPath = filePaths[0]
            lastOpenedDir = folderPath
            try {
                const filesInFolder = await getAllFiles(folderPath)
                if (filesInFolder.length === 0) {
                    await dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'No Text Files Found',
                        message: 'The selected folder and its subdirectories contain no .txt files.',
                    })
                    return
                }
                await processFiles(mainWindow, filesInFolder)
                store.set('userPreferences.lastOpenedDir', lastOpenedDir)
            } catch (err) {
                console.error('Error reading folder:', err)
                dialog.showErrorBox('Error Reading Folder', `An error occurred while reading the folder: ${err.message}`)
            }
        },
    }
}

export function setMenuTemplate(mainWindow, defaultDir) {
    return [
        {
            label: 'File',
            submenu: [
                importRawSubmenu(mainWindow, defaultDir),
                importReviewedSubmenu(mainWindow, defaultDir),
                openFolderSubmenu(mainWindow, defaultDir),
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'Alt+F4',
                    click: () => {
                        app.quit()
                    },
                },
            ],
        },
    ]
}
