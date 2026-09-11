const POST_PREFIX = 'post:';
const LAST_PUBLISHED_KEY = 'state:last-published-at';
const APPROVAL_COMMAND = 'утверждаю, публикуй';

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch (error) {
      console.error('Threads bot request failed', error);
      return json(
        { ok: false, error: error.message || 'Internal error' },
        error.status || 500
      );
    }
  },

  async scheduled(_event, env, ctx) {
    if (env.AUTO_PUBLISH !== 'true') return;
    ctx.waitUntil(publishNextApproved(env));
  },
};

export async function route(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/') {
    return json({
      ok: true,
      service: 'IZOBILION Threads Bot',
      dryRun: env.DRY_RUN !== 'false',
      autoPublish: env.AUTO_PUBLISH === 'true',
    });
  }

  if (!authorized(request, env)) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  if (request.method === 'GET' && url.pathname === '/posts') {
    return json({ ok: true, posts: await listPosts(env) });
  }

  if (request.method === 'POST' && url.pathname === '/posts') {
    const body = await readJson(request);
    const text = String(body.text || '').trim();
    if (!text) return json({ ok: false, error: 'text is required' }, 400);
    if ([...text].length > 500) {
      return json({ ok: false, error: 'Threads text must be at most 500 characters' }, 400);
    }

    const now = new Date().toISOString();
    const post = {
      id: crypto.randomUUID(),
      text,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await savePost(env, post);
    return json({ ok: true, post }, 201);
  }

  const approveMatch = url.pathname.match(/^\/posts\/([^/]+)\/approve$/);
  if (request.method === 'POST' && approveMatch) {
    const post = await getPost(env, approveMatch[1]);
    if (!post) return json({ ok: false, error: 'Post not found' }, 404);
    if (post.status !== 'draft') {
      return json({ ok: false, error: 'Only a draft can be approved' }, 409);
    }

    const body = await readJson(request);
    if (normalizeApproval(body.command) !== APPROVAL_COMMAND) {
      return json({
        ok: false,
        error: `Approval requires the exact command: ${APPROVAL_COMMAND}`,
      }, 400);
    }

    post.status = 'approved';
    post.approvedAt = new Date().toISOString();
    post.updatedAt = post.approvedAt;
    await savePost(env, post);
    return json({ ok: true, post });
  }

  const publishMatch = url.pathname.match(/^\/posts\/([^/]+)\/publish$/);
  if (request.method === 'POST' && publishMatch) {
    const post = await getPost(env, publishMatch[1]);
    if (!post) return json({ ok: false, error: 'Post not found' }, 404);
    const result = await publishPost(env, post);
    return json({ ok: true, ...result }, result.dryRun ? 200 : 201);
  }

  return json({ ok: false, error: 'Not found' }, 404);
}

export async function publishNextApproved(env) {
  const posts = await listPosts(env);
  const post = posts.find((item) => item.status === 'approved');
  if (!post) return { skipped: true, reason: 'No approved posts' };
  return publishPost(env, post);
}

export async function publishPost(env, post) {
  if (post.status !== 'approved') {
    throw new Error('Only an approved post can be published');
  }

  const interval = Math.max(1, Number(env.MIN_POST_INTERVAL_MINUTES || 60));
  const lastPublishedAt = await env.THREADS_QUEUE.get(LAST_PUBLISHED_KEY);
  if (lastPublishedAt) {
    const nextAllowed = Date.parse(lastPublishedAt) + interval * 60_000;
    if (Date.now() < nextAllowed) {
      const error = new Error(`Minimum ${interval}-minute interval has not elapsed`);
      error.status = 409;
      throw error;
    }
  }

  if (env.DRY_RUN !== 'false') {
    return { dryRun: true, post };
  }

  requireLiveConfig(env);
  const api = env.__FETCH__ || fetch;
  const baseUrl = (env.THREADS_API_BASE_URL || 'https://graph.threads.net/v1.0').replace(/\/$/, '');
  const token = env.THREADS_ACCESS_TOKEN;

  post.status = 'publishing';
  post.updatedAt = new Date().toISOString();
  await savePost(env, post);

  let container;
  let published;
  try {
    const createResponse = await api(`${baseUrl}/${env.THREADS_USER_ID}/threads`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        media_type: 'TEXT',
        text: post.text,
        access_token: token,
      }),
    });
    container = await apiJson(createResponse, 'Create Threads container');

    const publishResponse = await api(`${baseUrl}/${env.THREADS_USER_ID}/threads_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: container.id,
        access_token: token,
      }),
    });
    published = await apiJson(publishResponse, 'Publish Threads post');
  } catch (error) {
    post.status = 'error';
    post.publishError = error.message;
    post.updatedAt = new Date().toISOString();
    await savePost(env, post);
    throw error;
  }

  const publishedAt = new Date().toISOString();
  post.status = 'published';
  post.containerId = container.id;
  post.threadsPostId = published.id;
  post.publishedAt = publishedAt;
  post.updatedAt = publishedAt;
  await Promise.all([
    savePost(env, post),
    env.THREADS_QUEUE.put(LAST_PUBLISHED_KEY, publishedAt),
  ]);
  await sendTelegramReport(env, post, api);
  return { dryRun: false, post };
}

async function listPosts(env) {
  const page = await env.THREADS_QUEUE.list({ prefix: POST_PREFIX });
  const posts = (await Promise.all(
    page.keys.map((key) => env.THREADS_QUEUE.get(key.name, 'json'))
  )).filter(Boolean);
  return posts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function getPost(env, id) {
  return env.THREADS_QUEUE.get(`${POST_PREFIX}${id}`, 'json');
}

async function savePost(env, post) {
  await env.THREADS_QUEUE.put(`${POST_PREFIX}${post.id}`, JSON.stringify(post));
}

async function sendTelegramReport(env, post, api) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_REPORT_CHAT_ID) return;
  const response = await api(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_REPORT_CHAT_ID,
        text: `Опубликовано в Threads ✓\n\n${post.text}\n\nID: ${post.threadsPostId}`,
      }),
    }
  );
  if (!response.ok) console.error('Telegram report failed', response.status);
}

function authorized(request, env) {
  if (!env.ADMIN_API_KEY) return false;
  return request.headers.get('authorization') === `Bearer ${env.ADMIN_API_KEY}`;
}

function requireLiveConfig(env) {
  for (const key of ['THREADS_USER_ID', 'THREADS_ACCESS_TOKEN']) {
    if (!env[key]) throw new Error(`${key} is required for live publishing`);
  }
}

function normalizeApproval(value) {
  return String(value || '').trim().toLocaleLowerCase('ru-RU');
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function apiJson(response, action) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    const message = data.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${action} failed: ${message}`);
  }
  return data;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
