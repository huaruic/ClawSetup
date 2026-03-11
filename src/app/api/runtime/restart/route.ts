import { NextResponse } from 'next/server';
import { runShell } from '@/lib/shell';
import { createTask, logTask } from '@/lib/tasks';

export async function POST() {
  const task = createTask('runtime_restart');
  task.status = 'running';
  logTask(task, 'Ensuring gateway is running...');

  void (async () => {
    try {
      // Always attempt restart to pick up latest config
      await runShell('openclaw gateway restart');
      logTask(task, 'Gateway restarted successfully.');

      // Wait briefly and verify it's actually running
      await new Promise((r) => setTimeout(r, 2000));
      const status = await runShell('openclaw gateway status');
      const output = status.stdout || '';
      if (output.includes('RPC probe: ok') || output.includes('Listening:')) {
        task.status = 'success';
        logTask(task, 'Gateway is running and healthy.');
      } else if (output.includes('Runtime: stopped')) {
        throw new Error('Gateway stopped after restart');
      } else {
        task.status = 'success';
        logTask(task, 'Gateway restart completed.');
      }
    } catch (restartErr: any) {
      logTask(task, `Restart attempt: ${restartErr?.shortMessage || restartErr?.message || 'unknown'}`);
      logTask(task, 'Trying to reinstall gateway service...');
      try {
        // Unload first to clean up stale LaunchAgent state
        await runShell('openclaw gateway uninstall').catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
        await runShell('openclaw gateway install');
        logTask(task, 'Gateway service reinstalled.');

        // Verify after install
        await new Promise((r) => setTimeout(r, 3000));
        const status = await runShell('openclaw gateway status');
        const output = status.stdout || '';
        if (output.includes('RPC probe: ok') || output.includes('Listening:')) {
          task.status = 'success';
          logTask(task, 'Gateway is running and healthy.');
        } else {
          task.status = 'success';
          logTask(task, 'Gateway service installed. It may take a moment to start.');
        }
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
