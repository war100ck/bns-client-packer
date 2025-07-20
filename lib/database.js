"use strict";

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const cab = require("./cab");

const CREATE_STRUCTURE = [
    "BEGIN TRANSACTION;",
    `CREATE TABLE IF NOT EXISTS "file_info" (
        "id"	integer,
        "unique_path"	text UNIQUE,
        "path"	text,
        "property"	integer,
        PRIMARY KEY("id")
    );`,
    `CREATE TABLE IF NOT EXISTS "file_version" (
        "id"	integer,
        "version"	integer,
        "size"	integer,
        "hash"	text
    );`,
    `CREATE TABLE IF NOT EXISTS "file_size" (
        "id"	integer,
        "org_ver"	integer,
        "new_ver"	integer,
        "size"	integer
    );`,
    `CREATE TABLE IF NOT EXISTS "version_info" (
        "version"	integer,
        "version_path"	text UNIQUE,
        "reg_date"	text DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY("version")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "id_version" ON "file_version" (
        "id",
        "version"
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "id_diff" ON "file_size" (
        "id",
        "org_ver",
        "new_ver"
    );`,
    "COMMIT;"
];

/**
 * Table `file_info`
 */
class TableFileInfo {
    constructor(db) {
        this._db = db;
    }

    add(file, property = 0) {
        const uniquePath = file.toLowerCase();
        return new Promise((resolve, reject) => {
            this._db.get("SELECT 1 FROM file_info WHERE unique_path = ?", [uniquePath], (err, row) => {
                if (err) return reject(err);
                if (!row) {
                    this._db.run(
                        "INSERT INTO file_info (unique_path, path, property) VALUES (?, ?, ?)",
                        [uniquePath, file, property],
                        (err) => err ? reject(err) : resolve()
                    );
                } else {
                    resolve();
                }
            });
        });
    }

    getAll() {
        return new Promise((resolve, reject) => {
            this._db.all("SELECT * FROM file_info", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

/**
 * Table `file_version`
 */
class TableFileVersion {
    constructor(db) {
        this._db = db;
    }

    add(id, version, size, hash) {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT 1 FROM file_version WHERE id = ? AND version = ?", [id, version], (err, row) => {
                if (err) return reject(err);
                if (!row) {
                    this._db.run(
                        "INSERT INTO file_version (id, version, size, hash) VALUES (?, ?, ?, ?)",
                        [id, version, size, hash],
                        (err) => err ? reject(err) : resolve(true)
                    );
                } else {
                    resolve(false);
                }
            });
        });
    }

    getAll() {
        return new Promise((resolve, reject) => {
            this._db.all("SELECT * FROM file_version", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getMaxById(id) {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT MAX(version) as max_version FROM file_version WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.max_version : null);
            });
        });
    }

    existsById(id) {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT 1 FROM file_version WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    }

    checkHashById(id, hash) {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT 1 FROM file_version WHERE id = ? AND hash = ?", [id, hash], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    }
}

/**
 * Table `file_size`
 */
class TableFileSize {
    constructor(db) {
        this._db = db;
    }

    add(id, orgVer, newVer, size) {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT 1 FROM file_size WHERE id = ? AND org_ver = ? AND new_ver = ?", 
                [id, orgVer, newVer], (err, row) => {
                    if (err) return reject(err);
                    if (!row) {
                        this._db.run(
                            "INSERT INTO file_size (id, org_ver, new_ver, size) VALUES (?, ?, ?, ?)",
                            [id, orgVer, newVer, size],
                            (err) => err ? reject(err) : resolve()
                        );
                    } else {
                        resolve();
                    }
                });
        });
    }

    getAll() {
        return new Promise((resolve, reject) => {
            this._db.all("SELECT * FROM file_size", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getLastById(id) {
        return new Promise((resolve, reject) => {
            this._db.get(
                "SELECT *, (org_ver + new_ver) AS ver_sum FROM file_size WHERE id = ? ORDER BY ver_sum DESC LIMIT 1", 
                [id], 
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || {});
                }
            );
        });
    }
}

/**
 * Table `version_info`
 */
class TableVersionInfo {
    constructor(db) {
        this._db = db;
    }

    add(version, versionPath, regDate) {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT 1 FROM version_info WHERE version_path = ?", [versionPath], (err, row) => {
                if (err) return reject(err);
                if (!row) {
                    this._db.run(
                        "INSERT INTO version_info (version, version_path, reg_date) VALUES (?, ?, ?)",
                        [version, versionPath, regDate],
                        (err) => err ? reject(err) : resolve()
                    );
                } else {
                    resolve();
                }
            });
        });
    }

    getAll() {
        return new Promise((resolve, reject) => {
            this._db.all("SELECT * FROM version_info", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getMax() {
        return new Promise((resolve, reject) => {
            this._db.get("SELECT MAX(version) as max_version FROM version_info", (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.max_version : null);
            });
        });
    }
}

class Database {
    constructor(config) {
        this._config = config;
    }

    async load(dbVersion) {
        const packedDbFile = path.resolve(this._config.databaseDirectory, `server.db.${dbVersion}.cab`);
        const unpackedDbFile = path.resolve(this._config.tempDirectory, "server.db");

        if (fs.existsSync(packedDbFile)) {
            await this._unpack(packedDbFile, dbVersion);
        }

        this._db = new sqlite3.Database(unpackedDbFile);
        await this._create();
    }

    FileInfo() {
        return new TableFileInfo(this._db);
    }

    FileSize() {
        return new TableFileSize(this._db);
    }

    FileVersion() {
        return new TableFileVersion(this._db);
    }

    VersionInfo() {
        return new TableVersionInfo(this._db);
    }

    async pack(dbVersion) {
        return new Promise((resolve, reject) => {
            this._db.close((err) => {
                if (err) return reject(err);

                const unpackedDbFile = path.resolve(this._config.tempDirectory, "server.db");
                const renamedDbFile = path.resolve(this._config.tempDirectory, `server.db.${dbVersion}`);

                fs.renameSync(unpackedDbFile, renamedDbFile);

                cab.compress(renamedDbFile, {
                    "outputDirectory": path.resolve(this._config.databaseDirectory),
                    "deleteFile": true,
                    "overwrite": true
                });

                resolve();
            });
        });
    }

    /**
     * Private functions
     */
    _unpack(packedDbFile, dbVersion) {
        const unpackedDbFile = path.resolve(this._config.tempDirectory, `server.db.${dbVersion}`);
        const renamedDbFile = path.resolve(this._config.tempDirectory, "server.db");

        cab.decompress(packedDbFile, { "outputDirectory": path.resolve(this._config.tempDirectory) });
        fs.renameSync(unpackedDbFile, renamedDbFile);
    }

    _create() {
        return new Promise((resolve, reject) => {
            const runQuery = (index) => {
                if (index >= CREATE_STRUCTURE.length) return resolve();

                this._db.run(CREATE_STRUCTURE[index], (err) => {
                    if (err) return reject(err);
                    runQuery(index + 1);
                });
            };

            runQuery(0);
        });
    }
}

module.exports = Database;