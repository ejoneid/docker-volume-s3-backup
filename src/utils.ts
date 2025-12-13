const DEBUG = process.env.DEBUG === "true";

export function debugLog(message: string): void {
  if (DEBUG) {
    console.log(message);
  }
}

export function errorAndExit(message: string): never {
  console.error(message);
  process.exit(1);
}

export function has2Args(args: string[]): args is [string, string] {
  return args.length === 2;
}

export function dynamicSudo(shouldUseSudo: boolean, args: string[]): string[] {
  return shouldUseSudo ? ["sudo", ...args] : args;
}

export function requiredNotUndefined<T>(
  value: T | undefined,
  message: string,
): asserts value is T {
  if (value === undefined) {
    errorAndExit(message);
  }
}

// Function to get volume mounts using docker inspect (for running from host)
export function getVolumeMountsFromDockerInspect(
  containerId: string,
): string[] {
  const inspectResult = Bun.spawnSync(["docker", "inspect", containerId]);
  if (inspectResult.exitCode !== 0)
    errorAndExit(
      `Error inspecting container: ${inspectResult.stderr.toString()}`,
    );

  const containerData = JSON.parse(inspectResult.stdout.toString());
  if (!containerData || containerData.length === 0)
    errorAndExit(`Container ${containerId} not found`);

  return containerData[0].Mounts.map((mount: any) => mount.Source);
}

// Function to get volume mounts from /proc/self/mountinfo
export async function getVolumeMountPointsFromProc(): Promise<string[]> {
  try {
    const catResult = Bun.spawnSync(["cat", "/proc/self/mountinfo"]);
    if (catResult.exitCode !== 0) {
      throw new Error(
        `Failed to read /proc/self/mountinfo: ${catResult.stderr.toString()}`,
      );
    }

    const content = catResult.stdout.toString();
    if (!content || content.trim().length === 0) {
      throw new Error("/proc/self/mountinfo is empty");
    }

    const lines = content.split("\n");
    const volumeMountPoints: string[] = [];

    debugLog("=== Parsing /proc/self/mountinfo ===");

    for (const line of lines) {
      if (!line.trim()) continue;

      debugLog(`Line: ${line}`);

      // mountinfo format:
      // 36 35 98:0 /mnt1 /mnt2 rw,noatime master:1 - ext3 /dev/root rw,errors=continue
      // Fields are separated by spaces, with " - " separating optional and mandatory fields
      const parts = line.split(" ");
      if (parts.length < 10) continue;

      // Find the separator " - "
      const separatorIndex = parts.indexOf("-");
      if (separatorIndex === -1) continue;

      // Field 3 (index 3): root of the mount within the filesystem
      // Field 4 (index 4): mount point relative to process root
      const root = parts[3];
      const mountPoint = parts[4];
      debugLog(`  Root: ${root}, Mount point: ${mountPoint}`);
      if (!root || !mountPoint) continue;

      // Check if this is a Docker volume mount
      // Docker volumes are mounted from /var/lib/docker/volumes/<volume-name>/_data
      if (
        root.includes("/var/lib/docker/volumes/") &&
        root.endsWith("/_data")
      ) {
        debugLog(`  -> Found Docker volume: ${mountPoint}`);
        volumeMountPoints.push(mountPoint);
      }
    }

    debugLog(`=== Found ${volumeMountPoints.length} volume(s) ===`);
    return [...new Set(volumeMountPoints)]; // Remove duplicates
  } catch (error) {
    throw new Error(`Failed to read mount information: ${error}`);
  }
}
