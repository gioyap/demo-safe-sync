# Demo Safe Sync

Demo Safe Sync is a client-facing preview of the Safe Sync desktop interface. It is built to show the intended user flow before sharing the full working repository.

This demo is UI only. It does not connect to rclone, cloud accounts, Google Drive, MEGA, OneDrive, or any real client files.

## Download the Demo App

The Windows installer/executable should be downloaded from this repository's GitHub Releases page:

[Download Demo Safe Sync from GitHub Releases](https://github.com/gioyap/demo-safe-sync/releases)

Using GitHub Releases keeps the file attached to the public project source instead of sharing it through a separate file host such as Google Drive.

## What the Demo Shows

- Create a mock remote connection
- Rename and delete mock remotes
- Edit approved folder names
- Run a dry run preview
- Confirm and run a mock update
- Show success toast notifications
- Review demo logs with technical details

## Safety Notes

- The app is a presentation demo only.
- No real file transfer is performed.
- No cloud login is requested.
- No rclone command is executed.
- The visible technical output is simulated for walkthrough purposes.

## Build From Source

Reviewers can also build the app locally from this repository:

```bash
npm install
npm run tauri build
```

The standalone Windows executable will be created at:

```text
src-tauri/target/release/demo-safe-sync.exe
```

Installers are created under:

```text
src-tauri/target/release/bundle/
```

## Development

Run the desktop app in development mode:

```bash
npm run tauri dev
```

Run a web preview only:

```bash
npm run dev
```
