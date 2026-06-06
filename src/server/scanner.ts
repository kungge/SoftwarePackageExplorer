import fs from "node:fs/promises";
import path from "node:path";
import type { ScanResult, ScanWarning, SoftwarePackage, StatItem, TreeNode } from "../shared/types.js";
import { isSupportedPackage, parsePackage } from "./parser.js";
import { formatBytes, stableId, titleCase } from "./utils.js";

interface WalkState {
  directoryCount: number;
  items: SoftwarePackage[];
  warnings: ScanWarning[];
}

export async function scanDirectory(rootPath: string): Promise<ScanResult> {
  const resolvedRoot = path.resolve(rootPath);
  const rootStat = await fs.stat(resolvedRoot);
  if (!rootStat.isDirectory()) {
    throw new Error("Root path must be a directory.");
  }

  const state: WalkState = {
    directoryCount: 0,
    items: [],
    warnings: []
  };

  await walkDirectory(resolvedRoot, resolvedRoot, state);
  const platforms = new Set(state.items.map((item) => item.platform));
  const totalSizeBytes = state.items.reduce((sum, item) => sum + item.sizeBytes, 0);

  return {
    rootPath: resolvedRoot,
    scannedAt: new Date().toISOString(),
    items: state.items.sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    tree: buildTree(resolvedRoot, state.items),
    summary: {
      softwareCount: state.items.length,
      directoryCount: state.directoryCount,
      totalSizeBytes,
      totalSizeText: formatBytes(totalSizeBytes),
      platformCount: platforms.size
    },
    platformStats: buildStats(state.items, "platform"),
    categoryStats: buildStats(state.items, "category"),
    sizeStats: buildStats(state.items, "category", true),
    warnings: state.warnings
  };
}

async function walkDirectory(currentPath: string, rootPath: string, state: WalkState): Promise<void> {
  state.directoryCount += 1;

  let dir;
  try {
    dir = await fs.opendir(currentPath);
  } catch (error) {
    state.warnings.push({
      path: currentPath,
      message: error instanceof Error ? error.message : "Unable to read directory."
    });
    return;
  }

  for await (const entry of dir) {
    const entryPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(entryPath, rootPath, state);
      continue;
    }

    if (!entry.isFile() || !isSupportedPackage(entry.name)) {
      continue;
    }

    try {
      const stat = await fs.stat(entryPath);
      state.items.push(parsePackage(entryPath, rootPath, stat.size, stat.mtime));
    } catch (error) {
      state.warnings.push({
        path: entryPath,
        message: error instanceof Error ? error.message : "Unable to read file."
      });
    }
  }
}

function createDirectoryNode(name: string, fullPath: string, rootPath: string): TreeNode {
  const relativePath = path.relative(rootPath, fullPath);
  return {
    id: stableId(fullPath || name),
    name: titleCase(name || path.basename(rootPath) || "Root"),
    path: fullPath,
    relativePath,
    type: "directory",
    count: 0,
    sizeBytes: 0,
    sizeText: "0 B",
    children: []
  };
}

export function buildTree(rootPath: string, items: SoftwarePackage[]): TreeNode {
  const root = createDirectoryNode(path.basename(rootPath), rootPath, rootPath);

  for (const item of items) {
    const parts = item.relativePath.split(path.sep).filter(Boolean);
    let current = root;
    current.count += 1;
    current.sizeBytes += item.sizeBytes;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const childRelativePath = path.join(...parts.slice(0, index + 1));
      let child = current.children.find((node) => node.relativePath === childRelativePath);

      if (!child) {
        const fullPath = path.join(rootPath, childRelativePath);
        child = isFile
          ? {
              id: item.id,
              name: part,
              path: item.path,
              relativePath: item.relativePath,
              type: "file",
              count: 1,
              sizeBytes: item.sizeBytes,
              sizeText: item.sizeText,
              children: [],
              packageId: item.id
            }
          : createDirectoryNode(part, fullPath, rootPath);
        current.children.push(child);
      }

      if (!isFile) {
        child.count += 1;
        child.sizeBytes += item.sizeBytes;
      }

      current = child;
    });
  }

  finalizeTree(root);
  return root;
}

function finalizeTree(node: TreeNode): void {
  node.sizeText = formatBytes(node.sizeBytes);
  node.children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(finalizeTree);
}

function buildStats(items: SoftwarePackage[], key: "platform" | "category", sortBySize = false): StatItem[] {
  const grouped = new Map<string, { count: number; sizeBytes: number }>();

  for (const item of items) {
    const label = item[key] || "Unknown";
    const current = grouped.get(label) ?? { count: 0, sizeBytes: 0 };
    current.count += 1;
    current.sizeBytes += item.sizeBytes;
    grouped.set(label, current);
  }

  return [...grouped.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      sizeBytes: value.sizeBytes,
      sizeText: formatBytes(value.sizeBytes)
    }))
    .sort((a, b) => (sortBySize ? b.sizeBytes - a.sizeBytes : b.count - a.count));
}
