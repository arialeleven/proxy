# proxy

TLS-терминирующий HTTP/1.1 форвард-прокси с авторизацией по `login:password`
(Basic auth). Соединение клиент↔прокси шифруется TLS (HTTPS-proxy).
Написан на чистом Node.js — без внешних зависимостей.

## Возможности

- **TLS-терминация**: трафик между клиентом и прокси зашифрован (порт `6443`).
- Проксирование обычных HTTP-запросов.
- Туннелирование HTTPS через метод `CONNECT`.
- Авторизация клиента через заголовок `Proxy-Authorization: Basic`.
- Несколько пользователей (`login:password`).
- Готовый Docker-образ и release-workflow с публикацией в GHCR.

## Быстрый старт

Сначала сгенерируйте self-signed сертификат (нужен `openssl`):

```bash
npm run gen-certs          # или: CN=proxy.example.com bash scripts/generate-certs.sh
node proxy.js              # слушает https на 0.0.0.0:6443
```

Порт по умолчанию — `6443`, TLS включён.

### Docker

Локально проще всего через `docker compose` (сертификат генерируется
автоматически при первом запуске и сохраняется в томе `./certs`):

```bash
docker compose up --build
```

Или напрямую:

```bash
docker build -t tls-auth-proxy:latest .          # npm run docker:build
docker run --rm -p 6443:6443 \
  -e PROXY_USERS="alice:secret" \
  tls-auth-proxy:latest                          # npm run docker:run
```

Образ основан на `node:22-alpine`, работает от непривилегированного
пользователя `node`. При старте `docker-entrypoint.sh` автоматически создаёт
self-signed сертификат, если файлы не смонтированы. Для продакшена
смонтируйте свои PEM-файлы:

```bash
docker run --rm -p 6443:6443 \
  -e PROXY_USERS="alice:secret" \
  -v "$PWD/certs:/app/certs" \
  tls-auth-proxy:latest
```

### Готовый образ из релиза

Каждый тег `v*` публикует multi-arch образ в GitHub Container Registry:

```bash
docker pull ghcr.io/arialeleven/proxy:latest
docker run --rm -p 6443:6443 -e PROXY_USERS="alice:secret" \
  ghcr.io/arialeleven/proxy:latest
```

К каждому релизу также прикладывается `tls-auth-proxy-<version>-amd64.tar.gz`
для офлайн-установки без доступа к реестру (`docker load < ...`).

## Настройка

Параметры задаются в `config.js` либо через переменные окружения:

| Переменная       | Назначение                                   | По умолчанию              |
| ---------------- | -------------------------------------------- | ------------------------- |
| `PROXY_HOST`     | Интерфейс для прослушивания                   | `0.0.0.0`                 |
| `PROXY_PORT`     | Порт                                          | `6443`                    |
| `PROXY_USERS`    | Пары `login:password` через запятую           | —                         |
| `PROXY_TLS`      | Включить TLS (`true`/`false`)                  | `true`                    |
| `PROXY_TLS_CERT` | Путь к сертификату (PEM)                       | `./certs/proxy-cert.pem`  |
| `PROXY_TLS_KEY`  | Путь к приватному ключу (PEM)                  | `./certs/proxy-key.pem`   |
| `PROXY_CN`       | Common Name для авто-генерации сертификата     | `localhost`               |

Пример:

```bash
PROXY_PORT=6443 PROXY_USERS="alice:secret,bob:hunter2" node proxy.js
```

`PROXY_USERS` дополняет пользователей из `config.js`. TLS можно отключить
(`PROXY_TLS=false`) — тогда прокси работает как обычный HTTP-прокси без
шифрования соединения клиент↔прокси.

## Проверка

HTTPS через CONNECT (для self-signed сертификата прокси нужен
`--proxy-insecure`):

```bash
curl --proxy-insecure -x https://alice:secret@localhost:6443 https://example.com
```

Обычный HTTP:

```bash
curl --proxy-insecure -x https://alice:secret@localhost:6443 http://example.com
```

Без корректных данных прокси вернёт `407 Proxy Authentication Required`.

## Релиз

Workflow `.github/workflows/release.yml` запускается по пушу semver-тега:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

Он собирает multi-arch образ (`linux/amd64`, `linux/arm64`), публикует его в
`ghcr.io/arialeleven/proxy` и создаёт GitHub Release с образом-тарболом и
zip расширения. Также доступен ручной запуск (`workflow_dispatch`).
