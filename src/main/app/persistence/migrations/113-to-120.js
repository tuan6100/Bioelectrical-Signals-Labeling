const migrateTablePatients = `
    ALTER TABLE patients RENAME TO patients_old;
    CREATE TABLE patients (
        patient_id TEXT PRIMARY KEY NOT NULL,
        first_name TEXT,
        gender TEXT CHECK (gender IN ('M','F'))
    );

    INSERT INTO patients (patient_id, first_name, gender)
    SELECT patient_id, first_name, gender FROM patients_old;

    DROP TABLE patients_old;
`

const migrateTableSessions = null

const migrateTableChannels = `
    ALTER TABLE channels RENAME TO channels_old;

    CREATE TABLE channels (
        channel_id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL,
        channel_number INTEGER NOT NULL,
        raw_samples_uv TEXT NOT NULL,
        sampling_frequency_khz REAL,
        subsampled_khz REAL,
        duration_ms REAL,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
    INSERT INTO channels
    SELECT channel_id, session_id, channel_number,
           raw_samples_uv, sampling_frequency_khz,
           subsampled_khz, duration_ms
    FROM channels_old
    WHERE data_kind = 'trace';
    CREATE INDEX IF NOT EXISTS channel_session_channel_number_idx ON channels(session_id, channel_number);

    DROP TABLE channels_old;
`

const migrateTableLabel = null

const migrateTableAnnotations = `
    ALTER TABLE annotations RENAME TO annotations_old;

    CREATE TABLE annotations (
        annotation_id INTEGER PRIMARY KEY NOT NULL,
        channel_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        start_time_ms REAL NOT NULL,
        end_time_ms REAL NOT NULL,
        note TEXT,
        FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(label_id)
    );
    INSERT INTO annotations
    SELECT annotation_id, channel_id, label_id,
           start_time_ms, end_time_ms, note
    FROM annotations_old;
    CREATE INDEX IF NOT EXISTS annotation_start_time_asc_idx ON annotations(start_time_ms ASC);

    DROP TABLE annotations_old;
`

const migrateTableList = [
    migrateTablePatients,
    migrateTableSessions,
    migrateTableChannels,
    migrateTableLabel,
    migrateTableAnnotations
].filter(mig => mig !== null);

export function migrate113to120(db) {
    try {
        db.pragma('foreign_keys = OFF')
        db.transaction(() => {
            migrateTableList.forEach(migrationSQL => {
                db.exec(migrationSQL);
            })
            db.pragma('user_version = 120');
        })();
    } finally {
        db.pragma('foreign_keys = ON')
    }

}
