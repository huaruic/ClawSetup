import { NextResponse } from 'next/server';
import { getTask } from '@/lib/tasks';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
  return NextResponse.json({ id: task.id, status: task.status, logs: task.logs, error: task.error });
}
