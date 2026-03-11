import { getTask } from '@/lib/tasks';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) {
    return new Response(JSON.stringify({ error: 'task_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let cursor = 0;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        if (closed) return;
        const current = getTask(id);
        if (!current) return;

        while (cursor < current.logs.length) {
          const line = current.logs[cursor++];
          controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify({ line })}\n\n`));
        }

        controller.enqueue(
          encoder.encode(`event: status\ndata: ${JSON.stringify({ status: current.status, error: current.error ?? null })}\n\n`)
        );

        if (current.status === 'success' || current.status === 'failed') {
          clearInterval(timer);
          controller.close();
          closed = true;
        }
      };

      const timer = setInterval(send, 1000);
      send();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
