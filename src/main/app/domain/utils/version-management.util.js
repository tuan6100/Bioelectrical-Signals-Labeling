import Store from "electron-store"
import {app} from "electron";
import {db} from "../../persistence/connection/sqlite.connection.js";
import config from "config"

const store = new Store()
const currentVersion = store.get('app.version')

export function initSchema() {
    const lastestVersion = app.getVersion()
    if (!currentVersion) {
        store.set('app.version', lastestVersion)
        try {
            db.init()
        } catch (e) {
            console.error(e)
        }
    } else {
        console.log(`Database schema already initialized with version ${currentVersion}`)
    }
}

export async function migrateSchema() {
    const changed = Boolean(config.get('migration.require'))
    const lastestVersion = app.getVersion()
    const comparedVersion = process.env.NODE_ENV === 'dev'? true: (currentVersion !== lastestVersion)
    console.log(`Starting migration from ${currentVersion} to ${lastestVersion} ...`)
    if (comparedVersion && changed) {
        store.set('app.version', lastestVersion)
        try {
            await db.migrate(lastestVersion)
        } catch (e) {
            console.error(e)
        }
    }
}