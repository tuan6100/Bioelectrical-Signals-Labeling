import appConfig from "../../config.js";

const migrateTableChannels = `
    ALTER TABLE channels RENAME TO channels_old;

    CREATE TABLE channels (
         channel_id INTEGER PRIMARY KEY NOT NULL,
         session_id INTEGER NOT NULL,
         channel_number INTEGER NOT NULL,
         data_type TEXT,
         raw_samples_uv TEXT NOT NULL,
         sampling_frequency_khz REAL,
         subsampled_khz REAL,
         duration_ms REAL,
         double_checked INTEGER DEFAULT 0 CHECK (double_checked IN (0,1)),
         FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
    INSERT INTO channels (
        channel_id,
        session_id,
        channel_number,
        data_type,
        raw_samples_uv,
        sampling_frequency_khz,
        subsampled_khz,
        duration_ms,
        double_checked
    )
    SELECT
        channel_id,
        session_id,
        channel_number,
        'Trace Data',
        raw_samples_uv,
        sampling_frequency_khz,
        subsampled_khz,
        duration_ms,
        double_checked
    FROM channels_old;
    CREATE INDEX IF NOT EXISTS channel_session_channel_number_idx ON channels(session_id, channel_number);

    DROP TABLE channels_old;

`

const migrateTableList = [
    migrateTableChannels,
].filter(mig => mig !== null);

export function migrate121to122(db) {
    try {
        db.pragma('legacy_alter_table = ON')
        db.pragma('foreign_keys = OFF')
        db.transaction(() => {
            migrateTableList.forEach(migrationSQL => {
                db.exec(migrationSQL);
            })
            db.pragma(`user_version = ${appConfig.get('database.version')}`);
        })();
    } finally {
        db.pragma('legacy_alter_table = OFF')
        db.pragma('foreign_keys = ON')
        db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
        db.exec('VACUUM')
    }

}