# backend-auth

Minimal Express + Mongo auth API cloned from the main backend.

- Port: 5002
- Endpoints: /api/auth/signup, /api/auth/login, /api/auth/logout, /api/auth/check
- Health: /healthz

Environment:
Create a .env with:

PORT=5002
MONGODB_URI=mongodb://127.0.0.1:27017/saas_auth
JWT_SECRET=dev_secret_change_me
NODE_ENV=development

Scripts:
- npm run dev – start in dev with nodemon
- npm start – start in prod mode
