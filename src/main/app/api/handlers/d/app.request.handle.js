import { ipcMain, BrowserWindow, app } from 'electron';
import path from 'node:path';

ipcMain.on('app:open-pdf-viewer', () => {
    const pdfWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        title: 'Documentation',
        webPreferences: {
            plugins: true // Important for PDF viewing
        }
    });

    // In production, __dirname points to the app's root. In dev, it's relative to the main.js file.
    // This path needs to be robust. Assuming assets are copied to the output directory.
    // A path relative from the app's root is generally safer.
    const isDev = process.env.NODE_ENV === 'dev';
    const basePath = isDev ? app.getAppPath() : path.dirname(app.getPath('exe'));

    // This path construction assumes a certain output structure.
    // A more direct relative path from __dirname of main.js might be more stable across environments.
    // Let's use a path relative to the app's content root.
    const pdfPath = path.join(app.getAppPath(), 'src', 'main', 'common', 'assets', 'doc', 'HDSD Biosignal Labeling.pdf');

    pdfWindow.loadFile(pdfPath);
    pdfWindow.setMenu(null);
});
