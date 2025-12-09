import { $ } from "bun";

const [dockerContainerId, backupName] = process.argv.slice(2);
// const dockerContainerId = args[0];
// const backupName = args[1];
if (!dockerContainerId) {
  console.error("Please provide a Docker container ID");
  process.exit(1);
}
if (!backupName) {
  console.error("Please provide a backup name");
  process.exit(1);
}

const inspectResult = Bun.spawnSync(["docker", "inspect", dockerContainerId]);

if (inspectResult.exitCode !== 0) {
  console.error(
    `Error inspecting container: ${inspectResult.stderr.toString()}`,
  );
  process.exit(1);
}

const containerData = JSON.parse(inspectResult.stdout.toString());

if (!containerData || containerData.length === 0) {
  console.error(`Container ${dockerContainerId} not found`);
  process.exit(1);
}

// Extract mount points (volume paths) from the container
const dockerVolumeSourcePaths = containerData[0].Mounts.filter(
  (mount: any) => mount.Type === "volume",
).map((mount: any) => mount.Source);

console.log("Volume source paths:", dockerVolumeSourcePaths);

// Check if all directories are empty
let allDirectoriesEmpty = true;
for (const volumePath of dockerVolumeSourcePaths) {
  const dirEntries = await Array.fromAsync(
    new Bun.Glob("*").scan({ cwd: volumePath, dot: true }),
  );
  if (dirEntries.length > 0) {
    allDirectoriesEmpty = false;
    break;
  }
}

if (allDirectoriesEmpty) {
  console.error("Error: All volume directories are empty. Nothing to backup.");
  process.exit(1);
}

const archiveName = `${backupName}_${Date.now()}.tar.gz`;

console.log(`tar -c -z -f ${archiveName} ${dockerVolumeSourcePaths.join(" ")}`);
await $`sudo tar -c -z -f ${archiveName} ${dockerVolumeSourcePaths.join(" ")}`;

// Check if the archive is empty (only header, less than 1KB)
const archiveFile = Bun.file(archiveName);
const archiveExists = await archiveFile.exists();

if (!archiveExists) {
  console.error(`Error: Archive ${archiveName} was not created.`);
  process.exit(1);
}

const archiveSize = archiveFile.size;
if (archiveSize < 1024) {
  console.error(
    `Error: Archive ${archiveName} is empty or too small (${archiveSize} bytes).`,
  );
  process.exit(1);
}

console.log(
  `Backup created successfully: ${archiveName} (${archiveSize} bytes)`,
);
