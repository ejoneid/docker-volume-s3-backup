# Docker Volume S3 Backup

A lightweight utility to backup Docker volumes to S3-compatible storage. Can be run from the host or within a Docker container to automatically backup all mounted volumes.

## Features

- 🚀 Backup Docker volumes to any S3-compatible storage (AWS S3, MinIO, Backblaze B2, etc.)
- 🐳 Run from within a container to automatically backup its own volumes
- 💻 Or run from the host to backup any container's volumes
- 📦 Creates compressed tar.gz archives with timestamps
- ⚡ Built with [Bun](https://bun.sh) for fast performance
- 🔒 Supports S3 multipart uploads for large backups

## Prerequisites

- [Bun](https://bun.sh) runtime (for local development)
- Docker (for containerized usage)
- S3-compatible storage credentials

## Installation

### Using Docker (Recommended)

Build the Docker image:

```bash
docker build -t docker-volume-backup .
```

### Local Development

Install dependencies:

```bash
bun install
```

## Configuration

Set the following environment variables for S3 access:

- `S3_BACKUP_ACCESS_KEY_ID` - Your S3 access key ID
- `S3_BACKUP_SECRET_ACCESS_KEY` - Your S3 secret access key
- `S3_BACKUP_BUCKET_NAME` - The S3 bucket name
- `S3_BACKUP_ENDPOINT` - The S3 endpoint URL
- `DEBUG` - Set to `true` for verbose logging (optional)

## Usage

### Running Inside a Container

This mode automatically detects and backs up all volumes mounted to the container:

```bash
docker run --rm \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes:ro \
  -e S3_BACKUP_ACCESS_KEY_ID=your-key \
  -e S3_BACKUP_SECRET_ACCESS_KEY=your-secret \
  -e S3_BACKUP_BUCKET_NAME=your-bucket \
  -e S3_BACKUP_ENDPOINT=https://s3.amazonaws.com \
  docker-volume-backup my-backup-name
```

### Running from the Host

Backup a specific container's volumes by providing the container ID:

```bash
bun run index.ts my-backup-name container-id-or-name
```

### Using Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  backup:
    image: docker-volume-backup
    volumes:
      - /var/lib/docker/volumes:/var/lib/docker/volumes:ro
      - app-data:/data
      - app-config:/config
    environment:
      - S3_BACKUP_ACCESS_KEY_ID=${S3_BACKUP_ACCESS_KEY_ID}
      - S3_BACKUP_SECRET_ACCESS_KEY=${S3_BACKUP_SECRET_ACCESS_KEY}
      - S3_BACKUP_BUCKET_NAME=${S3_BACKUP_BUCKET_NAME}
      - S3_BACKUP_ENDPOINT=${S3_BACKUP_ENDPOINT}
    command: ["my-app-backup"]

volumes:
  app-data:
  app-config:
```

Then run:

```bash
docker-compose up backup
```

## How It Works

1. **Container Mode**: Reads `/proc/self/mountinfo` to detect all Docker volumes mounted to the current container
2. **Host Mode**: Uses `docker inspect` to find volumes for a specific container
3. Creates a compressed tar.gz archive of all volume data
4. Uploads the archive to S3 using multipart uploads for reliability
5. Archive naming format: `<backup-name>__<ISO-timestamp>__.tar.gz`

## Development

Build the standalone binary:

```bash
bun run build
```

Run with debug logging:

```bash
DEBUG=true bun run index.ts my-backup
```

## License

This project is private and not licensed for public use.

## Built With

- [Bun](https://bun.sh) - Fast JavaScript runtime with native TypeScript support
- Bun's built-in S3 client for efficient multipart uploads