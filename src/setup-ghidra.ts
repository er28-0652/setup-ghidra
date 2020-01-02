import * as core from "@actions/core";
import * as installer from "./installer";

async function run() {
  try {
    let version = core.getInput("latest");

    if (version) {
      version = version == "latest" ? "" : version;
      installer.installGhidra(version);
    }
  } catch (err) {
    core.setFailed(err.message);
  }
}

run();
