# IZOBILION Threads Bot MVP

Безопасный автопостер для Threads через официальный Threads API.

## Что уже работает

- защищённый API для создания и просмотра постов;
- статус `draft` до явного согласования;
- утверждение только точной командой `утверждаю, публикуй`;
- dry-run включён по умолчанию;
- создание текстового контейнера и публикация через Threads API;
- минимум 60 минут между реальными публикациями;
- автоматическая обработка только утверждённых постов;
- Telegram-отчёт после подтверждённой публикации;
- очередь и история в Cloudflare KV;
- автоматические тесты критического потока.

## Локальная проверка

```bash
cd threads-bot
npm test
npx wrangler dev --config wrangler.example.jsonc --test-scheduled
```

Проверка состояния:

```bash
curl http://127.0.0.1:8787/
```

Для локальной очереди создай `threads-bot/.dev.vars`:

```dotenv
ADMIN_API_KEY=replace-with-a-long-random-value
```

Создать черновик:

```bash
curl -X POST http://127.0.0.1:8787/posts \
  -H 'Authorization: Bearer replace-with-a-long-random-value' \
  -H 'Content-Type: application/json' \
  -d '{"text":"Тестовый пост IZOBILION"}'
```

В ответе будет `post.id`. Утвердить конкретный черновик:

```bash
curl -X POST http://127.0.0.1:8787/posts/POST_ID/approve \
  -H 'Authorization: Bearer replace-with-a-long-random-value' \
  -H 'Content-Type: application/json' \
  -d '{"command":"утверждаю, публикуй"}'
```

Проверить публикацию в dry-run без обращения к Threads:

```bash
curl -X POST http://127.0.0.1:8787/posts/POST_ID/publish \
  -H 'Authorization: Bearer replace-with-a-long-random-value'
```

## Что нужно для одного живого теста

1. Скопировать `wrangler.example.jsonc` в `wrangler.jsonc`.
2. Создать KV namespace и вставить его ID в `wrangler.jsonc`.
3. Добавить секреты командами `npx wrangler secret put ИМЯ`:
   - `ADMIN_API_KEY`;
   - `THREADS_USER_ID`;
   - `THREADS_ACCESS_TOKEN`;
   - необязательно `TELEGRAM_BOT_TOKEN`;
   - необязательно `TELEGRAM_REPORT_CHAT_ID`.
4. Оставить `AUTO_PUBLISH=false`, а для живого теста поменять `DRY_RUN` на `false`.
5. Развернуть через `npx wrangler deploy --config threads-bot/wrangler.jsonc`.
6. Создать один черновик, отдельно утвердить его и вызвать `/publish`.

Автопубликацию включать только после успешного ручного теста, установив
`AUTO_PUBLISH=true`. Без точного утверждения пост всё равно не попадёт в публикацию.

## Ещё не входит в этот MVP

- интерфейс редактирования и согласования;
- OAuth-экран получения токена;
- автоматическое продление токена;
- вечерняя аналитика и метрики постов;
- повторные попытки после временных ошибок Threads;
- защита очереди от одновременного запуска нескольких публикаций.
