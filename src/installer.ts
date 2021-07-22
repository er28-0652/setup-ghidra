import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import { Octokit } from "@octokit/rest";

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

const REPO_OWNER = "NationalSecurityAgency";
const REPO_NAME = "ghidra";
const octokit = new Octokit();

interface Dict {
  [key: string]: string;
}

async function getDownloadURLByTag(tag: string): Promise<string> {
  let tagName = `Ghidra_${tag}_build`;
  let response = await octokit.rest.repos.getReleaseByTag({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    tag: tagName
  });

  if (response.status != 200) {
    throw new Error(`not found tag: ${tagName}`);
  }

  let assets = await octokit.rest.repos.listReleaseAssets({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    release_id: response.data.id
  });

  return assets.data[0].browser_download_url;
}

async function getLatestDownloadURL(): Promise<string> {
  let response = await octokit.rest.repos.getLatestRelease({
    owner: REPO_OWNER,
    repo: REPO_NAME
  });
  if (response.status != 200) {
    throw new Error(`error status: ${response.status}`);
  }

  let assets = await octokit.rest.repos.listReleaseAssets({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    release_id: response.data.id
  });

  return assets.data[0].browser_download_url;
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
    let downloadURL: string = "";
    if (directLink) {
      downloadURL = directLink;
    } else {
      if (version === "") {
        version = "latest";
        downloadURL = await getLatestDownloadURL();
      } else {
        downloadURL = await getDownloadURLByTag(version);
      }

      if (downloadURL === "") {
        throw new Error(`[ERROR] ${version} is not found.`);
      }
    }

    console.log(`Version: ${version}, URL: ${downloadURL}`);
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
