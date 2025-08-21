"use strict";

const path = require("path");

const config = require("./config");
const Version = require("./lib/version");
const Database = require("./lib/database");
const Client = require("./lib/client");

const argv = process.argv.slice(2).map(a => a.replace(/\\/g, '/').toLowerCase());

/**
 * ONLY FOR DEBUG ISSUES!
 */
const SKIP_HASHING = false;

class App {
    constructor() {
        this.version = new Version(config);
        this.db = new Database(config);
        this.client = new Client(config);

        this.clientFiles = new Map();
        this.dbVersion = null;
        this.dbChanged = false;

        this.results = {
            "added": [],
            "updated": [],
            "removed": [],
            "packed": []
        };
    }

    async loadDatabase() {
        this.dbVersion = this.version.get();
        console.log("loadDatabase [Begin]");

        await this.db.load(this.dbVersion);

        console.log("loadDatabase [Loaded]: version:", this.dbVersion);
        console.log("loadDatabase [End]");
    }

    async loadFiles() {
        console.log("loadFiles [Begin]");
        const clientList = this.client.list();
        const total = clientList.length;
        let processed = 0;

        for (const file of clientList) {
            processed++;
            const filePath = file.substr(path.resolve(config.clientDirectory).length + 1);
            const filePathNormalized = filePath.replace(/\\/g, '/').toLowerCase();

            // Применяем фильтр, если есть выбранные файлы
            let isSelected = argv.length === 0; // если нет аргументов, добавляем все
            for (const filter of argv) {
                if (filePathNormalized.includes(filter)) {
                    isSelected = true;
                    break;
                }
            }

            if (!isSelected) {
                console.log("loadFiles [Filtered] (", processed, "/", total, "):", filePath);
                continue;
            }

            if (!this.client.exists(filePath)) {
                console.warn("⚠ File not found in client:", filePath);
                continue;
            }

            await this.db.FileInfo().add(filePath);
            console.log("loadFiles [Add] (", processed, "/", total, "):", filePath);
        }

        console.log("loadFiles [End]");
    }

    async processDatabase() {
        console.log("processDatabase [Begin]");
        const fileInfoList = await this.db.FileInfo().getAll();

        let fileHash = null;
        let fileSize = null;
        const total = fileInfoList.length;
        let processed = 0;

        for (const fileInfo of fileInfoList) {
            processed++;
            const filePathNormalized = fileInfo.path.replace(/\\/g, '/').toLowerCase();

            let isSelected = argv.length === 0;
            for (const filter of argv) {
                if (filePathNormalized.includes(filter)) {
                    isSelected = true;
                    break;
                }
            }

            if (!isSelected) {
                console.log("processDatabase [Filtered] (", processed, "/", total, "):", fileInfo.path);
                continue;
            }

            if (this.client.exists(fileInfo.path)) {
                if (!SKIP_HASHING) {
                    fileHash = this.client.getHash(fileInfo.path);
                    fileSize = this.client.getSize(fileInfo.path);
                }

                const exists = await this.db.FileVersion().existsById(fileInfo.id);
                if (exists) {
                    const fileVersion = await this.db.FileVersion().getMaxById(fileInfo.id);

                    if (SKIP_HASHING || await this.db.FileVersion().checkHashById(fileInfo.id, fileHash)) {
                        const fileSizeInfo = {
                            "org_ver": -1,
                            "new_ver": 1,
                            ...(await this.db.FileSize().getLastById(fileInfo.id))
                        };

                        this.clientFiles.set(fileInfo.path, {
                            "id": fileInfo.id,
                            "orgVersion": fileSizeInfo.org_ver,
                            "newVersion": fileSizeInfo.new_ver
                        });

                        console.log("processDatabase [Match] (", processed, "/", total, "):", fileInfo.path);
                        continue;
                    }

                    const newFileVersion = fileVersion + 1;
                    await this.db.FileVersion().add(fileInfo.id, newFileVersion, fileSize, fileHash);

                    this.clientFiles.set(fileInfo.path, {
                        "id": fileInfo.id,
                        "orgVersion": -1,
                        "newVersion": newFileVersion
                    });

                    this.results.updated.push(fileInfo.path);
                    console.log("processDatabase [Updated] (", processed, "/", total, "):", fileInfo.path, ": new version:", newFileVersion);
                } else {
                    await this.db.FileVersion().add(fileInfo.id, 1, fileSize, fileHash);

                    this.clientFiles.set(fileInfo.path, {
                        "id": fileInfo.id,
                        "orgVersion": -1,
                        "newVersion": 1
                    });

                    this.results.added.push(fileInfo.path);
                    console.log("processDatabase [New] (", processed, "/", total, "):", fileInfo.path, ": initial version:", 1);
                }
            } else {
                const fileVersion = await this.db.FileVersion().getMaxById(fileInfo.id);
                const newFileVersion = fileVersion + 1;

                await this.db.FileVersion().add(fileInfo.id, newFileVersion, -1, "");
                this.results.removed.push(fileInfo.path);
                console.log("processDatabase [Removed] (", processed, "/", total, "):", fileInfo.path, ": new version:", newFileVersion);
            }

            this.dbChanged = true;
        }

        console.log("processDatabase [End]");
    }

    async processFiles() {
        console.log("\n╔════════════════════════════════╗");
        console.log("║      PACKAGING IN PROGRESS     ║");
        console.log("╚════════════════════════════════╝");

        if (this.clientFiles.size !== 0) {
            const total = this.clientFiles.size;
            let i = 0;

            for (const [filePath, fileData] of this.clientFiles) {
                if (this.client.Package().exists(fileData.id, fileData.newVersion)) {
                    const packageSize = this.client.Package().getSize(fileData.id, fileData.newVersion);
                    await this.db.FileSize().add(fileData.id, fileData.orgVersion, fileData.newVersion, packageSize);
                    console.log(`✓ [${++i}/${total}] Already packed: ${filePath}`);
                } else {
                    console.log(`\n📦 Packaging: ${filePath} (v${fileData.newVersion})`);
                    this.client.Package().create(filePath, fileData.id, fileData.newVersion);
                    const packageSize = this.client.Package().getSize(fileData.id, fileData.newVersion);
                    await this.db.FileSize().add(fileData.id, fileData.orgVersion, fileData.newVersion, packageSize);
                    this.results.packed.push(filePath);
                    console.log(`✔  [${++i}/${total}] Successfully packed: ${filePath} (${(packageSize/1024).toFixed(2)} KB)`);
                }
            }

            console.log("\n════════════════════════════════════════");
            console.log(`  PACKAGING COMPLETED: ${i} FILES PROCESSED`);
            console.log("════════════════════════════════════════\n");
        } else {
            console.log("\n⚠ No files to package - skipping this step");
        }
    }

    async updateDatabase() {
        console.log("updateDatabase [Begin]");

        const dateTime = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
        let dbVersion = this.dbVersion;

        if (SKIP_HASHING || this.dbChanged) {
            await this.db.VersionInfo().add(++dbVersion, `version\\ver${dbVersion}`, dateTime);
        }

        await this.db.pack(dbVersion);
        this.version.set(dbVersion);

        console.log("updateDatabase [Updated]: New version:", dbVersion);
        console.log("updateDatabase [End]");
    }

    showResults() {
        console.log("\n╔════════════════════════════════╗");
        console.log("║        PACKAGING RESULTS       ║");
        console.log("╚════════════════════════════════╝");
        console.log(` 🆕 Added:    ${this.results.added.length.toString().padEnd(4)} files `);
        console.log(` 🔄 Updated:  ${this.results.updated.length.toString().padEnd(4)} files `);
        console.log(` ❌ Removed:  ${this.results.removed.length.toString().padEnd(4)} files `);
        console.log(` 📦 Packed:   ${this.results.packed.length.toString().padEnd(4)} files `);
        console.log("══════════════════════════════════");

        if (this.results.packed.length > 0) {
            console.log("\nRecently packed files:");
            this.results.packed.slice(-5).forEach(file => {
                console.log(`→ ${file}`);
            });
        }
    }
}

(async () => {
    try {
        console.log("Starting packaging process...");
        const app = new App();

        await app.loadDatabase();
        await app.loadFiles();
        await app.processDatabase();
        await app.processFiles();
        await app.updateDatabase();
        app.showResults();

        console.log("\nPackaging process completed successfully!");
    } catch (e) {
        const stack = e.stack ? e.stack.match(/at App.([^\s]+)\s/) : null;

        console.error("\nERROR during packaging process:");
        if (stack) {
            console.error(stack[1], "[Error]:", e.stack);
        } else {
            console.error(e);
        }
        process.exit(1);
    }
})();
