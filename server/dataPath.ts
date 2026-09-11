import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const currentDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the path to a data file safely across local development,
 * Cloud Run containers, and Vercel Serverless Functions (/var/task).
 */
export function resolveDataPath(filename: string): string {
  const possiblePaths = [
    path.join(process.cwd(), "data", filename),
    path.join(process.cwd(), "dist", "data", filename),
    path.join(currentDir, "..", "data", filename),
    path.join(currentDir, "data", filename),
    path.join(currentDir, "..", "..", "data", filename),
    path.resolve("data", filename),
    path.join(process.cwd(), "..", "data", filename),
    path.join("/var/task", "data", filename),
    path.join("/var/task", "dist", "data", filename),
    path.join("/var/task", "api", "..", "data", filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return path.join(process.cwd(), "data", filename);
}
