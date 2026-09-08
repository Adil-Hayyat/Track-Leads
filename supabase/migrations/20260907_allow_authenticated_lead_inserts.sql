-- Keep RLS enabled and allow lead creation for every authenticated user.
alter table public.leads enable row level security;

do $$
declare
	policy_record record;
begin
	for policy_record in
		select policyname
		from pg_policies
		where schemaname = 'public'
			and tablename = 'leads'
			and cmd = 'INSERT'
			and (roles @> array['anon']::name[] or roles @> array['public']::name[])
	loop
		execute format('drop policy if exists %I on public.leads', policy_record.policyname);
	end loop;
end
$$;

drop policy if exists "Allow authenticated lead inserts" on public.leads;
drop policy if exists "authenticated_users_can_create_leads" on public.leads;

create policy "authenticated_users_can_create_leads"
on public.leads
for insert
to authenticated
with check (true);
