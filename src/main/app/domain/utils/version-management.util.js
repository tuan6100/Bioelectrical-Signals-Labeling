import {db} from "../../persistence/connection/sqlite.connection.js";
export function initSchema() {
    db.init()
}


export async function migrateSchema() {
    const dbVersion = db.pragma('user_version', { simple: true })
    if (dbVersion === 0) {
        console.log('DB not initialized → skip migrate, call init instead')
        initSchema()
    } else {
        await db.migrate()
    }

}

export function isDbInitialized() {
    const v = db.pragma('user_version', { simple: true })
    return v > 0
}
