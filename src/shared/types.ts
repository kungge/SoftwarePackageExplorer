export type ExportFormat = "csv" | "json" | "markdown";

export interface SoftwarePackage {
  id: string;
  name: string;
  version: string;
  fileType: string;
  sizeBytes: number;
  sizeText: string;
  modifiedAt: string;
  path: string;
  relativePath: string;
  category: string;
  platform: string;
}

export interface ScanSummary {
  softwareCount: number;
  directoryCount: number;
  totalSizeBytes: number;
  totalSizeText: string;
  platformCount: number;
}

export interface StatItem {
  label: string;
  count: number;
  sizeBytes: number;
  sizeText: string;
}

export interface TreeNode {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: "directory" | "file";
  count: number;
  sizeBytes: number;
  sizeText: string;
  children: TreeNode[];
  packageId?: string;
}

export interface ScanWarning {
  path: string;
  message: string;
}

export interface ScanResult {
  rootPath: string;
  scannedAt: string;
  items: SoftwarePackage[];
  tree: TreeNode;
  summary: ScanSummary;
  platformStats: StatItem[];
  categoryStats: StatItem[];
  sizeStats: StatItem[];
  warnings: ScanWarning[];
}
