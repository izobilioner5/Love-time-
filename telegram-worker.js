const PROFILE_PREFIX = 'profile:';
const STATE_PREFIX = 'state:';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'IZOBILION Need/Give MVP' });
    }
    if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') {
      return new Response('Not found', { status: 404 });
    }

    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const update = await request.json();
    await handleUpdate(update, env);
    return json({ ok: true });
  },
};

async function handleUpdate(update, env) {
  const message = update.message;
  if (!message?.chat?.id) return;

  const chatId = String(message.chat.id);
  const text = (message.text || message.caption || '').trim();
  const user = message.from || {};

  if (!text) {
    await sendMessage(env, chatId, 'Пока MVP понимает текст. Пришли ответ обычным сообщением.');
    return;
  }

  if (text.startsWith('/start')) {
    await env.SUBSCRIBERS.put(STATE_PREFIX + chatId, JSON.stringify({ step: 'need', draft: {} }));
    await sendMessage(env, chatId,
      'IZOBILION соединяет то, что тебе нужно, с тем, что уже есть у других.\n\nШаг 1/3. Что тебе сейчас нужно?\n\nНапиши до 3 конкретных запросов. Например:\n• React Native разработчик\n• первые 10 клиентов\n• контакт инвестора');
    return;
  }

  if (text === '/reset') {
    await env.SUBSCRIBERS.delete(STATE_PREFIX + chatId);
    await env.SUBSCRIBERS.delete(PROFILE_PREFIX + chatId);
    await sendMessage(env, chatId, 'Профиль удалён. Чтобы начать заново: /start');
    return;
  }

  if (text === '/profile') {
    const profile = await env.SUBSCRIBERS.get(PROFILE_PREFIX + chatId, 'json');
    if (!profile) {
      await sendMessage(env, chatId, 'Профиля ещё нет. Начни: /start');
      return;
    }
    await sendMessage(env, chatId, formatProfile(profile));
    return;
  }

  if (text === '/match') {
    const profile = await env.SUBSCRIBERS.get(PROFILE_PREFIX + chatId, 'json');
    if (!profile) {
      await sendMessage(env, chatId, 'Сначала создай профиль: /start');
      return;
    }
    await sendMatches(env, chatId, profile);
    return;
  }

  const state = await env.SUBSCRIBERS.get(STATE_PREFIX + chatId, 'json');
  if (!state) {
    await sendMessage(env, chatId, 'Начни с /start — это займёт меньше минуты.');
    return;
  }

  if (state.step === 'need') {
    state.draft.need = text;
    state.step = 'give';
    await env.SUBSCRIBERS.put(STATE_PREFIX + chatId, JSON.stringify(state));
    await sendMessage(env, chatId,
      'Шаг 2/3. Что ты можешь дать другим прямо сейчас?\n\nДо 3 вещей: навык, контакт, ресурс, помощь, услуга, доступ, время.');
    return;
  }

  if (state.step === 'give') {
    state.draft.give = text;
    state.step = 'city';
    await env.SUBSCRIBERS.put(STATE_PREFIX + chatId, JSON.stringify(state));
    await sendMessage(env, chatId,
      'Шаг 3/3. Где ты находишься?\n\nНапиши город или «онлайн», если география не важна.');
    return;
  }

  if (state.step === 'city') {
    const profile = {
      chatId,
      firstName: user.first_name || '',
      username: user.username || '',
      need: state.draft.need || '',
      give: state.draft.give || '',
      city: text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await env.SUBSCRIBERS.put(PROFILE_PREFIX + chatId, JSON.stringify(profile));
    await env.SUBSCRIBERS.delete(STATE_PREFIX + chatId);

    await sendMessage(env, chatId,
      'Готово. Твой профиль добавлен в сеть IZOBILION.\n\n' +
      formatProfile(profile) +
      '\n\nТеперь ищу людей, у которых может быть то, что тебе нужно. Профиль виден только в релевантных совпадениях.');

    await sendMatches(env, chatId, profile);
  }
}

async function sendMatches(env, chatId, profile) {
  const matches = await findMatches(env, profile, 3);
  if (!matches.length) {
    await sendMessage(env, chatId,
      'Пока точных совпадений нет. Это нормально для маленькой сети.\n\nКогда появятся новые участники, попробуй /match ещё раз.');
    return;
  }

  let out = 'Нашёл возможные совпадения:\n';
  matches.forEach((m, i) => {
    const contact = m.profile.username ? `@${m.profile.username}` : m.profile.firstName || 'Участник IZOBILION';
    out += `\n${i + 1}. ${contact} · ${m.profile.city}\n`;
    out += `Может дать: ${m.profile.give}\n`;
    out += `Ему/ей нужно: ${m.profile.need}\n`;
    out += `Совпадение: ${m.score}%\n`;
  });
  out += '\nЕсли совпадение реально полезно — напиши человеку и проверь это в жизни.';
  await sendMessage(env, chatId, out);
}

async function findMatches(env, me, limit) {
  const candidates = [];
  let cursor;

  do {
    const page = await env.SUBSCRIBERS.list({ prefix: PROFILE_PREFIX, cursor, limit: 1000 });
    for (const key of page.keys) {
      if (key.name === PROFILE_PREFIX + me.chatId) continue;
      const other = await env.SUBSCRIBERS.get(key.name, 'json');
      if (!other) continue;

      const needToGive = similarity(me.need, other.give);
      const giveToNeed = similarity(me.give, other.need);
      const cityBonus = samePlace(me.city, other.city) ? 0.12 : 0;
      const raw = Math.min(1, needToGive * 0.7 + giveToNeed * 0.3 + cityBonus);
      if (raw >= 0.08) candidates.push({ profile: other, score: Math.round(raw * 100) });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
}

function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let overlap = 0;
  for (const token of A) if (B.has(token)) overlap += 1;
  return overlap / Math.max(2, Math.min(A.size, B.size));
}

function tokens(value) {
  const stop = new Set(['мне','нужен','нужна','нужно','ищу','хочу','могу','дать','помочь','для','или','это','есть','сейчас','как','что','и','в','на','с','по','из','к','а','the','and','for','with']);
  return new Set(String(value || '')
    .toLowerCase()
    .replace(/[^a-zа-яё0-9+#.\- ]/gi, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3 && !stop.has(x)));
}

function samePlace(a, b) {
  const A = String(a || '').toLowerCase().trim();
  const B = String(b || '').toLowerCase().trim();
  if (!A || !B || A === 'онлайн' || B === 'онлайн') return false;
  return A === B || A.includes(B) || B.includes(A);
}

function formatProfile(p) {
  return `НУЖНО:\n${p.need}\n\nМОГУ ДАТЬ:\n${p.give}\n\nГДЕ:\n${p.city}`;
}

async function sendMessage(env, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) throw new Error(`Telegram sendMessage failed: ${response.status}`);
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
