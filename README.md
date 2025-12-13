# Docker Volume S3 Backup

A lightweight utility to backup Docker volumes to S3-compatible storage. Can be run from the host or within a Docker container to automatically backup all mounted volumes.

## Features

- 🚀 Backup Docker volumes to any S3-compatible storage (AWS S3, MinIO, Backblaze B2, etc.)
- 🐳 Run from within a container to automatically backup its own volumes
- 💻 Or run from the host to backup any container's volumes
- 📦 Creates compressed tar.gz archives with timestamps
- ⚡ Built with [Bun](https://bun.sh) for fast performance
- 🔒 Supports S3 multipart uploads for large backups

## Configuration

Set the following environment variables for S3 access:

- `S3_BACKUP_ACCESS_KEY_ID` - Your S3 access key ID
- `S3_BACKUP_SECRET_ACCESS_KEY` - Your S3 secret access key
- `S3_BACKUP_BUCKET_NAME` - The S3 bucket name
- `S3_BACKUP_ENDPOINT` - The S3 endpoint URL
- `S3_BACKUP_REGION` - The S3 region (optional)
- `DEBUG` - Set to `true` for verbose logging (optional)

## Quick Start

Set version, backup_name and container_id, and execute.

```bash
version=v0.1.0
backup_name=
container_id= # (leave empty for container mode)
arch=$(uname -m)
wget -O /tmp/temp-binary https://github.com/ejoneid/docker-volume-s3-backup/releases/download/$version/docker-volume-s3-backup-linux-$arch
chmod +x /tmp/temp-binary
/tmp/temp-binary $backup_name $container_id
rm /tmp/temp-binary
```

## Permanent Installation

### Prebuilt Binaries (Recommended)

Download the latest prebuilt binary for your platform from the [GitHub Releases](https://github.com/ejoneid/docker-volume-s3-backup/releases) page:

- `docker-volume-s3-backup-linux-x86_64` - For Linux x86_64 systems
- `docker-volume-s3-backup-linux-aarch64` - For Linux ARM64 systems

Make the binary executable:

```bash
chmod +x docker-volume-s3-backup-linux-x64
```

Then run it directly:

```bash
./docker-volume-s3-backup-linux-x64 my-backup-name
```

### From Source

Alternatively, clone the repository and run with Bun:

```bash
git clone https://github.com/ejoneid/docker-volume-s3-backup.git
cd docker-volume-s3-backup
bun install
bun run index.ts my-backup-name
```

## How It Works

1. **Container Mode**: Reads `/proc/self/mountinfo` to detect all Docker volumes mounted to the current container
2. **Host Mode**: Uses `docker inspect` to find volumes for a specific container
3. Creates a compressed tar.gz archive of all volume data
4. Uploads the archive to S3 using multipart uploads for reliability
5. Archive naming format: `<backup-name>__<ISO-timestamp>__.tar.gz`

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime
- Docker (for container testing)
- S3-compatible storage credentials

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Built With

- [Bun](https://bun.sh) - Fast JavaScript runtime with native TypeScript support
- Bun's built-in S3 client for efficient multipart uploads
