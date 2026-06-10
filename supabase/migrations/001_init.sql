-- ============================================================
-- FitTrack schema, Row Level Security, and sharing functions
-- Run this in the Supabase SQL editor (or `supabase db push`)
-- ============================================================

create extension if not exists pgcrypto;

-- Helper: the email of the currently authenticated user
create or replace function public.auth_email()
returns text
language sql stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- ------------------------------------------------------------
-- Profiles (one row per auth user, created by trigger)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Core workout tables
-- ------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Workout',
  workout_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
create index workouts_user_date_idx on public.workouts (user_id, workout_date desc);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  set_number int not null default 1,
  weight numeric(7,2) not null check (weight >= 0),
  reps int not null check (reps between 1 and 1000),
  created_at timestamptz not null default now()
);
create index sets_workout_idx on public.sets (workout_id);
create index sets_user_exercise_idx on public.sets (user_id, exercise_id);

-- ------------------------------------------------------------
-- Sharing: friend invites by email
-- status: pending -> accepted | revoked
-- ------------------------------------------------------------
create table public.friend_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  friend_email text not null,
  can_view_workouts boolean not null default true,
  can_view_records boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  unique (owner_id, friend_email)
);
create index friend_shares_email_idx on public.friend_shares (friend_email);

-- ------------------------------------------------------------
-- Sharing: password-protected public links
-- Password is stored as a bcrypt hash; raw passwords never persist.
-- ------------------------------------------------------------
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  label text not null default 'Shared link',
  password_hash text not null,
  can_view_workouts boolean not null default true,
  can_view_records boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Visibility helper: does the current user have an accepted
-- friend share from `target_owner`?
-- ------------------------------------------------------------
create or replace function public.has_friend_access(target_owner uuid, needs text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.friend_shares fs
    where fs.owner_id = target_owner
      and fs.friend_email = public.auth_email()
      and fs.status = 'accepted'
      and (
        (needs = 'workouts' and fs.can_view_workouts)
        or (needs = 'records' and fs.can_view_records)
      )
  );
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;
alter table public.friend_shares enable row level security;
alter table public.share_links enable row level security;

-- Profiles: read your own; read profiles of people who shared with you
-- (needed to show your friend's name); update your own.
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.friend_shares fs
      where fs.owner_id = profiles.id
        and fs.friend_email = public.auth_email()
        and fs.status <> 'revoked'
    )
    or exists ( -- owners can see profiles of friends they invited
      select 1 from public.friend_shares fs
      where fs.owner_id = auth.uid()
        and fs.friend_email = profiles.email
    )
  );
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Exercises: full control over your own; friends with workout access can read.
create policy "exercises_select" on public.exercises for select
  using (user_id = auth.uid() or public.has_friend_access(user_id, 'workouts')
         or public.has_friend_access(user_id, 'records'));
create policy "exercises_insert" on public.exercises for insert
  with check (user_id = auth.uid());
create policy "exercises_update" on public.exercises for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercises_delete" on public.exercises for delete
  using (user_id = auth.uid());

-- Workouts: full control over your own; accepted friends may read.
create policy "workouts_select" on public.workouts for select
  using (user_id = auth.uid() or public.has_friend_access(user_id, 'workouts'));
create policy "workouts_insert" on public.workouts for insert
  with check (user_id = auth.uid());
create policy "workouts_update" on public.workouts for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts_delete" on public.workouts for delete
  using (user_id = auth.uid());

-- Sets: same model as workouts.
create policy "sets_select" on public.sets for select
  using (user_id = auth.uid()
         or public.has_friend_access(user_id, 'workouts')
         or public.has_friend_access(user_id, 'records'));
create policy "sets_insert" on public.sets for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );
create policy "sets_update" on public.sets for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sets_delete" on public.sets for delete
  using (user_id = auth.uid());

-- Friend shares: owners manage their invites; invited friends can see
-- invites addressed to them. Accept/decline goes through respond_to_invite().
create policy "friend_shares_select" on public.friend_shares for select
  using (owner_id = auth.uid() or friend_email = public.auth_email());
create policy "friend_shares_insert" on public.friend_shares for insert
  with check (owner_id = auth.uid() and friend_email <> public.auth_email());
create policy "friend_shares_update" on public.friend_shares for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "friend_shares_delete" on public.friend_shares for delete
  using (owner_id = auth.uid());

-- Share links: owner only. The public reads exclusively through
-- the get_shared_snapshot() function below.
create policy "share_links_owner" on public.share_links for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- Friend invite acceptance (only the invited email may respond)
-- ------------------------------------------------------------
create or replace function public.respond_to_invite(invite_id uuid, accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.friend_shares
  set status = case when accept then 'accepted' else 'revoked' end
  where id = invite_id
    and friend_email = public.auth_email()
    and status = 'pending';
  if not found then
    raise exception 'Invite not found or already handled';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Password-protected share links
-- ------------------------------------------------------------
create or replace function public.create_share_link(
  p_label text,
  p_password text,
  p_can_view_workouts boolean default true,
  p_can_view_records boolean default true,
  p_expires_at timestamptz default null
)
returns table (token text)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;
  return query
  insert into public.share_links (owner_id, label, password_hash, can_view_workouts, can_view_records, expires_at)
  values (auth.uid(), coalesce(nullif(p_label, ''), 'Shared link'),
          crypt(p_password, gen_salt('bf')), p_can_view_workouts, p_can_view_records, p_expires_at)
  returning share_links.token;
end;
$$;

-- Public, password-gated read. Returns a JSON snapshot of exactly what
-- the owner allowed; never exposes the password hash or other users' data.
create or replace function public.get_shared_snapshot(p_token text, p_password text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  link public.share_links%rowtype;
  owner_name text;
  result jsonb;
begin
  select * into link from public.share_links
  where token = p_token
    and (expires_at is null or expires_at > now());

  if not found or link.password_hash <> crypt(p_password, link.password_hash) then
    -- One generic error: don't reveal whether the token or password failed
    raise exception 'Invalid link or password';
  end if;

  select display_name into owner_name from public.profiles where id = link.owner_id;

  result := jsonb_build_object('owner_name', owner_name, 'label', link.label);

  if link.can_view_workouts then
    result := result || jsonb_build_object('workouts', coalesce((
      select jsonb_agg(w order by w.workout_date desc) from (
        select wk.id, wk.title, wk.workout_date, wk.notes,
          (select coalesce(jsonb_agg(jsonb_build_object(
              'exercise', e.name, 'set_number', s.set_number,
              'weight', s.weight, 'reps', s.reps) order by s.created_at), '[]'::jsonb)
           from public.sets s join public.exercises e on e.id = s.exercise_id
           where s.workout_id = wk.id) as sets
        from public.workouts wk
        where wk.user_id = link.owner_id
        order by wk.workout_date desc
        limit 100
      ) w), '[]'::jsonb));
  end if;

  if link.can_view_records then
    result := result || jsonb_build_object('records', coalesce((
      select jsonb_agg(r) from (
        select e.name as exercise, max(s.weight) as best_weight,
               max(s.weight * (1 + s.reps / 30.0))::numeric(8,1) as est_one_rm
        from public.sets s join public.exercises e on e.id = s.exercise_id
        where s.user_id = link.owner_id
        group by e.name
        order by best_weight desc
      ) r), '[]'::jsonb));
  end if;

  return result;
end;
$$;

-- Allow anonymous visitors to call the gated reader
grant execute on function public.get_shared_snapshot(text, text) to anon, authenticated;
grant execute on function public.create_share_link(text, text, boolean, boolean, timestamptz) to authenticated;
grant execute on function public.respond_to_invite(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- Personal records view (security_invoker so RLS still applies)
-- Best set per exercise by weight, plus estimated 1RM (Epley).
-- ------------------------------------------------------------
create or replace view public.personal_records
with (security_invoker = on) as
select distinct on (s.user_id, s.exercise_id)
  s.user_id,
  s.exercise_id,
  e.name as exercise_name,
  e.muscle_group,
  s.weight as best_weight,
  s.reps as reps_at_best,
  (s.weight * (1 + s.reps / 30.0))::numeric(8,1) as est_one_rm,
  w.workout_date as achieved_on
from public.sets s
join public.exercises e on e.id = s.exercise_id
join public.workouts w on w.id = s.workout_id
order by s.user_id, s.exercise_id, s.weight desc, s.reps desc, w.workout_date desc;
