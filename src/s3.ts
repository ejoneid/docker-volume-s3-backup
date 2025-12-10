import { S3Client, type BunFile } from "bun";

const s3client = new S3Client({
  accessKeyId: process.env.S3_BACKUP_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_BACKUP_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BACKUP_BUCKET_NAME,
  endpoint: process.env.S3_BACKUP_ENDPOINT,
});

export async function uploadFile(file: BunFile): Promise<void> {
  if (!file.name) throw new Error("File name is required for s3 upload");
  const s3file = s3client.file(file.name);
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const writer = s3file.writer({
    retry: 3,
    queueSize: 10,
    partSize: chunkSize,
  });

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await chunk.arrayBuffer();
    writer.write(new Uint8Array(arrayBuffer));
    await writer.flush();
  }

  await writer.end();
}
