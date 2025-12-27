import Store from "electron-store"
import {app} from "electron";
import {db} from "../../persistence/connection/sqlite.connection.js";
import config from "config"

const store = new Store()

export function initSchema() {
    const latestVersion = app.getVersion()
    const targetVersion = parseInt(
        latestVersion.replace(/[-+].*$/, '').replace(/\./g, '')
    )
    const dbVersion = db.pragma('user_version', { simple: true })
    if (dbVersion === 0) {
        console.log('Initializing database schema...')
        db.init()
        db.pragma(`user_version = ${targetVersion}`)
        store.set('app.version', latestVersion)
    } else {
        console.log(`Database already initialized at version ${dbVersion}`)
    }
}


export async function migrateSchema() {
    const dbVersion = db.pragma('user_version', { simple: true })
    if (dbVersion === 0) {
        console.log('DB not initialized → skip migrate, call init instead')
        initSchema()
        return
    }
    const changed = Boolean(config.get('migration.require'))
    const latestVersion = app.getVersion()
    if (!changed) return
    await db.migrate(latestVersion)
}

export function isDbInitialized() {
    const v = db.pragma('user_version', { simple: true })
    return v > 0
}
