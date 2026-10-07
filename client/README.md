# Asset Manager — Client

React + Vite front end for the Asset Management API. Blue-and-white light theme, blue-only dark theme, OTP sign-in and registration.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The backend must be running on `http://localhost:5000` and must allow this origin. In the **backend** `.env`:

```env
FRONTEND_URL=http://localhost:5173   # exact origin, no trailing slash
COOKIE_SECURE=false                  # for plain http on localhost
```

`FRONTEND_URL` drives both CORS and the refresh-token cookie, so a mismatch shows up as "Can't reach the server".

### Client environment (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api/v1` | API base URL |
| `VITE_APP_NAME` | `Asset Manager` | Name shown in the UI and tab title |
| `VITE_DEFAULT_COUNTRY_CODE` | `+91` | Added when someone types a 10-digit mobile number on the login screen |

## Folder structure

```
client
├─ public/                 favicon
├─ src/
│  ├─ components/
│  │  ├─ auth/             AuthLayout, OtpStep, ProtectedRoute / GuestRoute
│  │  ├─ layout/           AppLayout (sidebar, top bar, mobile tab bar)
│  │  └─ ui/               Button, TextField, PhoneField, OtpInput, Modal, Toaster, ...
│  ├─ context/             AuthContext, ThemeContext, ToastContext
│  ├─ hooks/               useAuth, useTheme, useToast, useOtpFlow, useCountdown, ...
│  ├─ pages/               LoginPage, RegisterPage, DashboardPage, PeoplePage, NotFoundPage
│  ├─ services/            api.js (axios + token refresh), auth / household / person services
│  ├─ styles/              variables, base, components, auth, layout, pages (all CSS)
│  ├─ utils/               validators and formatters
│  ├─ App.jsx              routes
│  ├─ index.css            imports everything in styles/
│  └─ main.jsx
├─ .env  .env.example  .gitignore
├─ eslint.config.js  index.html  package.json  vite.config.js
```

## API map

All calls live in `src/services/`. Pages and hooks never call axios directly.

| Backend endpoint | Service function | Used by |
| --- | --- | --- |
| `POST /auth/register/request-otp` | `auth.service → registerRequestOtp` | RegisterPage |
| `POST /auth/register/verify-otp` | `auth.service → registerVerifyOtp` | RegisterPage |
| `POST /auth/login/request-otp` | `auth.service → loginRequestOtp` | LoginPage |
| `POST /auth/login/verify-otp` | `auth.service → loginVerifyOtp` | LoginPage |
| `POST /auth/refresh` | `api.js → refreshSession` | automatic (401 retry, page reload) |
| `POST /auth/logout` | `auth.service → logout` | sidebar / top bar |
| `GET /households/me` | `household.service → getMyHousehold` | Dashboard, session restore |
| `GET /people`, `POST /people` | `person.service` | PeoplePage |

### How the session works

- The access token is kept **in memory only**. The refresh token is the backend's httpOnly cookie, which JavaScript never reads.
- On a 401 the client refreshes once and retries the request. If refresh fails, the user is signed out.
- The backend rotates the refresh token on every refresh, so `api.js` shares a single in-flight refresh between callers. Two parallel refreshes would otherwise revoke each other.
- On page load the client restores the session by refreshing, then loads `/households/me` and finds "me" from the token's `sub`.
- `am.session` in localStorage is only a flag that says "try restoring a session"; it holds no credentials.

## Themes

`ThemeContext` sets `data-theme="light|dark"` on `<html>`; the saved choice (or the OS preference) is applied in `index.html` before first paint, so there is no flash.

All colours are CSS variables in `src/styles/variables.css`. Dark mode uses blue shades only, with one deliberate exception: `--danger`, so errors stay readable. Change that variable if you want errors in blue as well.

## Scripts

```bash
npm run dev       # dev server
npm run build     # production build into dist/
npm run preview   # serve the build on :5173
npm run lint
```
