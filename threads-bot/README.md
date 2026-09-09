# IZOBILION Threads Bot

Собственный автопостер для Threads через официальный Threads Graph API без Metricool.

## MVP

- очередь утверждённых постов;
- минимум 60 минут между публикациями;
- публикация напрямую в Threads;
- Telegram-отчёт после фактической публикации;
- вечерний отчёт по доступным метрикам;
- автоматическое обновление токена Threads;
- SQLite для очереди и истории.

## Поток

ChatGPT/Telegram -> API сервиса -> очередь -> Threads Graph API -> Telegram отчёт.

## Статус

Каркас MVP. Следующие шаги: Threads OAuth, publisher, scheduler, Telegram reporter, analytics.
