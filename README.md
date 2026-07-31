# 🚀 Go Multi-Platform Build Action

Build Go binaries for multiple platforms, package them into `.zip` or `.tar.gz` files, and output a list of generated archive files.

Built with **TypeScript**, bundled with **Vite**, and tested with **Vitest**. Licensed under **Apache-2.0**.

## ✨ Features

- ✅ Supports building for **every GOOS / GOARCH** in Go's official `go tool dist list` (Windows, Linux, macOS, FreeBSD, OpenBSD, etc.)
- ✅ Injects version info (`-X main.version`) into the binary
- ✅ Supports including extra files (README, LICENSE, config, etc.)
- ✅ Packages into `.zip` / `.tar.gz` with pure-JS [`archiver`](https://www.npmjs.com/package/archiver) — no system `zip`/`tar` command required
- ✅ Generates **SHA256** and **MD5** checksum files (via Node.js `crypto`, cross-platform)
- ✅ Outputs a **space-separated list of generated archives** for downstream steps
- ✅ Parallel builds across all targets
- ✅ Runs on the Node.js 24 runtime (`runs.using: node24`)

## 🔧 Inputs

| Name             | Description                                                  | Type   | Default                                                      | Required |
| ---------------- | ------------------------------------------------------------ | ------ | ------------------------------------------------------------ | -------- |
| `bin_name`       | Binary name (defaults to repository folder name)             | string | -                                                            | no       |
| `main_go`        | Go main file or package path                                 | string | `main.go`                                                    | no       |
| `version`        | Version string (defaults to GitHub ref name, or `main`)      | string | `${GITHUB_REF_NAME}`                                         | no       |
| `add_files`      | Extra files/directories to include in the package (space separated) | string | `""`                                                         | no       |
| `dist_root_path` | Output directory                                             | string | `dist`                                                       | no       |
| `archs`          | Space-separated GOOS/GOARCH targets. e.g. `linux/amd64 darwin/arm64` | string | `windows/amd64 windows/arm64 linux/amd64 linux/arm64 darwin/amd64 darwin/arm64` | no       |
| `build_envs`     | Extra build environment variables                            | string | `CGO_ENABLED=0`                                              | no       |
| `build_flags`    | Extra go build flags. `${VERSION}` is expanded with the version input | string | `-ldflags '-s -w -X main.version=${VERSION}'`                | no       |

## ⚙️ Outputs

| Name    | Description                                                  |
| ------- | ------------------------------------------------------------ |
| `gobuild_files` | Space-separated list of archive file paths (`.zip`, `.tar.gz`, `.md5`, `.sha256`) |
| `GOBUILD_FILES` (legacy env) | Space-separated list of archive file paths, exported as an environment variable. Retained for backward compatibility |

> ⚠️ The legacy environment variable `GOBUILD_FILES` is still exported, but it's recommended to use the `gobuild_files` output.
>
> ⚠️ If any platform build fails, the action exits immediately and **no outputs are set** (`gobuild_files` / `GOBUILD_FILES` will be empty).

## 📁 Example workflow

~~~yaml
name: Build and Package Go Binaries

on:
  release:
    types: [published]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.25'

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
        run: echo "Built archive files: ${{ steps.build.outputs.gobuild_files }}"
~~~

## 🛠️ Development

Requires **Node.js 22+** (the action itself runs on GitHub's Node 24 runtime).

```bash
npm install        # install dependencies
npm run typecheck  # type check with tsc
npm test           # run tests with vitest
npm run build      # bundle src/ to dist/index.cjs with vite
```

The bundled `dist/index.cjs` is the action entry (`action.yml` → `runs.main`), so **rebuild it after any source change** before pushing a release.

## 🤝 Contributing

Feel free to open issues or PRs to improve this multi-platform Go build action!

## 📄 License

[Apache-2.0](LICENSE)
