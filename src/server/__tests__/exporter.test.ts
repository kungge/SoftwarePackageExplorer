import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SoftwarePackage } from "../../shared/types.js";
import { toCsv, toMarkdown } from "../exporter.js";

const item: SoftwarePackage = {
  id: "1",
  name: "Chrome, Enterprise",
  version: "136.0",
  fileType: "exe",
  sizeBytes: 123,
  sizeText: "123 B",
  modifiedAt: "2026-01-02T03:04:05.000Z",
  path: "/software/windows/Chrome|Enterprise.exe",
  relativePath: "windows/Chrome|Enterprise.exe",
  category: "Chrome",
  platform: "Windows"
};

describe("exporter", () => {
  it("escapes CSV values", () => {
    const csv = toCsv([item]);
    assert.equal(csv.includes('"Chrome, Enterprise"'), true);
    assert.equal(csv.includes("/software/windows/Chrome|Enterprise.exe"), true);
  });

  it("escapes markdown pipe characters", () => {
    const markdown = toMarkdown([item]);
    assert.equal(markdown.includes("Chrome\\|Enterprise.exe"), true);
    assert.equal(markdown.includes("| 软件名称 | 版本 | 平台 | 文件类型 | 大小 | 更新时间 | 路径 |"), true);
  });
});
