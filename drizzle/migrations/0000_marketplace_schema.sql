create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New member',
  trade text,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  owner_name text not null default 'Homeowner',
  title text not null,
  category text not null,
  description text not null,
  location text not null,
  desired_date date not null,
  image_url text,
  status text not null default 'open',
  accepted_bid_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "Projects are viewable by everyone" on public.projects for select using (true);
create policy "Owners create projects" on public.projects for insert to authenticated with check (auth.uid() = owner_id);
create policy "Owners update projects" on public.projects for update to authenticated using (auth.uid() = owner_id);
create policy "Owners delete projects" on public.projects for delete to authenticated using (auth.uid() = owner_id);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contractor_id uuid not null,
  contractor_name text not null,
  trade text,
  amount numeric(10,2) not null check (amount > 0),
  message text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.bids to anon, authenticated;
grant insert, delete on public.bids to authenticated;
grant all on public.bids to service_role;
alter table public.bids enable row level security;
create policy "Bids are viewable by everyone" on public.bids for select using (true);
create policy "Contractors bid on others' open projects" on public.bids for insert to authenticated
  with check (auth.uid() = contractor_id and exists (select 1 from public.projects p where p.id = project_id and p.owner_id <> auth.uid() and p.status = 'open'));
create policy "Contractors withdraw own bids" on public.bids for delete to authenticated using (auth.uid() = contractor_id);

insert into public.projects (id, owner_id, owner_name, title, category, description, location, desired_date, image_url) values
('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000001','Alexis B.','Paint small room, 9×9×9 ft','Painting','Walls and ceiling in matte eggshell. Ceiling plain white; walls need a fresh coat of warm beige. Small closet included. I have the paint — I need a pro to prep, tape, and roll.','Portland, OR','2026-10-24','/images/room.jpg'),
('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000002','Jordan P.','Replace kitchen sink & faucet','Plumbing','Old chrome faucet drips and the sink is chipped. Looking to swap both for a new stainless undermount sink and pull-down faucet (I''ll buy fixtures).','Portland, OR','2026-11-02','/images/sink.jpg'),
('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000003','Sam R.','Build 40-ft cedar privacy fence','Carpentry','Replace weathered fence along the back of the yard with a 6-ft cedar privacy fence, about 40 linear feet, one gate.','Beaverton, OR','2026-11-10','/images/fence.jpg');

insert into public.bids (project_id, contractor_id, contractor_name, trade, amount, message) values
('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','Marcus Cole','Painting',150,'I can prep and roll this in one day, tidy finish.'),
('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a2','Rosa Tan','Painting',200,'Two coats plus trim, I''ll bring drop cloths and tape.'),
('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a3','Dale Kim','Plumbing',340,'Can do it in an afternoon, includes haul-away of the old sink.'),
('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-0000000000a4','Hector Ruiz','Carpentry',2800,'Cedar pickets, pressure-treated posts set in concrete, gate included.');