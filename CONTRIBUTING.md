# Contributing

Use Node.js 22.13 or newer and npm. Create `.env` from `.env.example`; never commit
credentials.

Before each commit, run:

```sh
npm run verify
```

Database work additionally requires Docker and the Supabase CLI:

```sh
npm run db:start
npm run db:reset
npm run test:db
```

Keep TypeScript strict, use generated database types, and put all authorization
assumptions in database policies or trusted server functions rather than UI code.
