# proxy

Простой HTTP/1.1 форвард-прокси с авторизацией по `login:password` (Basic auth).
Написан на чистом Node.js — без внешних зависимостей.

## Возможности

- Проксирование обычных HTTP-запросов.
- Туннелирование HTTPS через метод `CONNECT`.
- Авторизация клиента через заголовок `Proxy-Authorization: Basic`.
- Несколько пользователей (`login:password`).

## Запуск

```bash
node proxy.js
```

Порт по умолчанию — `8080`.

### Docker

Собрать образ:

```bash
docker build -t https-auth-proxy:latest .
# или: npm run docker:build
```

Запустить контейнер (учётные данные передаются через `PROXY_USERS`):

```bash
docker run --rm -p 8080:8080 -e PROXY_USERS="alice:secret" https-auth-proxy:latest
# или: npm run docker:run
```

Либо через `docker compose` (правь `PROXY_USERS` в `docker-compose.yml`):

```bash
docker compose up --build
```

Образ основан на `node:22-alpine`, работает от непривилегированного пользователя
`node` и содержит только рантайм-файлы (`proxy.js`, `config.js`, `package.json`).

## Настройка

Учётные данные и параметры задаются в `config.js` либо через переменные окружения:

| Переменная    | Назначение                                   | По умолчанию |
| ------------- | -------------------------------------------- | ------------ |
| `PROXY_HOST`  | Интерфейс для прослушивания                   | `0.0.0.0`    |
| `PROXY_PORT`  | Порт                                          | `8080`       |
| `PROXY_USERS` | Пары `login:password` через запятую           | —            |

Пример:

```bash
PROXY_PORT=3128 PROXY_USERS="alice:secret,bob:hunter2" node proxy.js
```

Переменная `PROXY_USERS` дополняет пользователей из `config.js`.

## Проверка

Обычный HTTP:

```bash
curl -x http://alice:secret@localhost:8080 http://example.com
```

HTTPS (через CONNECT):

```bash
curl -x http://alice:secret@localhost:8080 https://example.com
```

Без корректных данных прокси вернёт `407 Proxy Authentication Required`.
