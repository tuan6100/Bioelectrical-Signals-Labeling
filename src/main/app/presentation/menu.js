import {app, dialog} from "electron"
import path from "node:path"
import fs from "node:fs"
import {readFile} from "../domain/services/file/reader/txt.reader.js"
import {processAndPersistData} from "../domain/services/data/command/session.command.js"
import Store from "electron-store"

const processFiles = async (mainWindow, filePaths) => {
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


const openFileSubmenu = (mainWindow, defaultDir) => {
    const store = new Store()
    let lastOpenedDir = store.get('userPreferences.lastOpenedDir')?? defaultDir
    return {
        label: 'Open File(s)',
        accelerator: 'CmdOrCtrl+N',
        click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Open Text File(s)',
                defaultPath: lastOpenedDir,
                properties: ['openFile', 'multiSelections'],
                filters: [{ name: 'Text Files', extensions: ['txt'] }],
            })

            if (canceled || filePaths.length === 0) return
            lastOpenedDir = path.dirname(filePaths[0])
            store.set('userPreferences.lastOpenedDir', lastOpenedDir)
            await processFiles(mainWindow, filePaths)
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
                openFileSubmenu(mainWindow, defaultDir),
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
