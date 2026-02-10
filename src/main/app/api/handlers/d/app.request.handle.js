import { ipcMain, BrowserWindow, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

ipcMain.on('app:open-pdf-viewer', async () => {
    const pdfWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        title: 'Documentation',
        webPreferences: {
            plugins: true
        }
    });
    let pdfPath;
    if (app.isPackaged) {
        const path1 = path.join(app.getAppPath(), 'doc', 'HDSD Biosignal Labeling.pdf');
        const path2 = path.join(app.getAppPath(), 'dist', 'doc', 'HDSD Biosignal Labeling.pdf');
        const path3 = path.join(app.getAppPath(), 'dist', 'renderer', 'doc', 'HDSD Biosignal Labeling.pdf');
        if (fs.existsSync(path1)) {
            pdfPath = path1;
        } else if (fs.existsSync(path2)) {
            pdfPath = path2;
        } else if (fs.existsSync(path3)) {
            pdfPath = path3;
        } else {
            const path4 = path.join(process.resourcesPath, 'doc', 'HDSD Biosignal Labeling.pdf');
             if (fs.existsSync(path4)) {
                pdfPath = path4;
            } else {
                 pdfPath = path1;
                 console.error('Could not find PDF documentation in production paths.');
            }
        }
    } else {
        pdfPath = path.join(app.getAppPath(), 'public', 'doc', 'HDSD Biosignal Labeling.pdf');
    }
    console.log('Opening PDF at:', pdfPath);
    try {
        await pdfWindow.loadFile(pdfPath);
        pdfWindow.setMenu(null);
    } catch (e) {
        console.error('Failed to load PDF:', e);
    }
});
