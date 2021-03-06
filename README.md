[![Actions Status](https://github.com/er28-0652/setup-ghidra/workflows/Main%20workflow/badge.svg)](https://github.com/er28-0652/setup-ghidra/actions)

# setup-ghidra

This action sets up a Ghidra environment for use in actions by:

- optionally installing a version of Ghidra and adding to GHIDRA_INSTALL_PATH. The action will fail if no matching versions are found. To check available Ghidra version, see release note in https://ghidra-sre.org.

## Inputs

### `version`

**Required** Version of Ghidra. Default `"latest"`.

## Usage

Before setup Ghidra, you need to setup Java 11.0.x environment using `actions/setup-java`.
This action doesn't use Docker, so you can use both Windows, Linux and MacOS for `runs-on` environment.

```yaml
runs-on: ${{ matrix.os }}
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
steps:
  - uses: actions/checkout@v1
  - uses: actions/setup-java@v1
    java-version: "11.0.x"
    java-package: jdk
    architecture: x64
  - uses: er28-0652/setup-ghidra@master
    with:
      version: "9.1.1"
```
