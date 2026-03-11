import { NextResponse } from 'next/server';
import { createTask, executeTask } from '@/lib/tasks';

const FEISHU_PLUGIN_CMD =
  'npx -y https://sf3-cn.feishucdn.com/obj/open-platform-opendoc/195a94cb3d9a45d862d417313ff62c9c_gfW8JbxtTd.tgz install';

export async function POST() {
  const task = createTask('install_feishu_plugin');
  void executeTask(task, FEISHU_PLUGIN_CMD);
  return NextResponse.json({ taskId: task.id, status: task.status });
}
