export enum GOOS {
  Windows = 'windows',
  Linux = 'linux',
  Darwin = 'darwin',
  FreeBSD = 'freebsd',
  OpenBSD = 'openbsd',
}

export enum GOARCH {
  Amd64 = 'amd64',
  Arm64 = 'arm64',
  Arm = 'arm',
  X86 = '386',
  Ppc64le = 'ppc64le',
  S390x = 's390x',
  Riscv64 = 'riscv64',
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
