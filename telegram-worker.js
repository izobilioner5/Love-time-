const TASKS = [
  'Напиши близкому человеку: «Я ценю тебя и рад, что ты есть в моей жизни».',
  'Позвони близкому человеку без повода и спроси, как он себя чувствует.',
  'Скажи человеку прямо, за что ты ему благодарен.',
  'Сделай маленький приятный сюрприз без ожидания ответа.',
  'Отправь вашу общую фотографию и напиши, почему этот момент тебе дорог.',
  'Удели человеку 10 минут полного внимания — без телефона и других дел.',
];

const DEFAULT_TIME = '12:00';
const DEFAULT_TIMEZONE = 'Asia/Tbilisi';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return json({ ok: true, service: 'Love Time Telegram bot' });
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

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDueReminders(env));
  },
};

async function handleUpdate(update, env) {
  const callback = update.callback_query;
  if (callback?.data === 'love_task' && callback.message?.chat?.id) {
    const chatId = String(callback.message.chat.id);
    await sendMessage(env, chatId, randomTask(), taskKeyboard());
    await answerCallback(env, callback.id);
    return;
  }

  const message = update.message;
  if (!message?.chat?.id) return;

  const chatId = String(message.chat.id);
  const text = (message.text || '').trim();

  if (text.startsWith('/start')) {
    const subscriber = {
      chatId,
      firstName: message.from?.first_name || '',
      time: DEFAULT_TIME,
      timezone: DEFAULT_TIMEZONE,
      lastSentDate: '',
    };
    await env.SUBSCRIBERS.put(chatId, JSON.stringify(subscriber));
    await sendMessage(
      env,
      chatId,
      'Love Time подключён ♥\n\nКаждый день в 12:00 я напомню тебе выбрать человека и проявить любовь.\n\nИзменить время: /time 18:30\nОтключить: /stop',
      taskKeyboard()
    );
    return;
  }

  if (text === '/stop') {
    await env.SUBSCRIBERS.delete(chatId);
    await sendMessage(env, chatId, 'Напоминания Love Time выключены. Вернуться: /start');
    return;
  }

  if (text === '/task') {
    await sendMessage(env, chatId, randomTask(), taskKeyboard());
    return;
  }

  if (text.startsWith('/time')) {
    const match = text.match(/^\/time\s+([01]\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      await sendMessage(env, chatId, 'Напиши время так: /time 18:30');
      return;
    }
    const saved = await env.SUBSCRIBERS.get(chatId, 'json');
    if (!saved) {
      await sendMessage(env, chatId, 'Сначала подключи напоминания: /start');
      return;
    }
    saved.time = `${match[1]}:${match[2]}`;
    await env.SUBSCRIBERS.put(chatId, JSON.stringify(saved));
    await sendMessage(env, chatId, `Готово. Буду напоминать каждый день в ${saved.time}.`);
  }
}

async function sendDueReminders(env) {
  let cursor;
  do {
    const page = await env.SUBSCRIBERS.list({ cursor });
    for (const key of page.keys) {
      const subscriber = await env.SUBSCRIBERS.get(key.name, 'json');
      if (!subscriber) continue;

      const now = localParts(subscriber.timezone || DEFAULT_TIMEZONE);
      if (
        now.time === subscriber.time &&
        subscriber.lastSentDate !== now.date
      ) {
        await sendMessage(
          env,
          subscriber.chatId,
          'Сейчас — Love Time ♥\n\nВыбери человека, которому сегодня подаришь внимание.',
          taskKeyboard()
        );
        subscriber.lastSentDate = now.date;
        await env.SUBSCRIBERS.put(key.name, JSON.stringify(subscriber));
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

function localParts(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

function randomTask() {
  return 'Твоё действие любви на сегодня:\n\n' +
    TASKS[Math.floor(Math.random() * TASKS.length)];
}

function taskKeyboard() {
  return {
    inline_keyboard: [[
      { text: 'Получить задание любви', callback_data: 'love_task' },
    ]],
  };
}

async function answerCallback(env, callbackId) {
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId }),
    }
  );
}

async function sendMessage(env, chatId, text, replyMarkup) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status}`);
  }
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
