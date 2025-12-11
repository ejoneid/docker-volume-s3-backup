FROM oven/bun:1-alpine AS builder

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-alpine
# Install sudo and tar (needed for backup operations)
RUN apk add --no-cache sudo tar

COPY --from=builder /app/docker-volume-s3-backup /docker-volume-s3-backup

# Environment variables for S3 (to be overridden at runtime)
ENV S3_BACKUP_ACCESS_KEY_ID=""
ENV S3_BACKUP_SECRET_ACCESS_KEY=""
ENV S3_BACKUP_BUCKET_NAME=""
ENV S3_BACKUP_ENDPOINT=""
ENV DEBUG="false"

# The backup name will be passed as a command-line argument
# Example: docker run ... your-image backup-name
ENTRYPOINT ["/docker-volume-s3-backup"]
CMD []
