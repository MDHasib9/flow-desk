# FlowDesk

FlowDesk is a team workspace for managing customers, projects, tasks, invoices,
notifications, and organization membership. It is built with Next.js 16, React,
TypeScript, and Supabase.

## Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create `.env.local` in the project root with your Supabase project values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. Link the Supabase CLI to the intended project and apply the database
   migrations:

   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

   The migrations create the schema, row-level security policies, private
   project-file storage bucket, and the invoice-item RPC. Apply every migration
   before deploying the matching application code.

4. In Supabase Auth URL configuration, set the local site URL to
   `http://localhost:3000` and allow redirects to
   `http://localhost:3000/auth/confirm`. Add the matching production origin and
   confirmation path when deploying.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Production release checklist

- Set `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment.
- Apply all migrations to the production Supabase project before deploying.
- Set the production Site URL and allow the production
  `/auth/confirm` redirect in Supabase Auth.
- Verify email delivery, sign-up, sign-in, password reset, invitation
  acceptance, and sign-out with production-like accounts.
- Test customer, project, task, file, and invoice flows with users in separate
  workspaces, including switching between multiple memberships.
- Review your deployment provider's domain, HTTPS, backups, and monitoring
  configuration, and publish the legal/privacy information required for your
  service.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```
