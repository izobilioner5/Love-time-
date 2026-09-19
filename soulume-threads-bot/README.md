# SOULUME Threads Bot

Автоматическая линия контента для отдельного Threads-профиля героини SOULUME.

## Как работает

1. ChatGPT automation каждые 2 часа генерирует новый английский пост и русский перевод.
2. Automation обновляет `soulume-threads-bot/current_post.json` в ветке `soulume-threads-bot`.
3. GitHub Actions запускает `publisher.py`.
4. `publisher.py` публикует **только английский текст** через официальный Threads API.
5. После успешной публикации запись добавляется в `history.jsonl`, чтобы следующие посты не повторялись.

## Secrets

В GitHub repository settings -> Secrets and variables -> Actions нужны:

- `THREADS_USER_ID`
- `THREADS_ACCESS_TOKEN`

Токен должен иметь разрешения `threads_basic` и `threads_content_publish`.

## Канон героини

- без раскрытия имени;
- подпись `— S.` используется редко;
- первый сюжетный якорь: Santorini / Warm Soul After Dark;
- голос: интимный, живой, немного кинематографичный дневник путешествия;
- без маркетингового тона, хэштег-спама и однотипных AI-афоризмов;
- публичный пост до 500 UTF-8 байт для безопасного соблюдения лимита Threads.
