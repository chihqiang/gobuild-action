# 🚀 Go Multi-Platform Build Action

This GitHub Action builds Go binaries for multiple platforms, packages them into `.zip` or `.tar.gz` files, and outputs a list of generated archive files.

## ✨Features

- Supports building for Windows, Linux, macOS on amd64 and arm64 architectures
- Injects version info into the binary
- Supports including additional files or directories in the package
- Generates SHA256 and MD5 checksum files
- Outputs a space-separated list of created archive files for downstream steps

## 📦 Usage

### 🔧 Inputs

| Name             | Description                               | Type   | Default         | Required |
| ---------------- | ----------------------------------------- | ------ | --------------- | -------- |
| `bin_name`       | Binary name, defaults to repo name        | string | -               | no       |
| `main_go`        | Go main file or package path              | string | `main.go`       | no       |
| `version`        | Version string, defaults to GitHub ref    | string | `${GITHUB_REF}` | no       |
| `add_files`      | Extra files/directories (space separated) | string | ""              | no       |
| `dist_root_path` | Output directory                          | string | `dist`          | no       |

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

### ⚙️ Outputs

| env Name        | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `GOBUILD_FILES` | Space-separated list of generated archive file paths (e.g. `dist/myapp_linux_amd64.tar.gz dist/myapp_windows_amd64.zip`) |

##  🤝 Contributing

Feel free to open issues or PRs to improve this multi-platform Go build action!
