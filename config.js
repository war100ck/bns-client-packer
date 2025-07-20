/* eslint-disable comma-dangle */
"use strict";

module.exports = {
	/*
	 * Cross device file transfer support
	 */
	"crossDevice": true,

	/*
	 * Database version for initial version.ini file
	 */
	"initialVersion": 0,

	/*
	 * Temporary directory path
	 */
	"tempDirectory": "./temp",

	/*
	 * Client source package directory path
	 */
	"clientDirectory": "D:/BNS_CLIENT",

	/*
	 * Upload directory path
	 */
	"patchDirectory": "D:/Server-Api-BnS-2017/bns-patch/patch",

	/*
	 * Upload database directory path
	 */
	"databaseDirectory": "D:/Server-Api-BnS-2017/bns-patch/db",

	/*
	 * Upload version.ini file path
	 */
	"versionFile": "D:/Server-Api-BnS-2017/bns-patch/Version.ini",

	/*
	 * Client package exclude conditions
	 */
	"clientExcludes": [
    "bns-api/**",
    "temp/**",
    "**/*.cab",
    "**/Version.ini_",
    "**/* — копия.*"  // Исключаем файлы-копии
]
};