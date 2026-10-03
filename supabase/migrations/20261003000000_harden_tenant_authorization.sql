create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.project_members pm
      join public.projects p on p.id = pm.project_id
      join public.organization_members om
        on om.organization_id = p.organization_id
       and om.user_id = auth.uid()
     where pm.project_id = p_project_id
       and pm.user_id = auth.uid()
  )
$$;

revoke all on function public.is_project_member(uuid) from public, anon;
grant execute on function public.is_project_member(uuid) to authenticated;

create or replace function public.prevent_membership_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Organization membership identity cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_member_identity_guard
  on public.organization_members;
create trigger organization_member_identity_guard
before update on public.organization_members
for each row execute function public.prevent_membership_identity_change();

revoke all on function public.prevent_membership_identity_change()
  from public, anon, authenticated;

create or replace function public.restrict_member_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.project_id is distinct from old.project_id
     or new.created_by is distinct from old.created_by then
    raise exception 'A task cannot be moved or have its creator changed';
  end if;

  if not public.is_org_admin(old.organization_id)
     and new.assigned_to is distinct from old.assigned_to then
    raise exception 'Members cannot reassign tasks';
  end if;

  return new;
end;
$$;

revoke all on function public.restrict_member_task_update()
  from public, anon, authenticated;

create or replace function public.protect_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'OWNER' and (
    tg_op = 'DELETE'
    or (tg_op = 'UPDATE' and new.role <> 'OWNER')
  ) then
    if not public.is_org_owner(old.organization_id) then
      raise exception 'Only an organization owner can remove or demote an owner';
    end if;

    if not exists (
      select 1
        from public.organization_members
       where organization_id = old.organization_id
         and role = 'OWNER'
         and id <> old.id
    ) then
      raise exception 'An organization must retain an owner';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.protect_organization_owner()
  from public, anon, authenticated;

drop policy if exists tasks_assigned_read on public.tasks;
create policy tasks_assigned_read on public.tasks
for select to authenticated
using (
  public.is_org_member(organization_id)
  and (
    public.is_org_admin(organization_id)
    or assigned_to = auth.uid()
    or public.is_project_member(project_id)
  )
);

drop policy if exists tasks_admin_or_assignee_update on public.tasks;
create policy tasks_admin_or_assignee_update on public.tasks
for update to authenticated
using (
  public.is_org_member(organization_id)
  and (
    public.is_org_admin(organization_id)
    or assigned_to = auth.uid()
  )
)
with check (
  public.is_org_member(organization_id)
  and (
    public.is_org_admin(organization_id)
    or assigned_to = auth.uid()
  )
);

drop policy if exists comments_read on public.task_comments;
create policy comments_read on public.task_comments
for select to authenticated
using (
  exists (
    select 1
      from public.tasks t
     where t.id = task_id
       and public.is_org_member(t.organization_id)
       and (
         public.is_org_admin(t.organization_id)
         or t.assigned_to = auth.uid()
         or public.is_project_member(t.project_id)
       )
  )
);

drop policy if exists comments_insert on public.task_comments;
create policy comments_insert on public.task_comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
      from public.tasks t
     where t.id = task_id
       and public.is_org_member(t.organization_id)
       and (
         public.is_org_admin(t.organization_id)
         or t.assigned_to = auth.uid()
         or public.is_project_member(t.project_id)
       )
  )
);

drop policy if exists comments_own_manage on public.task_comments;
create policy comments_own_manage on public.task_comments
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
      from public.tasks t
     where t.id = task_id
       and public.is_org_member(t.organization_id)
       and (
         public.is_org_admin(t.organization_id)
         or t.assigned_to = auth.uid()
         or public.is_project_member(t.project_id)
       )
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
      from public.tasks t
     where t.id = task_id
       and public.is_org_member(t.organization_id)
       and (
         public.is_org_admin(t.organization_id)
         or t.assigned_to = auth.uid()
         or public.is_project_member(t.project_id)
       )
  )
);

drop policy if exists comments_own_or_admin_delete on public.task_comments;
create policy comments_own_or_admin_delete on public.task_comments
for delete to authenticated
using (
  exists (
    select 1
      from public.tasks t
     where t.id = task_id
       and public.is_org_member(t.organization_id)
       and (
         public.is_org_admin(t.organization_id)
         or t.assigned_to = auth.uid()
         or public.is_project_member(t.project_id)
       )
       and (
         user_id = auth.uid()
         or public.is_org_admin(t.organization_id)
       )
  )
);

drop policy if exists files_delete on public.project_files;
create policy files_delete on public.project_files
for delete to authenticated
using (
  public.is_org_member(organization_id)
  and (
    uploaded_by = auth.uid()
    or public.is_org_admin(organization_id)
  )
);

create or replace function public.storage_project_access(
  p_name text,
  p_write boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p text[] := storage.foldername(p_name);
  v_org uuid;
  v_project uuid;
begin
  if coalesce(array_length(p, 1), 0) < 3
     or p[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or p[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_org := p[1]::uuid;
  v_project := p[2]::uuid;

  if not public.is_org_member(v_org)
     or not exists (
       select 1
         from public.projects
        where id = v_project
          and organization_id = v_org
     ) then
    return false;
  end if;

  return public.is_org_admin(v_org)
    or public.is_project_member(v_project);
end;
$$;

revoke all on function public.storage_project_access(text, boolean)
  from public, anon;
grant execute on function public.storage_project_access(text, boolean)
  to authenticated;

drop policy if exists storage_project_files_update on storage.objects;
create policy storage_project_files_update on storage.objects
for update to authenticated
using (
  bucket_id = 'flowdesk-project-files'
  and public.storage_project_access(name)
  and (
    owner_id = auth.uid()::text
    or public.storage_path_org_admin(name)
  )
)
with check (
  bucket_id = 'flowdesk-project-files'
  and public.storage_project_access(name, true)
);

drop policy if exists storage_project_files_delete on storage.objects;
create policy storage_project_files_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'flowdesk-project-files'
  and public.storage_project_access(name)
  and (
    owner_id = auth.uid()::text
    or public.storage_path_org_admin(name)
  )
);
