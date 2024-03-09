import { Database } from "duckdb-async";
import { extractDisplayNameFromEPFLEmail } from './util.js';

let db;

async function initDatabase() {
    db = await Database.create("./db1");
    // check if the table exists
    // there should be a unique constraint on the threadId
    await db.run(`
        CREATE TABLE IF NOT EXISTS claimed_threads (
            threadId INTEGER PRIMARY KEY,
            userEmail TEXT,
            userDisplayName TEXT
        );
    `);
}

initDatabase();//.then(() => insertDummyThreads());

export function createClaimedThread(threadId, userEmail, userDisplayName) {
    return db.run(`INSERT INTO claimed_threads (threadId, userEmail, userDisplayName) VALUES (${threadId}, '${userEmail}', '${userDisplayName}');`);
}

export function deleteClaimedThread(threadId) {
    return db.run(`DELETE FROM claimed_threads WHERE threadId = ${threadId}`);
}

function insertDummyThreads() {
    createClaimedThread(94394, 'simon.manu@epfl.ch', extractDisplayNameFromEPFLEmail('simon.lefort@epfl.ch'));
}

export function getClaimedThreads() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM claimed_threads`, function (err, res) {
            if (err) {
                console.error(err);
                return [];
            }
            resolve(res);
        });
    });
}
