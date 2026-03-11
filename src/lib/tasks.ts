import { randomUUID } from 'node:crypto';
import { runShell } from './shell';

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed';

export type Task = {
  id: string;
  type: string;
  status: TaskStatus;
  logs: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

const tasks = new Map<string, Task>();

export function getTasks() {
  return tasks;
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function createTask(type: string): Task {
  const now = new Date().toISOString();
  const task: Task = { id: randomUUID(), type, status: 'pending', logs: [], createdAt: now, updatedAt: now };
  tasks.set(task.id, task);
  return task;
}

export function logTask(task: Task, line: string) {
  task.logs.push(line);
  task.updatedAt = new Date().toISOString();
}

export async function executeTask(task: Task, command: string) {
  task.status = 'running';
  logTask(task, `Running: ${command}`);
  try {
    const r = await runShell(command);
    if (r.stdout) logTask(task, r.stdout);
    if (r.stderr) logTask(task, r.stderr);
    task.status = 'success';
  } catch (err: any) {
    task.status = 'failed';
    task.error = err?.shortMessage || err?.message || 'Unknown error';
    if (err?.stdout) logTask(task, err.stdout);
    if (err?.stderr) logTask(task, err.stderr);
    logTask(task, `Error: ${task.error}`);
  }
}
