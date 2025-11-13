import db from "../connection/sqlite.connection.js";

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