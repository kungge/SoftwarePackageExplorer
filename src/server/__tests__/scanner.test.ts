import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { scanDirectory } from "../scanner.js";

let tempRoot = "";

describe("scanner", () => {
  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  it("scans a software directory and builds stats", async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "spe-"));
    await fs.mkdir(path.join(tempRoot, "windows", "Office"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "Android", "APK"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, "windows", "Office", "Office2021.iso"), "office");
    await fs.writeFile(path.join(tempRoot, "Android", "APK", "WeChat_v3.9.10.apk"), "wechat");
    await fs.writeFile(path.join(tempRoot, "readme.txt"), "ignored");

    const result = await scanDirectory(tempRoot);

    assert.equal(result.summary.softwareCount, 2);
    assert.equal(result.summary.directoryCount, 5);
    assert.deepEqual(result.platformStats.map((item) => item.label).sort(), ["Android", "Windows"]);
    assert.equal(result.tree.count, 2);
    assert.deepEqual(result.tree.children.map((child) => child.name).sort(), ["Android", "Windows"]);
    assert.deepEqual(result.items.map((item) => item.name).sort(), ["Office", "WeChat"]);
  });
});
