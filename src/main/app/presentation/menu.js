import {app, dialog} from "electron";
import path from "node:path";
import fs from "node:fs";
import {readFile} from "../domain/services/file/reader/txt.reader.js";
import {processAndPersistData} from "../domain/services/data/command/session.command.js";

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

const openFileSubmenu = (mainWindow, defaultDir) => {
    let lastOpenedDir = defaultDir
    return {
        label: 'Open File',
        accelerator: 'CmdOrCtrl+N',
        click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Open Text File',
                defaultPath: lastOpenedDir,
                properties: ['openFile'],
                filters: [{ name: 'Text Files', extensions: ['txt'] }],
            })
            if (canceled || filePaths.length === 0) return
            const inputPath = filePaths[0]
            const outputBaseDir = app.getPath('userData')
            const outputStorageDir = path.join(outputBaseDir, 'Local Storage')
            const outputPath = path.join(outputStorageDir, 'data.json')
            readFile(inputPath, outputPath).then((resolved) => {
                function sendSessionId (sessionId) {
                    mainWindow.webContents.send("send:session-id", { sessionId, refresh: Date.now() });
                }
                if (resolved.json === null) {
                    console.log(`File already imported, session ID: ${resolved.sessionCode}`)
                    sendSessionId(resolved.sessionCode)
                } else {
                    const sessionId = processAndPersistData(resolved.inputFileName, resolved.json, resolved.sessionCode)
                    console.log(`File imported successfully, session ID: ${sessionId}`)
                    sendSessionId(sessionId)
                }
            }).catch(err => {
                console.error('Failed to read or process file:', err)
                dialog.showErrorBox('Error occurred when reading the file', err.message || String(err))
            }).finally(() => {
                if (process.env.NODE_ENV !== 'dev') {
                    fs.rm(outputPath, { force: true }, () => {})
                }
                lastOpenedDir = path.dirname(inputPath)
            })
        },
    }
}


const openFolderSubmenu = (mainWindow, defaultDir) => {
    let lastOpenedDir = defaultDir;

    const getAllFiles = async (dir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map(entry => {
            const res = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                return getAllFiles(res);
            }
            return res.endsWith('.txt') ? res : null;
        }));
        return files.flat().filter(Boolean);
    };

    return {
        label: 'Open Folder',
        accelerator: 'CmdOrCtrl+O',
        click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: 'Open Folder',
                defaultPath: lastOpenedDir,
                properties: ['openDirectory'],
            });
            if (canceled || !filePaths || filePaths.length === 0) {
                return;
            }
            const folderPath = filePaths[0];
            lastOpenedDir = folderPath;
            try {
                const filesInFolder = await getAllFiles(folderPath);

                if (filesInFolder.length === 0) {
                    await dialog.showMessageBox(mainWindow, {
                        type: 'info',
                        title: 'No Text Files Found',
                        message: 'The selected folder contains no Natus data files.',
                    });
                    return;
                }
                const outputBaseDir = app.getPath('userData');
                const outputStorageDir = path.join(outputBaseDir, 'Local Storage');
                if (!fs.existsSync(outputStorageDir)) {
                    fs.mkdirSync(outputStorageDir, { recursive: true });
                }
                const fileReadPromises = filesInFolder.map(filePath => {
                    const tempOutputPath = path.join(outputStorageDir, `temp-${path.basename(filePath)}-${Date.now()}.json`);
                    return readFile(filePath, tempOutputPath)
                        .finally(() => {
                            fs.promises.rm(tempOutputPath, { force: true }).catch(console.error);
                        });
                });
                const results = await Promise.allSettled(fileReadPromises);
                const errors = [];
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        const resolved = result.value;
                        if (resolved.json !== null) {
                            processAndPersistData(resolved.inputFileName, resolved.json, resolved.sessionCode);
                        }
                    } else {
                        errors.push({
                            file: path.basename(filesInFolder[index]),
                            reason: result.reason.message || String(result.reason)
                        });
                        console.error(`Failed to process file ${filesInFolder[index]}:`, result.reason);
                    }
                });
                mainWindow.webContents.send("sessions:updated", { refresh: Date.now() });
                if (errors.length > 0) {
                    const errorDetails = errors.map(e => `${e.file}: ${e.reason}`).join('\n');
                    dialog.showErrorBox('File Processing Error', `Some files could not be processed:\n\n${errorDetails}`);
                }
            } catch (err) {
                console.error('Error processing folder:', err);
                dialog.showErrorBox('Error', `An error occurred while processing the folder: ${err.message}`);
            }
        },
    };
};
