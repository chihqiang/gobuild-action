export enum GOOS {
  Aix = 'aix',
  Android = 'android',
  Darwin = 'darwin',
  Dragonfly = 'dragonfly',
  FreeBSD = 'freebsd',
  Illumos = 'illumos',
  IOS = 'ios',
  Js = 'js',
  Linux = 'linux',
  NetBSD = 'netbsd',
  OpenBSD = 'openbsd',
  Plan9 = 'plan9',
  Solaris = 'solaris',
  Wasip1 = 'wasip1',
  Windows = 'windows',
}

export enum GOARCH {
  X86 = '386',
  Amd64 = 'amd64',
  Arm = 'arm',
  Arm64 = 'arm64',
  Loong64 = 'loong64',
  Mips = 'mips',
  Mips64 = 'mips64',
  Mips64Le = 'mips64le',
  MipsLe = 'mipsle',
  Ppc64 = 'ppc64',
  Ppc64le = 'ppc64le',
  Riscv64 = 'riscv64',
  S390x = 's390x',
  Wasm = 'wasm',
}

export enum CompressionFormat {
  Zip = 'zip',
  TarGz = 'tar.gz',
}

export function isGOOS(value: string): value is GOOS {
  return Object.values(GOOS).includes(value as GOOS);
}

export function isGOARCH(value: string): value is GOARCH {
  return Object.values(GOARCH).includes(value as GOARCH);
}
