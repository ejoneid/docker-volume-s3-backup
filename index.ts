import { uploadFile } from "./src/s3";
import { debugLog, errorAndExit as logAndExit } from "./src/utils";

const [dockerContainerId, backupName] = process.argv.slice(2);
if (!dockerContainerId) logAndExit("Please provide a Docker container ID");
if (!backupName) logAndExit("Please provide a backup name");

const inspectResult = Bun.spawnSync(["docker", "inspect", dockerContainerId]);
if (inspectResult.exitCode !== 0)
  logAndExit(`Error inspecting container: ${inspectResult.stderr.toString()}`);

const containerData = JSON.parse(inspectResult.stdout.toString());
if (!containerData || containerData.length === 0)
  logAndExit(`Container ${dockerContainerId} not found`);

const dockerVolumeSourcePaths = containerData[0].Mounts.filter(
  (mount: any) => mount.Type === "volume",
).map((mount: any) => mount.Source);
console.log("Found volume source paths:", dockerVolumeSourcePaths);

let allDirectoriesEmpty = true;
for (const volumePath of dockerVolumeSourcePaths) {
  debugLog(`Checking directory: ${volumePath}`);
  // Try to read directory with sudo since Docker volumes require elevated permissions
  const lsResult = Bun.spawnSync(["sudo", "ls", "-A", volumePath]);
  if (lsResult.exitCode !== 0) {
    logAndExit(
      `Error: Cannot access ${volumePath}. ${lsResult.stderr.toString()}`,
    );
  }
  const output = lsResult.stdout.toString().trim();
  if (output.length > 0) {
    allDirectoriesEmpty = false;
    debugLog(`Directory ${volumePath} is not empty`);
    break;
  }
}

if (allDirectoriesEmpty)
  logAndExit("Error: All volume directories are empty. Nothing to backup.");

const archiveName = `${backupName}__${new Date().toISOString().replace(/[:.]/g, "-")}__.tar.gz`;
const tarProcess = Bun.spawnSync([
  "sudo",
  "tar",
  "-c",
  "-z",
  "-f",
  archiveName,
  ...dockerVolumeSourcePaths,
]);

const archiveFile = Bun.file(archiveName);
if (!(await archiveFile.exists()))
  logAndExit(
    `Error: Archive ${archiveName} was not created.\n${tarProcess.stderr.toString()}`,
  );

const archiveSize = archiveFile.size;
if (archiveSize < 512)
  logAndExit(
    `Error: Archive ${archiveName} is empty or too small (${archiveSize} bytes).`,
  );

debugLog(`Archive created successfully: ${archiveName} (${archiveSize} bytes)`);

await uploadFile(archiveFile);
console.log(`Backup completed successfully`);
