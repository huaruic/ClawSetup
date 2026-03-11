import { NextResponse } from 'next/server';
import { runShell } from '@/lib/shell';
import { createTask, logTask } from '@/lib/tasks';

export async function POST() {
  // Check if the gateway is already running
  let alreadyRunning = false;
  try {
    const statusResult = await runShell('openclaw gateway status');
    const output = statusResult.stdout || '';
    if (output.includes('RPC probe: ok') || output.includes('Listening:')) {
      alreadyRunning = true;
    }
  } catch {
    // status command failed, gateway is not running
  }

  if (alreadyRunning) {
    const task = createTask('runtime_restart');
    task.status = 'success';
    logTask(task, 'Gateway is already running, skipping restart.');
    return NextResponse.json({ taskId: task.id, status: task.status });
  }

  const task = createTask('runtime_restart');
  task.status = 'running';
  logTask(task, 'Attempting gateway restart...');

  void (async () => {
    try {
      await runShell('openclaw gateway restart');
      logTask(task, 'Gateway restarted successfully.');
      task.status = 'success';
    } catch (restartErr: any) {
      logTask(task, `Restart failed: ${restartErr?.shortMessage || restartErr?.message || 'unknown'}`);
      logTask(task, 'Trying to install and start gateway service...');
      try {
        await runShell('openclaw gateway install');
        logTask(task, 'Gateway service installed and started.');
        task.status = 'success';
      } catch (installErr: any) {
        logTask(task, `Install failed: ${installErr?.shortMessage || installErr?.message || 'unknown'}`);
        task.status = 'failed';
        task.error = 'Could not restart or install gateway service.';
      }
    }
    task.updatedAt = new Date().toISOString();
  })();

  return NextResponse.json({ taskId: task.id, status: task.status });
}
