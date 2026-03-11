import { execa } from 'execa';

export type PlatformAdapter = {
  shell: string;
  shellArgs: string[];
  openclawInstallCommand: string;
};

export function getPlatformAdapter(platform: NodeJS.Platform): PlatformAdapter {
  if (platform === 'win32') {
    return {
      shell: 'powershell.exe',
      shellArgs: ['-NoProfile', '-Command'],
      openclawInstallCommand: 'iwr -useb https://openclaw.ai/install.ps1 | iex',
    };
  }

  return {
    shell: 'sh',
    shellArgs: ['-lc'],
    openclawInstallCommand: 'curl -fsSL https://openclaw.ai/install.sh | bash',
  };
}

export async function runShell(cmd: string) {
  const a = getPlatformAdapter(process.platform);
  return execa(a.shell, [...a.shellArgs, cmd]);
}

export async function commandExists(cmd: string) {
  try {
    if (process.platform === 'win32') {
      await runShell(`Get-Command ${cmd} | Out-Null`);
    } else {
      await runShell(`command -v ${cmd}`);
    }
    return true;
  } catch {
    return false;
  }
}
