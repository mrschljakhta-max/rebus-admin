# REBUS Admin Portal v0.1

Статичний сайт для GitHub Pages + Supabase.

## Що є

- `index.html` — вхід через Google.
- `setup-2fa.html` — перше налаштування TOTP/QR.
- `verify-2fa.html` — введення 2FA-коду при наступних входах.
- `dashboard.html` — перша панель керування.
- `users.html` — список користувачів.
- `access.html` — надати доступ користувачу/адміну.
- `events.html` — журнал подій.
- `settings.html` — вихід із сесії.

## Перед запуском

1. У Supabase → SQL Editor виконай `sql/rebus_admin_setup.sql`.
2. У `js/config.js` встав `SUPABASE_ANON_KEY`.
3. У Supabase Auth увімкни Google provider.
4. У Supabase Auth URL Configuration додай GitHub Pages URL у Redirect URLs.

## Важливо

`service_role key` ніколи не вставляти в сайт або розширення.
