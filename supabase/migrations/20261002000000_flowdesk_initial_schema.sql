-- FlowDesk initial schema: multi-tenant CRM, project management, and billing.
-- Apply with `supabase db push`. Auth users are managed by Supabase Auth, never by this migration.

create extension if not exists pgcrypto;
create extension if not exists citext;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username citext unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username is null or username ~ '^[a-zA-Z0-9_]{3,32}$')
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug citext not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email citext not null,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invitations_expiry check (expires_at > created_at),
  constraint invitations_accepted_after_creation check (accepted_at is null or accepted_at >= created_at)
);
create unique index invitations_one_pending_per_email on public.invitations(organization_id, email) where accepted_at is null;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  email citext,
  phone text,
  company text,
  address text,
  notes text,
  status text not null default 'LEAD' check (status in ('LEAD', 'ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  status text not null default 'PLANNING' check (status in ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  start_date date,
  deadline date,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates check (deadline is null or start_date is null or deadline >= start_date),
  foreign key (organization_id, customer_id) references public.customers(organization_id, id) on delete set null,
  unique (organization_id, id)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  status text not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  invoice_number text not null check (char_length(trim(invoice_number)) > 0),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) generated always as (subtotal + tax) stored,
  issue_date date not null default current_date,
  due_date date,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_dates check (due_date is null or due_date >= issue_date),
  foreign key (organization_id, customer_id) references public.customers(organization_id, id) on delete restrict,
  unique (organization_id, invoice_number),
  unique (organization_id, id)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null check (char_length(trim(file_name)) > 0),
  -- Must match Storage object name: <organization UUID>/<project UUID>/<opaque filename>.
  file_path text not null unique,
  file_type text,
  file_size bigint not null check (file_size >= 0 and file_size <= 104857600),
  created_at timestamptz not null default now(),
  constraint project_files_path_matches_tenant check (file_path like organization_id::text || '/' || project_id::text || '/%'),
  foreign key (organization_id, project_id) references public.projects(organization_id, id) on delete cascade
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  message text not null,
  type text not null default 'INFO' check (type in ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'TASK', 'INVOICE')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(trim(action)) > 0),
  entity_type text not null check (char_length(trim(entity_type)) > 0),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

-- Indexes mirror the tenant filters used by RLS and common workspace screens.
create index customers_org_status_idx on public.customers(organization_id, status);
create index projects_org_status_idx on public.projects(organization_id, status);
create index projects_customer_idx on public.projects(customer_id) where customer_id is not null;
create index project_members_user_idx on public.project_members(user_id, project_id);
create index tasks_org_project_status_idx on public.tasks(organization_id, project_id, status);
create index tasks_assignee_due_idx on public.tasks(assigned_to, due_date) where assigned_to is not null;
create index task_comments_task_created_idx on public.task_comments(task_id, created_at);
create index invoices_org_status_due_idx on public.invoices(organization_id, status, due_date);
create index invoice_items_invoice_idx on public.invoice_items(invoice_id);
create index project_files_org_project_idx on public.project_files(organization_id, project_id);
create index notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index activity_logs_org_created_idx on public.activity_logs(organization_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();

-- Profiles are created server-side whenever Auth creates a user. Metadata is untrusted, so it is normalized.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
          nullif(lower(new.raw_user_meta_data->>'username'), ''), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Every newly created workspace immediately receives its creator as its first OWNER.
create or replace function public.add_organization_creator() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organization_members (organization_id, user_id, role) values (new.id, auth.uid(), 'OWNER');
  return new;
end; $$;
create trigger organization_creator_membership after insert on public.organizations for each row execute function public.add_organization_creator();

-- SECURITY DEFINER membership helpers avoid circular RLS evaluation. They do not accept a caller-supplied user id.
create or replace function public.is_org_member(p_organization_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = auth.uid())
$$;
create or replace function public.is_org_admin(p_organization_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.role in ('OWNER', 'ADMIN'))
$$;
create or replace function public.is_org_owner(p_organization_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m where m.organization_id = p_organization_id and m.user_id = auth.uid() and m.role = 'OWNER')
$$;
create or replace function public.is_project_member(p_project_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members pm where pm.project_id = p_project_id and pm.user_id = auth.uid())
$$;
create or replace function public.shares_organization_with(p_user_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select p_user_id = auth.uid() or exists (
    select 1 from public.organization_members mine
    join public.organization_members theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  )
$$;

-- Protect against cross-organization assignment and against removing/demoting the final owner.
create or replace function public.validate_project_member() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.projects p join public.organization_members m on m.organization_id = p.organization_id where p.id = new.project_id and m.user_id = new.user_id) then
    raise exception 'Project members must belong to the project organization';
  end if;
  return new;
end; $$;
create trigger project_member_tenant_check before insert or update on public.project_members for each row execute function public.validate_project_member();
create or replace function public.validate_task_assignee() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and not exists (select 1 from public.project_members where project_id = new.project_id and user_id = new.assigned_to) then
    raise exception 'Task assignee must be assigned to the project';
  end if;
  return new;
end; $$;
create trigger task_assignee_check before insert or update on public.tasks for each row execute function public.validate_task_assignee();
create or replace function public.restrict_member_task_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_admin(old.organization_id)
     and (new.organization_id <> old.organization_id or new.project_id <> old.project_id
          or new.assigned_to is distinct from old.assigned_to or new.created_by <> old.created_by) then
    raise exception 'Members cannot reassign or move tasks';
  end if;
  return new;
end; $$;
create trigger task_member_update_guard before update on public.tasks for each row execute function public.restrict_member_task_update();
create or replace function public.protect_organization_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' and old.role = 'OWNER' and not exists (select 1 from public.organization_members where organization_id = old.organization_id and role = 'OWNER' and id <> old.id) then raise exception 'An organization must retain an owner'; end if;
  if tg_op = 'UPDATE' and old.role = 'OWNER' and new.role <> 'OWNER' and not exists (select 1 from public.organization_members where organization_id = old.organization_id and role = 'OWNER' and id <> old.id) then raise exception 'An organization must retain an owner'; end if;
  return coalesce(new, old);
end; $$;
create trigger organization_owner_protection before update or delete on public.organization_members for each row execute function public.protect_organization_owner();

-- Client-side activity inserts are deliberately disallowed. Use this RPC for trusted, tenant-checked audit events.
create or replace function public.log_activity(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid default null, p_metadata jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_org_member(p_organization_id) then raise exception 'Not a member of this organization'; end if;
  insert into public.activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
  values (p_organization_id, auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb)) returning id into v_id;
  return v_id;
end; $$;

-- Accepting invitations is atomic; the token is intentionally the only invitation data exposed to non-members.
create or replace function public.accept_invitation(p_token uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare v_invitation public.invitations%rowtype;
begin
  select * into v_invitation from public.invitations where token = p_token and accepted_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitation is invalid or expired'; end if;
  if lower((select email from auth.users where id = auth.uid())) <> lower(v_invitation.email::text) then raise exception 'Invitation email does not match authenticated user'; end if;
  insert into public.organization_members (organization_id, user_id, role) values (v_invitation.organization_id, auth.uid(), v_invitation.role) on conflict (organization_id, user_id) do nothing;
  update public.invitations set accepted_at = now() where id = v_invitation.id;
  return v_invitation.organization_id;
end; $$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.project_files enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Names/avatars are visible only to people who share a workspace; profile edits remain self-only.
create policy profiles_shared_read on public.profiles for select to authenticated using (public.shares_organization_with(id));
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy organizations_select on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_create on public.organizations for insert to authenticated with check (true);
create policy organizations_update on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy organizations_delete on public.organizations for delete to authenticated using (public.is_org_owner(id));
create policy members_select on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members for insert to authenticated with check (public.is_org_admin(organization_id) and (public.is_org_owner(organization_id) or role = 'MEMBER'));
create policy members_update on public.organization_members for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id) and (public.is_org_owner(organization_id) or role = 'MEMBER'));
create policy members_delete on public.organization_members for delete to authenticated using (public.is_org_admin(organization_id));
create policy invitations_admin_all on public.invitations for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy customers_member_read on public.customers for select to authenticated using (public.is_org_member(organization_id));
create policy customers_admin_write on public.customers for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy projects_member_read on public.projects for select to authenticated using (public.is_org_member(organization_id));
create policy projects_admin_write on public.projects for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy project_members_read on public.project_members for select to authenticated using (public.is_org_admin((select organization_id from public.projects where id = project_id)) or public.is_project_member(project_id));
create policy project_members_admin_write on public.project_members for all to authenticated using (public.is_org_admin((select organization_id from public.projects where id = project_id))) with check (public.is_org_admin((select organization_id from public.projects where id = project_id)));
create policy tasks_assigned_read on public.tasks for select to authenticated using (public.is_org_admin(organization_id) or assigned_to = auth.uid() or public.is_project_member(project_id));
create policy tasks_admin_create on public.tasks for insert to authenticated with check (public.is_org_admin(organization_id));
create policy tasks_admin_or_assignee_update on public.tasks for update to authenticated using (public.is_org_admin(organization_id) or assigned_to = auth.uid()) with check (public.is_org_admin(organization_id) or assigned_to = auth.uid());
create policy tasks_admin_delete on public.tasks for delete to authenticated using (public.is_org_admin(organization_id));
create policy comments_read on public.task_comments for select to authenticated using (exists (select 1 from public.tasks t where t.id = task_id and (public.is_org_admin(t.organization_id) or t.assigned_to = auth.uid() or public.is_project_member(t.project_id))));
create policy comments_insert on public.task_comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and (public.is_org_admin(t.organization_id) or t.assigned_to = auth.uid() or public.is_project_member(t.project_id))));
create policy comments_own_manage on public.task_comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy comments_own_or_admin_delete on public.task_comments for delete to authenticated using (user_id = auth.uid() or exists (select 1 from public.tasks t where t.id = task_id and public.is_org_admin(t.organization_id)));
create policy invoices_admin_all on public.invoices for all to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy invoice_items_admin_all on public.invoice_items for all to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id))) with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_org_admin(i.organization_id)));
create policy files_read on public.project_files for select to authenticated using (public.is_org_admin(organization_id) or public.is_project_member(project_id));
create policy files_insert on public.project_files for insert to authenticated with check (uploaded_by = auth.uid() and (public.is_org_admin(organization_id) or public.is_project_member(project_id)));
create policy files_delete on public.project_files for delete to authenticated using (uploaded_by = auth.uid() or public.is_org_admin(organization_id));
create policy notifications_self_read on public.notifications for select to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id));
create policy notifications_self_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_org_member(organization_id));
create policy notifications_admin_insert on public.notifications for insert to authenticated with check (public.is_org_admin(organization_id) and exists (select 1 from public.organization_members m where m.organization_id = notifications.organization_id and m.user_id = notifications.user_id));
create policy activity_logs_admin_read on public.activity_logs for select to authenticated using (public.is_org_admin(organization_id));

-- Storage is private. Use object names: <organization_id>/<project_id>/<uuid>-<safe-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flowdesk-project-files', 'flowdesk-project-files', false, 104857600, array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
create or replace function public.storage_project_access(p_name text, p_write boolean default false) returns boolean language plpgsql stable security definer set search_path = public as $$
declare p text[] := storage.foldername(p_name); v_org uuid; v_project uuid;
begin
  if coalesce(array_length(p, 1), 0) < 3 or p[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or p[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  v_org := p[1]::uuid; v_project := p[2]::uuid;
  if not exists (select 1 from public.projects where id = v_project and organization_id = v_org) then return false; end if;
  return public.is_org_admin(v_org) or public.is_project_member(v_project);
end; $$;
create or replace function public.storage_path_org_admin(p_name text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare p text[] := storage.foldername(p_name);
begin
  if coalesce(array_length(p, 1), 0) < 2 or p[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return public.is_org_admin(p[1]::uuid);
end; $$;
create policy storage_project_files_read on storage.objects for select to authenticated using (bucket_id = 'flowdesk-project-files' and public.storage_project_access(name));
create policy storage_project_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'flowdesk-project-files' and public.storage_project_access(name, true));
create policy storage_project_files_update on storage.objects for update to authenticated using (bucket_id = 'flowdesk-project-files' and (owner_id = auth.uid()::text or public.storage_path_org_admin(name))) with check (bucket_id = 'flowdesk-project-files' and public.storage_project_access(name, true));
create policy storage_project_files_delete on storage.objects for delete to authenticated using (bucket_id = 'flowdesk-project-files' and (owner_id = auth.uid()::text or public.storage_path_org_admin(name)));

comment on table public.organization_members is 'Tenant boundary. All organization-scoped access is derived from this table.';
comment on table public.activity_logs is 'Append-only audit trail; only the log_activity RPC writes client-originated events.';
comment on column public.project_files.file_path is 'Private Storage object key, not a public URL.';
