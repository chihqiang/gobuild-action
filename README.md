# 🚀 Go Multi-Platform Build Action

This GitHub Action builds Go binaries for multiple platforms, packages them into `.zip` or `.tar.gz` files, and outputs a list of generated archive files.

## ✨ Features

- ✅ Supports building for **Windows / Linux / macOS** on `amd64` and `arm64`
- ✅ Injects version info (`-X main.version`) into the binary
- ✅ Supports including extra files (README, LICENSE, config, etc.)
- ✅ Generates **SHA256** and **MD5** checksum files
- ✅ Outputs a **space-separated list of generated archives** for downstream steps

## 📦 Usage

## 🔧 Inputs

| Name             | Description                                                  | Type   | Default                                                      | Required |
| ---------------- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------ | -------- |
| `bin_name`       | Binary name (defaults to repository folder name)             | string | -                                                            | no       |
| `main_go`        | Go main file or package path                                 | string | `main.go`                                                    | no       |
| `version`        | Version string (defaults to GitHub ref name, or `dev` if not set) | string | `${GITHUB_REF_NAME}`                                         | no       |
| `add_files`      | Extra files/directories to include in the package (space separated) | string | `""`                                                         | no       |
| `dist_root_path` | Output directory                                             | string | `dist`                                                       | no       |
| `archs`          | Space-separated GOOS/GOARCH targets. e.g. `linux/amd64 darwin/arm64` | string | `windows/amd64 windows/arm64 linux/amd64 linux/arm64 darwin/amd64 darwin/arm64` | no       |
| build_envs       | Extra build environment variables                            | string | CGO_ENABLED=0                                                | no       |
| build_flags      | Extra go build flags                                         | string | -ldflags '-s -w -X main.version=${VERSION}'                  | no       |

### 📁 Example workflow

~~~
name: Build and Package Go Binaries

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.20'

      - name: Run Go Multi-Platform Build Action
        id: build
        uses: chihqiang/gobuild-action@main
        with:
          bin_name: myapp
          main_go: main.go
          version: ${{ github.ref_name }}
          add_files: |
            README.md
            LICENSE
          dist_root_path: dist
          
      - name: List generated files
        run: echo "Built archive files: ${{ env.GOBUILD_FILES }}"
~~~

## ⚙️ Outputs

| Name    | Description                                                  |
| ------- | ------------------------------------------------------------ |
| `files` | Space-separated list of archive file paths (`.zip`, `.tar.gz`, `.md5`, `.sha256`) |

> ⚠️ The legacy environment variable `GOBUILD_FILES` is still available, but it's recommended to use the `files` output.

##  🤝 Contributing

Feel free to open issues or PRs to improve this multi-platform Go build action!
