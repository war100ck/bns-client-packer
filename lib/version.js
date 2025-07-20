"use strict";

const fs = require("fs");
const path = require("path");
const ini = require("ini");

// Default values. Don't change!
const DEFAULTS = Object.freeze({
    "Version": {
        "ProductVersion": "1.0.72.180 v 0"
    },
    "Download": {
        "Retry": 3,
        "Wait": 1000,
        "Version": null,
        "DL root": "patch",
        "DB file": null
    },
    "CheckHash": {
        "count": 0,
        "hash": "63d1f5e80cbb23a3d04112a155c601a242c3fd14336696d1869fc3f7965ce0f7",
        "signature": "88e49e1cdde40a5c7886a0e3c3a813a41d1f323786a7028c762584651f9ace56" +
		"d14cf8e2e6dc8ac840a3da931f037ac185d88b95c0c093a366dcea05e3416630" +
		"7e5a0a5007777c1a6939f09227cf7eca66d4104c4cbdc65c413f1e82e7b769d4" +
		"e8617dabf4dd15dbd139e39df8320965db6b5b1d3a9495410e4e96b7bbb64cb5" +
		"49c460b49067ec8664fd30f43a4af8bd1ee04653fa7ea0c44d8d6d190bbe1459" +
		"13a532546f2aff538a3ed105adc4899f3be9c4bbecaa42e6925dca5d87214ab6" +
		"f9ca1415e3c9adccd623a71fb92eee73868ced097c5e1f5e1b088cb4326cdf76" +
		"3523ee6a3eee6c5edfefbc3f273dfa97e568a8f6e273968bb17fc5d7d81e53e8",
        "file0": "bin\\Client.exe",
        "value0": "cf97afafb557fd44c79c52c36c15ca03"
    }
});

class Version {
    constructor(config) {
        this._config = config;
        this._iniData = { ...DEFAULTS };

        // Проверяем существование файла Version.ini в папке bin
        if (this._exists()) {
            this._load();
        } else {
            // Если файла нет, создаем с начальной версией
            this.set(this._config.initialVersion || 0);
        }
    }

    // Получаем текущую версию из ProductVersion
    get() {
        this._load();
        const productVersion = this._iniData["Version"]["ProductVersion"];
        return Number(productVersion.split("v ")[1]);
    }

    // Устанавливаем новую версию
    set(version) {
        // Обновляем ProductVersion (сохраняем основную часть и меняем номер после "v ")
        const baseVersion = this._iniData["Version"]["ProductVersion"].split("v ")[0];
        this._iniData["Version"]["ProductVersion"] = `${baseVersion}v ${version}`;
        
        // Также обновляем Version в Download (для совместимости)
        this._iniData["Download"]["Version"] = Number(version);
        this._iniData["Download"]["DB file"] = `db/server.db.${version}.cab`;

        // Сохраняем изменения в файл
        this._write();
    }

    /**
     * Private functions
     */
    
    // Загружаем данные из Version.ini
    _load() {
        this._iniData = ini.decode(
            fs.readFileSync(this._config.versionFile, "utf8")
        );
    }

    // Сохраняем данные в Version.ini (с большой буквы)
    _write() {
        // Создаем папку bin, если она не существует
        const dir = path.dirname(this._config.versionFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Записываем файл с правильным именем
        fs.writeFileSync(
            path.resolve(this._config.versionFile),
            ini.encode(this._iniData)
        );
    }

    // Проверяем существование Version.ini
    _exists() {
        return fs.existsSync(path.resolve(this._config.versionFile));
    }
}

module.exports = Version;