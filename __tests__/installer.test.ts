import io = require("@actions/io");
import fs = require("fs");
import path = require("path");
import child_process = require("child_process");

const toolDir = path.join(__dirname, "runner", "tools");
const tempDir = path.join(__dirname, "runner", "temp");

process.env["RUNNER_TOOL_CACHE"] = toolDir;
process.env["RUNNER_TEMP"] = tempDir;
import * as installer from "../src/installer";

const ghidraFilePath = path.join(tempDir, "ghidra.zip");
const ghidraUrl =
  "https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_10.0_build/ghidra_10.0_PUBLIC_20210621.zip";

describe("installer tests", () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
    if (!fs.existsSync(`${ghidraFilePath}.complete`)) {
      // Download java
      await io.mkdirP(tempDir);

      console.log("Downloading ghidra");
      child_process.execSync(`curl "${ghidraUrl}" > "${ghidraFilePath}"`);
      // Write complete file so we know it was successful
      fs.writeFileSync(`${ghidraFilePath}.complete`, "content");
    }
  }, 300000);

  afterAll(async () => {
    try {
      await io.rmRF(toolDir);
      await io.rmRF(tempDir);
    } catch {
      console.log("Failed to remove test directories");
    }
  }, 100000);

  it("Installs version of Ghidra if no matching version is installed", async () => {
    await installer.installGhidra("10.0");
    const ghidraDir = path.join(toolDir, "ghidra", "10.0", "x64");

    expect(fs.existsSync(path.join(ghidraDir, "ghidraRun"))).toBe(true);
    expect(process.env["GHIDRA_INSTALL_DIR"]).toBe(ghidraDir);
  }, 100000);

  it("Throws if invalid directory to Ghidra", async () => {
    let thrown = false;
    try {
      await installer.installGhidra("tesuyatesuya");
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  });
});
