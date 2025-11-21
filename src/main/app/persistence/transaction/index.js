import {db as sqliteDb} from "@biosignal/app/persistence/connection/sqlite.connection.js";

let db = sqliteDb;

export function useDb(dbInstance) {
    db = dbInstance;
}

const begin = db.prepare('BEGIN');
const commit = db.prepare('COMMIT');
const rollback = db.prepare('ROLLBACK');

export default function asTransaction(fn) {
    return function (...args) {
        begin.run()
        try {
            const result = fn(...args)
            commit.run()
            return result
        } catch (error) {
            rollback.run()
            throw error
        }
    }
}