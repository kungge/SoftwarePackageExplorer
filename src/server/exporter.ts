import type { ExportFormat, SoftwarePackage } from "../shared/types.js";

const HEADERS = ["软件名称", "版本", "平台", "文件类型", "大小", "更新时间", "路径"];

export function exportPackages(format: ExportFormat, items: SoftwarePackage[]): { contentType: string; fileName: string; content: string } {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  if (format === "json") {
    return {
      contentType: "application/json; charset=utf-8",
      fileName: `software-packages-${timestamp}.json`,
      content: JSON.stringify(items, null, 2)
    };
  }

  if (format === "markdown") {
    return {
      contentType: "text/markdown; charset=utf-8",
      fileName: `software-packages-${timestamp}.md`,
      content: toMarkdown(items)
    };
  }

  return {
    contentType: "text/csv; charset=utf-8",
    fileName: `software-packages-${timestamp}.csv`,
    content: toCsv(items)
  };
}

export function toCsv(items: SoftwarePackage[]): string {
  const rows = items.map((item) => [
    item.name,
    item.version,
    item.platform,
    item.fileType,
    item.sizeText,
    item.modifiedAt,
    item.path
  ]);

  return [HEADERS, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function toMarkdown(items: SoftwarePackage[]): string {
  const rows = items.map((item) => [
    item.name,
    item.version,
    item.platform,
    item.fileType,
    item.sizeText,
    item.modifiedAt,
    item.path
  ]);

  return [
    `| ${HEADERS.join(" | ")} |`,
    `| ${HEADERS.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdown).join(" | ")} |`)
  ].join("\n");
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
