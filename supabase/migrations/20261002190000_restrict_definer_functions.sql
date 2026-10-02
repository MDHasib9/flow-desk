create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
    into v_invitation
    from public.invitations
   where token = p_token
     and accepted_at is null
     and expires_at > now()
   for update;

  if not found then
    raise exception 'Invitation is invalid or expired';
  end if;

  if lower((select email from auth.users where id = auth.uid()))
     <> lower(v_invitation.email::text) then
    raise exception 'Invitation email does not match authenticated user';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, auth.uid(), v_invitation.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations
     set accepted_at = now()
   where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;

revoke all on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

revoke all on function public.log_activity(uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.log_activity(uuid, text, text, uuid, jsonb)
  to service_role;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_admin(uuid) from public, anon;
revoke all on function public.is_org_owner(uuid) from public, anon;
revoke all on function public.is_project_member(uuid) from public, anon;
revoke all on function public.shares_organization_with(uuid) from public, anon;
revoke all on function public.storage_project_access(text, boolean)
  from public, anon;
revoke all on function public.storage_path_org_admin(text) from public, anon;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.shares_organization_with(uuid) to authenticated;
grant execute on function public.storage_project_access(text, boolean)
  to authenticated;
grant execute on function public.storage_path_org_admin(text) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.add_organization_creator()
  from public, anon, authenticated;
revoke all on function public.validate_project_member()
  from public, anon, authenticated;
revoke all on function public.validate_task_assignee()
  from public, anon, authenticated;
revoke all on function public.restrict_member_task_update()
  from public, anon, authenticated;
revoke all on function public.protect_organization_owner()
  from public, anon, authenticated;
