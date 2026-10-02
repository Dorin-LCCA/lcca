# Auth Testing Playbook (DORIN TRAVEL — Emergent Google OAuth)

Auth is Google-only (Emergent OAuth). No passwords. Sessions use httpOnly
`session_token` cookie (7 days). Backend validates cookie first, then
`Authorization: Bearer <session_token>`.

Admin = user whose email == ADMIN_EMAIL (spinudorin10@gmail.com) → role "admin".

## Seed a test user + session (bypasses Google for automated tests)
```
mongosh --eval '
use("test_database");
var uid = "user_test" + Date.now();
var tok = "test_session_" + Date.now();
db.users.insertOne({user_id: uid, email: "qa."+Date.now()+"@example.com", name:"QA Tester",
  first_name:"QA", last_name:"Tester", picture:"", role:"customer", marketing_opt_in:false,
  preferences:{}, saved_destinations:[], saved_offers:[], created_at:new Date().toISOString()});
db.user_sessions.insertOne({user_id: uid, session_token: tok,
  expires_at: new Date(Date.now()+7*24*3600*1000).toISOString(), created_at:new Date().toISOString()});
print("session_token="+tok);
'
```
For an ADMIN session, set role:"admin" and email:"spinudorin10@gmail.com".

## Pre-seeded admin test session (already in DB)
- session_token: test_admin_session_token_123  (user spinudorin10@gmail.com, role admin)

## API tests (external base = REACT_APP_BACKEND_URL)
```
curl -b "session_token=TOKEN" $API/api/auth/me           # -> user json
curl -b "session_token=ADMIN"  $API/api/admin/blog       # admin-only list
curl -b "session_token=ADMIN"  $API/api/leads            # admin-only
curl -b "session_token=ADMIN"  $API/api/analytics/summary
```

## Browser tests
Set the cookie, then navigate:
```
await page.context.add_cookies([{ "name":"session_token","value":"TOKEN",
  "domain":"<preview-host>","path":"/","httpOnly":True,"secure":True,"sameSite":"None"}])
await page.goto("https://<preview-host>/dashboard")   # customer
await page.goto("https://<preview-host>/admin")        # admin
```
NOTE: add_cookies must run BEFORE page.goto. Set the cookie, THEN load the page
in a fresh context; otherwise the AuthProvider /auth/me call 401s and redirects
to /login.

## OAuth callback flow (manual)
"Continue with Google" → auth.emergentagent.com → returns to /dashboard#session_id=XXX
→ Shell renders AuthCallback → POST /api/auth/session (X-Session-ID header) →
sets cookie → redirects (/admin if admin, else /dashboard).

## Endpoints
- POST /api/auth/session   (header X-Session-ID)   -> sets cookie, returns user
- POST /api/auth/logout    -> clears cookie + deletes session
- GET  /api/auth/me        -> current user
- Blog CMS (admin): GET /api/admin/blog, POST /api/blog, PUT /api/blog/{id}, DELETE /api/blog/{id}
- Email: welcome on first login (new user), confirmation on enquiry/contact (Resend 202)
