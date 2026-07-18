# Playwright authentication

The app authenticates with a Supabase magic link. Create a saved browser
session once before testing protected routes:

```powershell
$env:PLAYWRIGHT_EMAIL = "you@example.com"
npm run playwright:auth
```

The setup opens Chromium, submits the email form at `localhost:3002`, waits for
you to paste the magic link from your email, and saves the authenticated state
to `playwright/.auth/user.json`.

Use the same `localhost:3002` origin in the magic link redirect configuration;
do not switch between `localhost` and `127.0.0.1`, because browser cookies are
origin-specific.
