import Database from "better-sqlite3";


const db = new Database('biosignal.db', {
    verbose: console.log
})
// db.pragma('journal_mode = WAL');

const ddl = `
    create table if not exists patients (
       patient_id integer primary key,
       first_name varchar not null,
       gender varchar(1) check (gender in ('M', 'F'))
    );
    create table if not exists diseases (
        disease_id integer primary key,
        name varchar not null,
        type varchar
    );
    insert into diseases(name) values ('Unknown');
`

db.initSchema = function() {
    db.exec(ddl)
}

export default db;