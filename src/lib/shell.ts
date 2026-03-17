'use client';

import { Command } from '@tauri-apps/plugin-shell';

function decodeOutput(data: string | Uint8Array): string {
  return typeof data === 'string' ? data : new TextDecoder().decode(data);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// ─── General shell execution (for system commands like uname, echo, etc.) ────

export async function runShell(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const result = await Command.create('exec-zsh', ['-lc', cmd]).execute();
  return {
    stdout: decodeOutput(result.stdout),
    stderr: decodeOutput(result.stderr),
    exitCode: result.code ?? 0,
  };
}

export async function spawnShell(
  cmd: string,
  onLog: (line: string) => void,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const command = Command.create('exec-zsh', ['-lc', cmd]);

    command.on('close', (data) => {
      resolve(data.code ?? -1);
    });
    command.on('error', (error) => {
      reject(new Error(error));
    });
    command.stdout.on('data', (line) => onLog(line));
    command.stderr.on('data', (line) => onLog(line));

    command.spawn().catch(reject);
  });
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const result = await runShell(`command -v ${cmd}`);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

// ─── OpenClaw sidecar execution ──────────────────────────────────────────────

async function getDevOpenClawBinaryPath(): Promise<string | null> {
  try {
    const result = await runShell(`
      for candidate in "src-tauri/binaries" "./binaries" "../binaries" "../src-tauri/binaries"; do
        if [ -d "$candidate" ]; then
          found="$(find "$candidate" -maxdepth 1 -type f -name 'openclaw-*' | sort | head -n 1)"
          if [ -n "$found" ]; then
            printf '%s\\n' "$found"
            exit 0
          fi
        fi
      done
      exit 1
    `);
    const binaryPath = result.stdout.trim();
    return result.exitCode === 0 && binaryPath ? binaryPath : null;
  } catch {
    return null;
  }
}

async function runOpenClawViaDevShell(args: string[]) {
  const binaryPath = await getDevOpenClawBinaryPath();
  if (!binaryPath) {
    throw new Error('Failed to locate development OpenClaw sidecar wrapper');
  }

  const cmd = [shellQuote(binaryPath), ...args.map(shellQuote)].join(' ');
  return runShell(cmd);
}

async function spawnOpenClawViaDevShell(args: string[], onLog: (line: string) => void) {
  const binaryPath = await getDevOpenClawBinaryPath();
  if (!binaryPath) {
    throw new Error('Failed to locate development OpenClaw sidecar wrapper');
  }

  const cmd = [shellQuote(binaryPath), ...args.map(shellQuote)].join(' ');
  return spawnShell(cmd, onLog);
}

/**
 * Run the bundled OpenClaw sidecar binary with given arguments and wait for completion.
 */
export async function runOpenClaw(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await Command.sidecar('binaries/openclaw', args).execute();
    return {
      stdout: decodeOutput(result.stdout),
      stderr: decodeOutput(result.stderr),
      exitCode: result.code ?? 0,
    };
  } catch {
    return runOpenClawViaDevShell(args);
  }
}

/**
 * Spawn the bundled OpenClaw sidecar with streaming output.
 */
export async function spawnOpenClaw(
  args: string[],
  onLog: (line: string) => void,
): Promise<number> {
  try {
    return await new Promise((resolve, reject) => {
      const command = Command.sidecar('binaries/openclaw', args);

      command.on('close', (data) => {
        resolve(data.code ?? -1);
      });
      command.on('error', (error) => {
        reject(new Error(error));
      });
      command.stdout.on('data', (line) => onLog(line));
      command.stderr.on('data', (line) => onLog(line));

      command.spawn().catch(reject);
    });
  } catch {
    return spawnOpenClawViaDevShell(args, onLog);
  }
}

/**
 * Check if the bundled OpenClaw sidecar is functional.
 */
export async function openclawSidecarAvailable(): Promise<boolean> {
  try {
    const result = await runOpenClaw(['--version']);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
