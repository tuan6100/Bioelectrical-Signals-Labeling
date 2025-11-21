
import {app} from "electron";
import started from "electron-squirrel-startup";
import fs from "fs";

if (started) {
    if (process.argv.includes('--squirrel-uninstall')) {
        const sessionDataFolder = app.getPath('userData')
        fs.rmSync(sessionDataFolder, { recursive: true, force: true })
    }
    app.quit()
    process.exit(0)
}

import('./main.js')