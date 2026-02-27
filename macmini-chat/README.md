# macmini-chat (temporary direct chat server)

Mac mini 上で一時運用するための、依存なし Node.js チャットサーバーです。

- 訪問者側 API
  - `POST /api/chat/session` セッション作成
  - `POST /api/chat/message` 訪問者メッセージ送信
  - `GET /api/chat/messages` メッセージ取得
- 担当者側 API
  - `GET /api/admin/sessions` セッション一覧
  - `GET /api/admin/messages` セッションメッセージ取得
  - `POST /api/admin/message` 返信送信
  - `POST /api/admin/session/close` セッション close/reopen
- 管理画面
  - `GET /admin/`

## Start

```bash
cd /Users/keita/homepage/macmini-chat
PORT=8787 \
HOST=0.0.0.0 \
ALLOWED_ORIGIN=https://ryogisystems.creative-own.com \
ADMIN_TOKEN=replace-with-strong-token \
npm start
```

## Launchd auto-start (Mac mini)

1. 設定ファイルを作成

```bash
cd /Users/keita/homepage/macmini-chat
cp config/chat.env.example config/chat.env
```

2. `config/chat.env` を編集

- `ADMIN_TOKEN` を強い値へ変更
- `ALLOWED_ORIGIN` を本番ドメインへ設定
- `NODE_BIN` / `CLOUDFLARED_BIN` のパスを実機に合わせる
- `CLOUDFLARED_CONFIG` / `CLOUDFLARED_TUNNEL_NAME` を設定

3. launchd 登録

```bash
cd /Users/keita/homepage/macmini-chat
./scripts/install-launchd.sh
```

4. 状態確認

```bash
launchctl print "gui/$(id -u)/com.ryogi.macmini-chat" | head
launchctl print "gui/$(id -u)/com.ryogi.cloudflared-chat" | head
curl -sS https://chat.ryogisystems.creative-own.com/health
```

5. 停止/削除する場合

```bash
cd /Users/keita/homepage/macmini-chat
./scripts/uninstall-launchd.sh
```

## Environment variables

- `PORT` default: `8787`
- `HOST` default: `0.0.0.0`
- `ALLOWED_ORIGIN` default: `*`
- `ADMIN_TOKEN` default: empty (未設定だと管理APIが無認証)
- `SESSION_TTL_HOURS` default: `24`

## Site side setting

サイト側（`index.html`）で下記を Mac mini 公開URL に変更してください。

```html
<script>
  window.CHAT_API_BASE = 'https://chat.ryogisystems.creative-own.com';
</script>
```

## Notes

- セッションはメモリ保持です。サーバー再起動で消えます。
- 本番常用ではなく一時運用向けです。
