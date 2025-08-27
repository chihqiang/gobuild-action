#!/bin/bash
set -euo pipefail

# ===== 构建配置 =====
BIN_NAME="${BIN_NAME:-$(basename "$(pwd)")}"
DIST_ROOT_PATH="${DIST_ROOT_PATH:-"dist"}"
MAIN_GO="${MAIN_GO:-"main.go"}"
VERSION="${VERSION:-${GITHUB_REF_NAME:-"main"}}"
ADD_FILES="${ADD_FILES:-""}"
BUILD_ENVS="${BUILD_ENVS:-"CGO_ENABLED=0"}"
BUILD_FLAGS="${BUILD_FLAGS:-"-ldflags '-s -w -X main.version=${VERSION}'"}"


# 默认构建目标（可通过 ARCHS 覆盖）
ARCHS="${ARCHS:-"windows/amd64 windows/arm64 linux/amd64 linux/arm64 darwin/amd64 darwin/arm64"}"

# ===== 彩色输出函数 =====
color_echo() { local color_code=$1; shift; printf "\033[%sm%s\033[0m\n" "$color_code" "$*"; }
success() { color_echo "1;32" "✅ $@"; }
error()   { color_echo "1;31" "❌ $@"; }
step()    { color_echo "1;36" "🚀 $@"; }

# ===== 构建函数 =====
build() {
    local GOOS=$1
    local GOARCH=$2
    local dist_tmp_path="${DIST_ROOT_PATH}/${BIN_NAME}_${GOOS}_${GOARCH}"
    local output_bin_name

    rm -rf "${dist_tmp_path}" && mkdir -p "${dist_tmp_path}"
    step "Start building ${BIN_NAME} for ${GOOS}/${GOARCH}, version: ${VERSION}"

    if [ "$GOOS" == "windows" ]; then
        output_bin_name="${BIN_NAME}.exe"
    else
        output_bin_name="${BIN_NAME}"
    fi
    build_cmd="GOOS=${GOOS} GOARCH=${GOARCH} ${BUILD_ENVS} go build ${BUILD_FLAGS} -o ${dist_tmp_path}/${output_bin_name} ${MAIN_GO}"
    step "Running build command: ${build_cmd}"
    eval "$build_cmd"|| {
        error "Build failed for ${GOOS}/${GOARCH}"
        exit 1
    }
    if [ -n "${ADD_FILES}" ]; then
        step "Adding extra files:"
        for f in ${ADD_FILES}; do
            [ -e "$f" ] && cp -r "$f" "${dist_tmp_path}/"
        done
    fi
    local compression_name="${BIN_NAME}_${GOOS}_${GOARCH}"
    local compression_filename
    if [ "$GOOS" == "windows" ]; then
        compression_filename="${compression_name}.zip"
        (cd "${dist_tmp_path}" && zip -r "../${compression_filename}" .)
    else
        compression_filename="${compression_name}.tar.gz"
        (cd "${dist_tmp_path}" && tar -czf "../${compression_filename}" .)
    fi
    success "Packed: ${DIST_ROOT_PATH}/${compression_filename}"
}

# ===== 并行构建 =====
build_all() {
    for target in ${ARCHS}; do
        GOOS="${target%/*}"
        GOARCH="${target#*/}"
        build "$GOOS" "$GOARCH" &
    done
    wait
}
build_all

# ===== 生成统一校验文件 =====
step "Generating checksums..."
shopt -s nullglob
files=("${DIST_ROOT_PATH}"/*.{zip,tar.gz})
# 排除已有 checksum 文件
files=("${files[@]##*checksums*}")

if [ ${#files[@]} -eq 0 ]; then
    echo "⚠️ No zip or tar.gz files found in ${DIST_ROOT_PATH}, skipping checksum generation."
else
    sha256sum "${files[@]}" > "${DIST_ROOT_PATH}/${BIN_NAME}_${VERSION}_checksums.sha256"
    md5sum    "${files[@]}" > "${DIST_ROOT_PATH}/${BIN_NAME}_${VERSION}_checksums.md5"
    success "Checksums generated in ${DIST_ROOT_PATH}"
fi

# ===== 输出构建文件列表 =====
files=$(ls "${DIST_ROOT_PATH}"/*.{zip,tar.gz,md5,sha256} 2>/dev/null | tr '\n' ' ')
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "GOBUILD_FILES=${files}" >> "$GITHUB_ENV"
fi
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "files=${files}" >> "$GITHUB_OUTPUT"
fi
