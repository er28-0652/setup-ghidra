import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as httpm from "typed-rest-client/HttpClient";

let tempDirectory = process.env["RUNNER_TEMP"] || "";
const IS_WINDOWS = process.platform === "win32";

if (!tempDirectory) {
  let baseLocation;
  if (IS_WINDOWS) {
    // On windows use the USERPROFILE env variable
    baseLocation = process.env["USERPROFILE"] || "C:\\";
  } else {
    if (process.platform === "darwin") {
      baseLocation = "/Users";
    } else {
      baseLocation = "/home";
    }
  }
  tempDirectory = path.join(baseLocation, "actions", "temp");
}

const GHIDRA_BASE_URL = "https://ghidra-sre.org/";
const http: httpm.HttpClient = new httpm.HttpClient("setup-ghidra");

interface Dict {
  [key: string]: string;
}

async function getGhidraVersionInfo(): Promise<Dict> {
  // get release page
  let topPageHTML = await (await http.get(GHIDRA_BASE_URL)).readBody();
  let releaseNoteURL = topPageHTML.match(/releaseNotes.*\.html/) || "";

  let releaseNoteHTML = await (
    await http.get(GHIDRA_BASE_URL + releaseNoteURL)
  ).readBody();

  // parse Ghidra version numbre and archive name
  const ptn = /<td>(\d+\.\d+(?:\.\d+)?)<\/td>\r\n.*<a href=\"(ghidra_.*?_PUBLIC_\d{8}\.zip)\">/gi;
  let m;
  let versionInfo: Dict = {};
  while ((m = ptn.exec(releaseNoteHTML)) !== null) {
    versionInfo[m[1]] = m[2];
  }
  return versionInfo;
}

async function getLatestGhidraVersionInfo(): Promise<Dict> {
  let topPageHTML = await (await http.get(GHIDRA_BASE_URL)).readBody();

  let m = topPageHTML.match(/href=\"(ghidra_.*?_PUBLIC_\d{8}\.zip)\"/);
  if (m === null) {
    throw new Error("Ghidra Archive List was not found.");
  } else {
    let latestVersionZip = m[1];
    let latestVersionInfo: Dict = {};

    let version = latestVersionZip.split("_")[1];
    latestVersionInfo[version] = latestVersionZip;
    return latestVersionInfo;
  }
}

async function extractFiles(
  file: string,
  destinationFolder: string
): Promise<void> {
  await io.mkdirP(destinationFolder);
  const stats = fs.statSync(file);
  if (!stats) {
    throw new Error(`Failed to extract ${file} - it doesn't exist`);
  } else if (stats.isDirectory()) {
    throw new Error(`Failed to extract ${file} - it is a directory`);
  }

  await tc.extractZip(file, destinationFolder);
}

async function extractGhidraArchive(src: string, dst: string): Promise<string> {
  const ghidraArchivePath = path.normalize(src);
  const stats = fs.statSync(ghidraArchivePath);
  if (stats.isFile()) {
    await extractFiles(src, dst);
    const ghidraDirectory = path.join(dst, fs.readdirSync(dst)[0]);
    return ghidraDirectory;
  } else {
    throw new Error(`${ghidraArchivePath} is not a file`);
  }
}

export async function installGhidra(
  version: string = "",
  directLink: string = ""
): Promise<void> {
  let toolPath = tc.find("ghidra", version);

  if (toolPath) {
    core.debug(`Tool found in cache ${toolPath}`);
  } else {
    let ghidraVersionInfo: any = { version: "", archive: "" };
    let downloadURL: string = "";
    if (directLink) {
      downloadURL = directLink;
      ghidraVersionInfo.version = version;
    } else {
      if (version === "") {
        let info = await getLatestGhidraVersionInfo();
        Object.entries(info).map(([_version, ghidraZipName]) => {
          ghidraVersionInfo.version = _version;
          ghidraVersionInfo.archive = ghidraZipName;
        });
      } else {
        let info = await getGhidraVersionInfo();
        if (info[version] === undefined) {
          const err: Error = new Error(`[ERROR] ${version} is not found.`);
          throw err;
        }
        ghidraVersionInfo.version = version;
        ghidraVersionInfo.archive = info[version];
      }
      downloadURL = GHIDRA_BASE_URL + ghidraVersionInfo.archive;
    }

    console.log(
      `Version: ${ghidraVersionInfo.version}, Archive: ${ghidraVersionInfo.archive}, URL: ${downloadURL}`
    );
    let savedPath = await tc.downloadTool(downloadURL);

    let tempDir: string = path.join(
      tempDirectory,
      "temp_" + Math.floor(Math.random() * 2000000000)
    );

    let ghidraInstallDir = await extractGhidraArchive(savedPath, tempDir);
    toolPath = await tc.cacheDir(ghidraInstallDir, "ghidra", version);
  }
  core.exportVariable("GHIDRA_INSTALL_DIR", toolPath);
}
