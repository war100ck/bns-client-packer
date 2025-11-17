![ViewCount](https://hits.sh/github.com/war100ck/bns-client-packer.svg?style=flat-square)


# BNS Client Packer

A powerful patching tool for Blade & Soul (BNS) game client, adapted from [Tera Client Packer](https://github.com/justkeepquiet/tera-client-packer) by [justkeepquiet](https://github.com/justkeepquiet). This tool automates the process of creating and managing game patches by tracking file changes, versioning, and packaging modified files into CAB archives. It is specifically configured for the 2017 version of Blade & Soul but can be adapted for the 2020 version with proper configuration. Designed to work seamlessly with the [Blade & Soul Game API Server 2017](https://github.com/war100ck/Server-Api-BnS-2017).

<p align="center">
<img src="https://raw.githubusercontent.com/war100ck/bns-client-packer/main/screen/1.png" alt="BNS Client Packer" width="1000px">
</p>

## Features

- **Automatic version tracking**: Increments version numbers for changed files
- **File change detection**: Identifies added, updated, and removed files
- **CAB packaging**: Compresses files into game-compatible CAB archives
- **Database backend**: SQLite database tracks all file versions and changes
- **Filter support**: Process specific directories via command line arguments
- **Cross-platform**: Works on Windows (with batch scripts provided)

## Installation

1. Clone this repository
2. Install Node.js (v16 or higher)
3. Install dependencies:
```bash
npm install
```
4. Configure paths in `config.js` to match your environment

## Configuration

Edit `config.js` to set up your paths:

```javascript
module.exports = {
    "crossDevice": true,          // Enable cross-device file operations
    "initialVersion": 0,          // Starting version number
    "tempDirectory": "./temp",    // Temporary working directory
    "clientDirectory": "...",     // Path to BNS client files
    "patchDirectory": "...",      // Where to output patch files
    "databaseDirectory": "...",   // Where to store version databases
    "versionFile": "...",         // Path to Version.ini
    "clientExcludes": [           // Files/directories to ignore
        "bns-api/**",
        "temp/**",
        "**/*.cab",
        "**/Version.ini_",
        "**/* — копия.*"
    ]
};
```

## Directory Structure

### BNS_CLIENT Directory
The `BNS_CLIENT` directory is the source location for the Blade & Soul game client files. This is where the clean, unpacked game files should be placed before running the patching tool. The tool scans this directory to detect changes, generate hashes, and create patches based on the files present.

```
BNS_CLIENT
├── bin                           # Directory containing the game executable and version files
│   ├── Client.exe                # Main executable for launching the Blade & Soul client
│   └── Version.ini               # Version configuration file for the game client
└── contents                      # Directory containing game assets and configuration data
    ├── Local                     # Directory for localized game data
    │   └── GARENA                # GARENA-specific data for regional configurations
    │       ├── THAI              # Thai-specific localized content
    │       │   ├── CookedPC      # Compiled game assets for the Thai version
    │       │   ├── Splash        # Splash screen images for the Thai version
    │       │   └── data          # Configuration data for the Thai version
    │       │       ├── local.dat # Local configuration data
    │       │       └── xml.dat   # XML configuration for game settings
    │       └── data              # General GARENA configuration data
    │           ├── config.dat    # General configuration data
    │           └── xml.dat       # General XML configuration for game settings
    └── bns                       # Core Blade & Soul game data
        ├── Config                # Game configuration files
        ├── CookedPC              # Compiled game assets (e.g., textures, models)
        │   ├── 00001000.upk      # Game package file (asset)
        │   └── 00001029.upk      # Game package file (asset)
        └── Logs                  # Directory for game logs
```

### Server-Api-BnS Directory
The `Server-Api-BnS-2017` directory is the destination where patch files are generated and stored for subsequent download by the game client. This directory contains the SQLite database (`server.db.x.cab`) and CAB archives of patched files, which are used by the Blade & Soul game client to apply updates.

```
Server-Api-BnS-2017
└── bns-patch
    ├── Version.ini              # Version configuration file for the patch server
    ├── db                      # Directory storing SQLite database files
    │   ├── server.db.1.cab     # Compressed database for version 1
    │   ├── server.db.2.cab     # Compressed database for version 2
    │   └── server.db.3.cab     # Compressed database for version 3
    └── patch                   # Directory storing patch CAB archives
        ├── 1-1.cab             # Patch file for file ID 1, version 1
        ├── 10-1.cab            # Patch file for file ID 10, version 1
        ├── 100-1.cab           # Patch file for file ID 100, version 1
        └── 99-1.cab            # Patch file for file ID 99, version 1
```

## Version.ini Configuration
To ensure proper integration with the patching system and the [Blade & Soul Game API Server 2017](https://github.com/war100ck/Server-Api-BnS-2017), the `Version.ini` file located in `BNS_CLIENT/bin/` must be configured correctly. This file is used by the game client to determine the current version and locate the patch files. Below is an example of how your `Version.ini` should look after initial setup:

```ini
[Version]
ProductVersion=1.0.72.180 v 0

[Download]
Retry=3
Wait=1000
Version=0
DL root=patch


[CheckHash]
count=0
hash=63d1f5e80cbb23a3d04112a155c601a242c3fd14336696d1869fc3f7965ce0f7
signature=88e49e1cdde40a5c7886a0e3c3a813a41d1f323786a7028c762584651f9ace56d14cf8e2e6dc8ac840a3da931f037ac185d88b95c0c093a366dcea05e34166307e5a0a5007777c1a6939f09227cf7eca66d4104c4cbdc65c413f1e82e7b769d4e8617dabf4dd15dbd139e39df8320965db6b5b1d3a9495410e4e96b7bbb64cb549c460b49067ec8664fd30f43a4af8bd1ee04653fa7ea0c44d8d6d190bbe145913a532546f2aff538a3ed105adc4899f3be9c4bbecaa42e6925dca5d87214ab6f9ca1415e3c9adccd623a71fb92eee73868ced097c5e1f5e1b088cb4326cdf763523ee6a3eee6c5edfefbc3f273dfa97e568a8f6e273968bb17fc5d7d81e53e8
file0=main\Client.exe
value0=cf97afafb567fd44c79c52c36c15ca03
```

This configuration ensures that the game client correctly references the database and patch files stored in `Server-Api-BnS-2017/bns-patch/`, and it verifies the integrity of critical files like `Client.exe`. The `ProductVersion` and `Version` stukas are automatically updated by the tool during the patching process.

## Usage

Run one of the provided batch files or use direct commands:

### Batch Files
- `pack_all.bat` - Process all game files
- `pack_CookedPC.bat` - Process CookedPC directory
- `pack_garena_data.bat` - Process GARENA data
- `pack_thai_data.bat` - Process THAI data
- `pack_garena_all_data.bat` - Process all GARENA data (main + THAI)

### Command Line
```bash
node --max-old-space-size=4096 app.js [optional_directory_filter]
```

## Database Structure

The tool uses SQLite with these tables:
- `file_info`: Tracks all known files
- `file_version`: File versions and hashes
- `file_size`: Package size information
- `version_info`: Version history

## How It Works

1. **Scan client files**: Builds a complete file list from `BNS_CLIENT` (excluding configured patterns)
2. **Track changes**: Compares against the database to detect modifications
3. **Version files**: Increments version numbers for changed files
4. **Create packages**: Compresses modified files into CAB archives, stored in `Server-Api-BnS-2017/bns-patch/patch`
5. **Update database**: Records all changes in `Server-Api-BnS-2017/bns-patch/db` for future patches
6. **Update Version.ini**: Updates game version information in `BNS_CLIENT/bin/Version.ini`

## Dependencies

- Node.js (v16+)
- SQLite3
- MD5 file hashing
- ELZMA compression (included in `bin/`)

## Credits

- Inspired by and adapted from [Tera Client Packer](https://github.com/justkeepquiet/tera-client-packer) by [justkeepquiet](https://github.com/justkeepquiet)
- Configured for [Blade & Soul Game API Server 2017](https://github.com/war100ck/Server-Api-BnS-2017)
- Supports Blade & Soul 2017 version, with potential to adapt for the 2020 version
