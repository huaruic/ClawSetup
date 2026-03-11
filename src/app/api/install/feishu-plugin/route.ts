import { NextResponse } from 'next/server';
import { createTask, logTask } from '@/lib/tasks';
import { runShell } from '@/lib/shell';

export async function POST() {
  const task = createTask('install_feishu_plugin');

  // Feishu is a built-in stock plugin in OpenClaw.
  // Just verify it's present and enable it if needed.
  try {
    const r = await runShell('openclaw plugins list');
    if (r.stdout && r.stdout.includes('feishu')) {
      // Check if it's loaded or just enable it
      await runShell('openclaw plugins enable feishu').catch(() => {});
      task.status = 'success';
      logTask(task, 'Feishu plugin is available and enabled.');
      return NextResponse.json({ taskId: task.id, status: task.status });
    }
  } catch {
    // plugins list failed
  }

  // Fallback: try installing from npm
  task.status = 'running';
  logTask(task, 'Feishu plugin not found in stock plugins, installing...');

  void (async () => {
    try {
      const r = await runShell('openclaw plugins install @openclaw/feishu');
      if (r.stdout) logTask(task, r.stdout);
      task.status = 'success';
      logTask(task, 'Feishu plugin installed.');
    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.shortMessage || err?.message || 'Install failed';
      if (err?.stderr) logTask(task, err.stderr);
      logTask(task, `Error: ${task.error}`);
    }
    task.updatedAt = new Date().toISOString();
  })();

  return NextResponse.json({ taskId: task.id, status: task.status });
}
