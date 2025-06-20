#!/bin/bash

# ===== 构建配置 =====
# 二进制文件名，默认当前目录名
BIN_NAME="${BIN_NAME:-$(basename "$(pwd)")}"
# 输出目录，默认 dist
DIST_ROOT_PATH="${DIST_ROOT_PATH:-"dist"}"
# Go 主入口文件路径，默认当前目录（适合 Go module）
MAIN_GO="${MAIN_GO:-"main.go"}"
# 版本号，默认使用环境变量 GITHUB_REF_NAME
VERSION="${VERSION:-${GITHUB_REF_NAME}}"
# 需要额外复制到输出目录的文件或目录（多个用空格隔开）
ADD_FILES="${ADD_FILES:-""}"

# ===== 彩色输出函数 =====
# 参数1：颜色代码，参数2：输出文本
color_echo() {
  local color_code=$1
  shift
  printf "\033[%sm%s\033[0m\n" "$color_code" "$*"
}
# 成功提示，绿色
success() { color_echo "1;32" "✅ $@"; }
# 错误提示，红色
error()   { color_echo "1;31" "❌ $@"; }
# 进度提示，青色
step()    { color_echo "1;36" "🚀 $@"; }

# ===== 构建函数 =====
# 参数1：GOOS，参数2：GOARCH，默认自动获取当前环境值
function build() {
    local GOOS=${1:-$(go env GOHOSTOS)}
    local GOARCH=${2:-$(go env GOHOSTARCH)}
    # 临时输出目录
    local dist_tmp_path="${DIST_ROOT_PATH}/${BIN_NAME}_${GOOS}_${GOARCH}"
    local output_bin_name

    # 清理并创建输出目录
    rm -rf "${dist_tmp_path}" && mkdir -p "${dist_tmp_path}"

    # 打印构建信息（英文）
    step "Start building ${BIN_NAME} for ${GOOS}/${GOARCH}, version: ${VERSION}"

    # 根据操作系统决定输出文件名（windows加.exe）
    if [ "$GOOS" == "windows" ]; then
        output_bin_name="${BIN_NAME}.exe"
    else
        output_bin_name="${BIN_NAME}"
    fi

    # 执行编译，注入版本信息
    GOOS=${GOOS} GOARCH=${GOARCH} go build -ldflags="-s -w -X main.version=${VERSION}" \
        -o "${dist_tmp_path}/${output_bin_name}" "${MAIN_GO}" || {
        error "Build failed for ${GOOS}/${GOARCH}"
        exit 1
    }

    # 如果有额外文件，先把换行替换为空格，再按空格拆分
    if [ ! -z "${ADD_FILES}" ]; then
        step "Adding extra files:"
        echo ${ADD_FILES}
        cp -r ${ADD_FILES} ${dist_tmp_path}/
    fi

    # 打包文件名
    local compression_name="${BIN_NAME}_${GOOS}_${GOARCH}"
    local compression_filename

    # Windows 用 zip，其他用 tar.gz
    if [ "$GOOS" == "windows" ]; then
        compression_filename="${compression_name}.zip"
        (cd "${dist_tmp_path}" && zip -r "../${compression_filename}" .)
    else
        compression_filename="${compression_name}.tar.gz"
        (cd "${dist_tmp_path}" && tar -czf "../${compression_filename}" .)
    fi    

    success "Packed: ${DIST_ROOT_PATH}/${compression_filename}"

    # 生成 sha256 和 md5 校验文件
    local sha256_checksums_file="${BIN_NAME}_${VERSION}_checksums.sha256"
    local md5_checksums_file="${BIN_NAME}_${VERSION}_checksums.md5"

    (cd "${DIST_ROOT_PATH}" && sha256sum "${compression_filename}" >> "${sha256_checksums_file}")
    (cd "${DIST_ROOT_PATH}" && md5sum    "${compression_filename}" >> "${md5_checksums_file}")

    success "Checksums updated for version ${VERSION}"
}

# ===== 调用构建 =====
build windows amd64
build windows arm64
build linux amd64
build linux arm64
build darwin amd64
build darwin arm64

# ===== 输出构建文件列表（写入 GITHUB_OUTPUT）=====
# 获取完整路径（带 dist/ 前缀），多个文件以空格分隔
# shellcheck disable=SC2012
files=$(ls "${DIST_ROOT_PATH}"/*.{zip,tar.gz,md5,sha256} 2>/dev/null | tr '\n' ' ')
# 写入 GITHUB_ENV 变量
if [ -n "$GITHUB_ENV" ]; then
  echo "GOBUILD_FILES=${files}" >> "$GITHUB_ENV"
fi
