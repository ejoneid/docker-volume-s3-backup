import { uploadFile } from "./src/s3";
import {
  debugLog,
  dynamicSudo,
  errorAndExit,
  getVolumeMountPointsFromProc,
  getVolumeMountsFromDockerInspect,
  has2Args,
} from "./src/utils";

const args = process.argv.slice(2);
if (args.length > 2) {
  errorAndExit(
    "Usage: docker-volume-s3-backup <backup-name> [container-id]\n" +
      "  When run inside a container: docker-volume-s3-backup <backup-name>\n" +
      "  When run on the host: docker-volume-s3-backup <backup-name> <container-id>",
  );
}

const backupName = args[0];
let directoriesToBackup: string[];

if (has2Args(args)) {
  const dockerContainerId = args[1];
  console.log(
    `Running in host mode, inspecting container: ${dockerContainerId}`,
  );
  directoriesToBackup = getVolumeMountsFromDockerInspect(dockerContainerId);
} else {
  console.log(
    "Running in container mode, reading mounts from /proc/self/mountinfo",
  );
  directoriesToBackup = await getVolumeMountPointsFromProc();
}

console.log("Found volume paths:", directoriesToBackup);
if (directoriesToBackup.length === 0) errorAndExit("No volumes found");

let allDirectoriesEmpty = true;
let shouldUseSudo = false;
for (const volumePath of directoriesToBackup) {
  debugLog(`Checking directory: ${volumePath}`);
  const lsCommand = dynamicSudo(shouldUseSudo, ["ls", "-A", volumePath]);
  let lsResult = Bun.spawnSync(lsCommand);
  const shouldRetryWithSudo: boolean =
    !shouldUseSudo && lsResult.exitCode !== 0;
  shouldUseSudo = shouldUseSudo || shouldRetryWithSudo;
  if (shouldRetryWithSudo) {
    lsResult = Bun.spawnSync(["sudo", "ls", "-A", volumePath]);
    if (lsResult.exitCode !== 0) {
      errorAndExit(
        `Error: Cannot access ${volumePath}. ${lsResult.stderr.toString()}`,
      );
    }
  }
  const output = lsResult.stdout.toString().trim();
  if (output.length > 0) {
    allDirectoriesEmpty = false;
    debugLog(`Directory ${volumePath} is not empty`);
    break;
  }
}

if (allDirectoriesEmpty)
  errorAndExit("Error: All volume directories are empty. Nothing to backup.");

const archiveName = `${backupName}__${new Date().toISOString().replace(/[:.]/g, "-")}__.tar.gz`;
const tarCommand = dynamicSudo(shouldUseSudo, [
  "sudo",
  "tar",
  "-c",
  "-z",
  "-f",
  archiveName,
  ...directoriesToBackup,
]);
const tarProcess = Bun.spawnSync(tarCommand);

const archiveFile = Bun.file(archiveName);
if (!(await archiveFile.exists()))
  errorAndExit(
    `Error: Archive ${archiveName} was not created.\n${tarProcess.stderr.toString()}`,
  );

const archiveSize = archiveFile.size;
if (archiveSize < 512)
  errorAndExit(
    `Error: Archive ${archiveName} is empty or too small (${archiveSize} bytes).`,
  );

debugLog(`Archive created successfully: ${archiveName} (${archiveSize} bytes)`);

await uploadFile(archiveFile);
console.log(`Backup completed successfully`);
