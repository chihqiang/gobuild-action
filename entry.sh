#!/bin/bash
set -euo pipefail

# ===== 构建配置 =====
BIN_NAME="${BIN_NAME:-$(basename "$(pwd)")}"
DIST_ROOT_PATH="${DIST_ROOT_PATH:-dist}"
MAIN_GO="${MAIN_GO:-main.go}"
VERSION="${VERSION:-${GITHUB_REF_NAME:-main}}"
ADD_FILES="${ADD_FILES:-}"
BUILD_ENVS="${BUILD_ENVS:-CGO_ENABLED=0}"
BUILD_FLAGS="${BUILD_FLAGS:--ldflags '-s -w -X main.version=${VERSION}'}"

# ===== 默认构建目标 =====
ARCHS="${ARCHS:-windows/amd64 windows/arm64 linux/amd64 linux/arm64 darwin/amd64 darwin/arm64}"

# ===== 彩色输出函数 =====
color_echo() { local color_code=$1; shift; printf "\033[%sm%s\033[0m\n" "$color_code" "$*"; }
success() { color_echo "1;32" "✅ $*"; }
error()   { color_echo "1;31" "❌ $*"; }
step()    { color_echo "1;36" "🚀 $*"; }

# ===== 构建函数 =====
build() {
    local GOOS=$1 GOARCH=$2
    local dist_tmp_path="${DIST_ROOT_PATH}/${BIN_NAME}_${GOOS}_${GOARCH}"
    local output_bin_name=$BIN_NAME
    [[ $GOOS == windows ]] && output_bin_name+=.exe

    rm -rf "$dist_tmp_path" && mkdir -p "$dist_tmp_path"

    step "Start building ${BIN_NAME} for ${GOOS}/${GOARCH}, version: ${VERSION}"

    # 安全解析 BUILD_FLAGS（eval 仅用于正确拆分引号内参数）
    local -a build_flags=()
    eval "build_flags=($BUILD_FLAGS)"

    # 构建 env 命令（避免整体 eval）
    local -a env_cmd=(env GOOS="$GOOS" GOARCH="$GOARCH")
    local -a env_assignments=()
    read -ra env_assignments <<< "$BUILD_ENVS"
    env_cmd+=("${env_assignments[@]}" go build "${build_flags[@]}" -o "$dist_tmp_path/$output_bin_name" "$MAIN_GO")

    step "Running: ${env_cmd[*]}"
    "${env_cmd[@]}" || {
        error "Build failed for ${GOOS}/${GOARCH}"
        return 1
    }

    if [[ -n $ADD_FILES ]]; then
        step "Adding extra files:"
        for f in $ADD_FILES; do
            [[ -e $f ]] && cp -r "$f" "$dist_tmp_path/"
        done
    fi

    local compression_name="${BIN_NAME}_${GOOS}_${GOARCH}"
    if [[ $GOOS == windows ]]; then
        local compression_filename="${compression_name}.zip"
        (cd "$dist_tmp_path" && zip -r "../${compression_filename}" .)
    else
        local compression_filename="${compression_name}.tar.gz"
        (cd "$dist_tmp_path" && tar -czf "../${compression_filename}" .)
    fi
    success "Packed: ${DIST_ROOT_PATH}/${compression_filename}"
}

# ===== 并行构建 =====
build_all() {
    local -a pids=()
    local ret=0
    for target in $ARCHS; do
        GOOS="${target%/*}"
        GOARCH="${target#*/}"
        build "$GOOS" "$GOARCH" &
        pids+=($!)
    done
    for pid in "${pids[@]}"; do
        wait "$pid" || ret=$?
    done
    return $ret
}

step "Go version:"
go version

if ! build_all; then
    error "One or more builds failed, aborting"
    exit 1
fi

# ===== 生成统一校验文件 =====
step "Generating checksums..."
shopt -s nullglob
all_files=("$DIST_ROOT_PATH"/*.{zip,tar.gz})
shopt -u nullglob

# 过滤掉已有校验文件（原 ${files[@]##*checksums*} 写法会产生空元素，改为显式循环）
files=()
for f in "${all_files[@]}"; do
    [[ $f != *checksums* ]] && files+=("$f")
done

if [[ ${#files[@]} -eq 0 ]]; then
    echo "⚠️ No zip or tar.gz files found in ${DIST_ROOT_PATH}, skipping checksum generation."
else
    if command -v sha256sum &>/dev/null; then
        sha256sum "${files[@]}" > "${DIST_ROOT_PATH}/${BIN_NAME}_${VERSION}_checksums.sha256"
    elif command -v shasum &>/dev/null; then
        shasum -a 256 "${files[@]}" > "${DIST_ROOT_PATH}/${BIN_NAME}_${VERSION}_checksums.sha256"
    else
        echo "⚠️ sha256sum/shasum not found, skipping SHA256 checksum."
    fi

    if command -v md5sum &>/dev/null; then
        md5sum "${files[@]}" > "${DIST_ROOT_PATH}/${BIN_NAME}_${VERSION}_checksums.md5"
    elif command -v md5 &>/dev/null; then
        md5 -r "${files[@]}" > "${DIST_ROOT_PATH}/${BIN_NAME}_${VERSION}_checksums.md5"
    else
        echo "⚠️ md5sum/md5 not found, skipping MD5 checksum."
    fi
    success "Checksums generated in ${DIST_ROOT_PATH}"
fi

step "Build outputs:"
dist_abs_path=$(cd "$DIST_ROOT_PATH" && pwd -P)
find "$dist_abs_path" -maxdepth 1 -type f -exec ls -lh {} \;

# ===== 输出构建文件列表 =====
shopt -s nullglob
output_files=("$DIST_ROOT_PATH"/*.{zip,tar.gz,md5,sha256})
shopt -u nullglob
files_str=""
for f in "${output_files[@]}"; do
    [[ -f $f ]] && files_str+="$f "
done
files_str=${files_str% }

if [[ -n ${GITHUB_ENV:-} ]]; then
    echo "GOBUILD_FILES=${files_str}" >> "$GITHUB_ENV"
fi
if [[ -n ${GITHUB_OUTPUT:-} ]]; then
    echo "gobuild_files=${files_str}" >> "$GITHUB_OUTPUT"
fi
