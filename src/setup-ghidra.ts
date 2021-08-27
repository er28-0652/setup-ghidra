import * as core from "@actions/core";
import * as installer from "./installer";

async function run() {
  try {
    let version = core.getInput("version");
    let directLink = core.getInput("directLink");
    let repoToken = core.getInput("repo-token");

    if (repoToken) {
      installer.setAuthToken(repoToken);
    }

    // if user specified directLink, use it
    if (directLink) {
      installer.installGhidra(version, directLink);
    } else {
      version = version == "latest" ? "" : version;
      installer.installGhidra(version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
