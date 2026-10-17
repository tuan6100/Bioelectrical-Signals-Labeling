import {db} from "../../persistence/connection/sqlite.connection.js";
import appConfig from "../../config.js";
export function initSchema() {
    db.init()
}


export async function migrateSchema() {
    const currentVersion = db.getVersion()
    const migrationEnabled = appConfig.get('database.migration.require', false)
    const lastestVersion = appConfig.get("database.version", 0)
    const shouldMigrate = migrationEnabled && (currentVersion < lastestVersion);
    if (shouldMigrate) {
        await db.migrate()
    } else {
        console.log('Database is up to date')
    }
}

export function isDbInitialized() {
    return db.getVersion() > 0
}
