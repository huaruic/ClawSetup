import { NextResponse } from 'next/server';
import { createTask, executeTask } from '@/lib/tasks';
import { getPlatformAdapter } from '@/lib/shell';

export async function POST() {
  const task = createTask('install_openclaw');
  const cmd = getPlatformAdapter(process.platform).openclawInstallCommand;
  void executeTask(task, cmd);
  return NextResponse.json({ taskId: task.id, status: task.status });
}
