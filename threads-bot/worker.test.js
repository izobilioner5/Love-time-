import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { publishNextApproved } from './worker.js';

class MemoryKV {
  constructor() { this.data = new Map(); }
  async get(key, type) {
    const value = this.data.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value) { this.data.set(key, String(value)); }
  async list({ prefix = '' } = {}) {
    return {
      keys: [...this.data.keys()].filter((key) => key.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    };
  }
}

function environment(extra = {}) {
  return {
    THREADS_QUEUE: new MemoryKV(),
    ADMIN_API_KEY: 'test-admin-key',
    DRY_RUN: 'true',
    AUTO_PUBLISH: 'false',
    MIN_POST_INTERVAL_MINUTES: '60',
    ...extra,
  };
}

function request(path, method = 'GET', body, authorized = true) {
  const headers = {};
  if (authorized) headers.authorization = 'Bearer test-admin-key';
  if (body) headers['content-type'] = 'application/json';
  return new Request(`https://bot.test${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function responseJson(response) {
  return { status: response.status, body: await response.json() };
}

async function createDraft(env, text = 'Тестовый пост') {
  const result = await responseJson(await worker.fetch(request('/posts', 'POST', { text }), env));
  return result.body.post;
}

async function approve(env, id, command = 'утверждаю, публикуй') {
  return responseJson(await worker.fetch(request(`/posts/${id}/approve`, 'POST', { command }), env));
}

test('private endpoints reject requests without the admin key', async () => {
  const env = environment();
  const response = await worker.fetch(request('/posts', 'GET', null, false), env);
  assert.equal(response.status, 401);
});

test('a post stays draft until the exact approval command is supplied', async () => {
  const env = environment();
  const draft = await createDraft(env);
  assert.equal(draft.status, 'draft');
  const rejected = await approve(env, draft.id, 'публикуй');
  assert.equal(rejected.status, 400);
  const accepted = await approve(env, draft.id, 'УТВЕРЖДАЮ, ПУБЛИКУЙ');
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.post.status, 'approved');
});

test('dry-run never calls Threads and never marks the post published', async () => {
  let calls = 0;
  const env = environment({ __FETCH__: async () => { calls += 1; } });
  const draft = await createDraft(env);
  await approve(env, draft.id);
  const result = await responseJson(await worker.fetch(request(`/posts/${draft.id}/publish`, 'POST'), env));
  assert.equal(result.body.dryRun, true);
  assert.equal(result.body.post.status, 'approved');
  assert.equal(calls, 0);
});

test('live mode creates and publishes a Threads container', async () => {
  const calls = [];
  const env = environment({
    DRY_RUN: 'false',
    THREADS_USER_ID: 'user-1',
    THREADS_ACCESS_TOKEN: 'secret-token',
    __FETCH__: async (url, options) => {
      calls.push({ url, options });
      const id = url.endsWith('/threads_publish') ? 'thread-1' : 'container-1';
      return new Response(JSON.stringify({ id }), { status: 200 });
    },
  });
  const draft = await createDraft(env);
  await approve(env, draft.id);
  const result = await responseJson(await worker.fetch(request(`/posts/${draft.id}/publish`, 'POST'), env));
  assert.equal(result.status, 201);
  assert.equal(result.body.post.status, 'published');
  assert.equal(result.body.post.threadsPostId, 'thread-1');
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /user-1\/threads$/);
  assert.match(calls[1].url, /user-1\/threads_publish$/);
});

test('scheduler selects only an approved post', async () => {
  const env = environment();
  await createDraft(env, 'Черновик');
  const approved = await createDraft(env, 'Утверждённый пост');
  await approve(env, approved.id);
  const result = await publishNextApproved(env);
  assert.equal(result.dryRun, true);
  assert.equal(result.post.id, approved.id);
});

test('an ambiguous Threads failure is not automatically retried', async () => {
  let calls = 0;
  const env = environment({
    DRY_RUN: 'false',
    THREADS_USER_ID: 'user-1',
    THREADS_ACCESS_TOKEN: 'secret-token',
    __FETCH__: async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { message: 'Temporary failure' } }), {
        status: 503,
      });
    },
  });
  const draft = await createDraft(env);
  await approve(env, draft.id);

  const failed = await worker.fetch(request(`/posts/${draft.id}/publish`, 'POST'), env);
  assert.equal(failed.status, 500);

  const secondAttempt = await worker.fetch(request(`/posts/${draft.id}/publish`, 'POST'), env);
  assert.equal(secondAttempt.status, 500);
  assert.equal(calls, 1);
});

test('the minimum publication interval is enforced', async () => {
  const env = environment();
  const draft = await createDraft(env);
  await approve(env, draft.id);
  await env.THREADS_QUEUE.put('state:last-published-at', new Date().toISOString());
  const result = await responseJson(await worker.fetch(request(`/posts/${draft.id}/publish`, 'POST'), env));
  assert.equal(result.status, 409);
  assert.match(result.body.error, /60-minute interval/);
});
