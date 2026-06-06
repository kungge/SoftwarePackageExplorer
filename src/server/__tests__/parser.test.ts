import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatBytes } from "../utils.js";
import { inferPlatform, parseNameAndVersion, parsePackage } from "../parser.js";

describe("parser", () => {
  it("extracts version from Chrome setup file names", () => {
    assert.deepEqual(parseNameAndVersion("ChromeSetup_136.0.exe"), {
      name: "Chrome",
      version: "136.0"
    });
  });

  it("cleans common release and architecture tokens", () => {
    assert.deepEqual(parseNameAndVersion("wechat_v3.9.10_x64.exe"), {
      name: "Wechat",
      version: "3.9.10"
    });
  });

  it("extracts year-like versions", () => {
    assert.deepEqual(parseNameAndVersion("Office2021.iso"), {
      name: "Office",
      version: "2021"
    });
  });

  it("infers platform from directories and file type fallback", () => {
    assert.equal(inferPlatform("windows/Office/Office2021.iso", "iso"), "Windows");
    assert.equal(inferPlatform("MacOS/Chrome.dmg", "dmg"), "MacOS");
    assert.equal(inferPlatform("Android/APK/WeChat.apk", "apk"), "Android");
    assert.equal(inferPlatform("Linux/tools/app.deb", "deb"), "Linux");
    assert.equal(inferPlatform("misc/tool.exe", "exe"), "Windows");
  });

  it("formats byte sizes across common units", () => {
    assert.equal(formatBytes(0), "0 B");
    assert.equal(formatBytes(1024), "1.00 KB");
    assert.equal(formatBytes(1024 * 1024), "1.00 MB");
    assert.equal(formatBytes(1024 * 1024 * 1024), "1.00 GB");
  });

  it("builds a package record from stat-like input", () => {
    const item = parsePackage("/repo/software/windows/Chrome/ChromeSetup_136.0.exe", "/repo/software", 125829120, new Date("2026-01-02T03:04:05Z"));
    assert.equal(item.name, "Chrome");
    assert.equal(item.version, "136.0");
    assert.equal(item.fileType, "exe");
    assert.equal(item.platform, "Windows");
    assert.equal(item.category, "Chrome");
    assert.equal(item.sizeText, "120 MB");
  });
});
