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
