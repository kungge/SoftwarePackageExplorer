import path from "node:path";
import type { SoftwarePackage } from "../shared/types.js";
import { formatBytes, stableId, titleCase } from "./utils.js";

export const SUPPORTED_EXTENSIONS = new Set([
  ".exe",
  ".msi",
  ".apk",
  ".dmg",
  ".pkg",
  ".zip",
  ".rar",
  ".7z",
  ".iso",
  ".deb",
  ".rpm",
  ".tar",
  ".gz"
]);

const PLATFORM_ALIASES: Array<[string, string]> = [
  ["windows", "Windows"],
  ["win", "Windows"],
  ["macos", "MacOS"],
  ["mac", "MacOS"],
  ["android", "Android"],
  ["apk", "Android"],
  ["linux", "Linux"]
];

const EXTENSION_PLATFORM: Record<string, string> = {
  exe: "Windows",
  msi: "Windows",
  apk: "Android",
  dmg: "MacOS",
  pkg: "MacOS",
  deb: "Linux",
  rpm: "Linux"
};

const CLEANUP_TOKENS = /\b(?:x64|x86|x86_64|amd64|arm64|aarch64|release|final|stable|setup|installer|install|offline|online|full|cn|en|win|windows|mac|macos|android|linux)\b/gi;

export function isSupportedPackage(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".tar.gz")) {
    return true;
  }
  return SUPPORTED_EXTENSIONS.has(path.extname(lowerName));
}

export function getFileType(fileName: string): string {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".tar.gz")) {
    return "tar.gz";
  }
  return path.extname(lowerName).replace(".", "") || "unknown";
}

export function inferPlatform(relativePath: string, fileType = ""): string {
  const segments = relativePath
    .toLowerCase()
    .split(/[\\/]/)
    .flatMap((segment) => segment.split(/[\s_-]+/))
    .filter(Boolean);

  for (const [alias, platform] of PLATFORM_ALIASES) {
    if (segments.includes(alias)) {
      return platform;
    }
  }

  return EXTENSION_PLATFORM[fileType] ?? "Unknown";
}

export function parseNameAndVersion(fileName: string): { name: string; version: string } {
  const extensionless = fileName.toLowerCase().endsWith(".tar.gz")
    ? fileName.slice(0, -7)
    : fileName.slice(0, fileName.length - path.extname(fileName).length);
  const versionMatch = findVersion(extensionless);
  const version = versionMatch?.version ?? "Unknown";
  const withoutVersion = versionMatch
    ? `${extensionless.slice(0, versionMatch.start)} ${extensionless.slice(versionMatch.end)}`
    : extensionless;
  const cleaned = withoutVersion
    .replace(/[._-]+/g, " ")
    .replace(CLEANUP_TOKENS, " ")
    .replace(/(?:setup|installer|install)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    name: titleCase(cleaned || extensionless),
    version
  };
}

function findVersion(input: string): { version: string; start: number; end: number } | null {
  const dotted = input.match(/v?\d{1,4}(?:\.\d{1,4}){1,3}/i);
  if (dotted?.index !== undefined) {
    return {
      version: dotted[0].replace(/^v/i, ""),
      start: dotted.index,
      end: dotted.index + dotted[0].length
    };
  }

  const year = input.match(/(?:19|20)\d{2}/);
  if (year?.index !== undefined) {
    return {
      version: year[0],
      start: year.index,
      end: year.index + year[0].length
    };
  }

  return null;
}

export function inferCategory(relativePath: string, platform: string): string {
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) {
    return platform === "Unknown" ? "Uncategorized" : platform;
  }

  const lowerPlatform = platform.toLowerCase();
  const directoryParts = parts.slice(0, -1);
  const category = directoryParts.find((part) => {
    const normalized = part.toLowerCase();
    return normalized !== lowerPlatform && normalized !== "win" && normalized !== "apk";
  });

  return category ? titleCase(category) : platform;
}

export function parsePackage(filePath: string, rootPath: string, sizeBytes: number, modifiedAt: Date): SoftwarePackage {
  const relativePath = path.relative(rootPath, filePath);
  const fileName = path.basename(filePath);
  const fileType = getFileType(fileName);
  const platform = inferPlatform(relativePath, fileType);
  const { name, version } = parseNameAndVersion(fileName);

  return {
    id: stableId(filePath),
    name,
    version,
    fileType,
    sizeBytes,
    sizeText: formatBytes(sizeBytes),
    modifiedAt: modifiedAt.toISOString(),
    path: filePath,
    relativePath,
    category: inferCategory(relativePath, platform),
    platform
  };
}
