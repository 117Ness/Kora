-- =============================================================
-- Kora – kitchen cost & nutrition planner
-- Schema migration v4 (Strict Multi-User RLS, Auto-Provisioning, Indian Units)
-- =============================================================

-- 0. Extensions
-- -------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()


-- 1. user_profiles
-- -------------------------------------------------------------
create table if not exists public.user_profiles (
  id                   uuid          primary key references auth.users (id) on delete cascade,
  display_name         text,
  daily_calorie_target integer       not null default 2800 check (daily_calorie_target > 0),
  protein_target_g     integer       not null default 120 check (protein_target_g >= 0),
  carbs_target_g       integer       not null default 350 check (carbs_target_g >= 0),
  fats_target_g        integer       not null default 85 check (fats_target_g >= 0),
  micro_goals          text[]        not null default '{"High Fiber","Iron Rich"}',
  cookware             text[]        not null default '{"Induction Cooktop","Non-Stick Pan","Pressure Cooker"}',
  dietary_preferences  text,
  updated_at           timestamptz   not null default now()
);


-- 2. ingredients
-- -------------------------------------------------------------
create table if not exists public.ingredients (
  id                uuid          primary key default gen_random_uuid(),
  user_id           uuid          null references auth.users (id) on delete cascade,
  is_public         boolean       not null default false,
  name              text          not null,
  unit              text          not null check (unit in ('g','ml','pcs')),
  pack_size         numeric(12,3) not null check (pack_size > 0),
  pack_cost         numeric(10,2) not null check (pack_cost >= 0),
  calories_per_unit numeric(10,4) not null default 0 check (calories_per_unit >= 0),
  protein_per_unit  numeric(10,3) not null default 0 check (protein_per_unit >= 0),
  carbs_per_unit    numeric(10,3) not null default 0 check (carbs_per_unit >= 0),
  fats_per_unit     numeric(10,3) not null default 0 check (fats_per_unit >= 0),
  weight_per_unit_g numeric(10,3) null,        -- g per piece; non-null for pcs items (egg=50, onion=80)
  stock_quantity    numeric(12,3) not null default 0 check (stock_quantity >= 0),
  created_at        timestamptz   not null default now(),
  constraint ingredients_public_only_global check (is_public = false or user_id is null)
);


-- 3. recipes
-- -------------------------------------------------------------
create table if not exists public.recipes (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        null references auth.users (id) on delete cascade,
  is_public      boolean     not null default false,
  name           text        not null,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint recipes_public_only_global check (is_public = false or user_id is null)
);


-- 4. recipe_ingredients  (junction)
-- -------------------------------------------------------------
create table if not exists public.recipe_ingredients (
  id             uuid        primary key default gen_random_uuid(),
  recipe_id      uuid        not null references public.recipes (id) on delete cascade,
  ingredient_id  uuid        not null references public.ingredients (id) on delete cascade,
  quantity_used  numeric     not null check (quantity_used > 0),

  unique (recipe_id, ingredient_id)
);


-- 5. day_plans (strictly user-owned)
-- -------------------------------------------------------------
create table if not exists public.day_plans (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  day_of_week    smallint    not null check (day_of_week between 0 and 6),  -- 0 = Sun
  recipe_id      uuid        not null references public.recipes (id) on delete cascade,
  servings       numeric     not null default 1 check (servings > 0),
  sort_order     integer     not null default 0
);


-- 6. consumption_logs (strictly user-owned)
-- -------------------------------------------------------------
create table if not exists public.consumption_logs (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  log_date           date        not null default current_date,
  ingredient_id      uuid        not null references public.ingredients (id) on delete cascade,
  quantity_consumed  numeric     not null check (quantity_consumed > 0),
  computed_cost      numeric     not null default 0 check (computed_cost >= 0),
  health_score       numeric     check (health_score between 0 and 100)
);


-- =============================================================
-- Functions & Triggers
-- =============================================================

-- Auto-create user_profiles row on new auth.users signup (2800 kcal, 120g protein, flat cookware)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (
    id,
    display_name,
    daily_calorie_target,
    protein_target_g,
    carbs_target_g,
    fats_target_g,
    micro_goals,
    cookware
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Kora Chef'
    ),
    2800,
    120,
    350,
    85,
    array['High Fiber', 'Iron Rich']::text[],
    array['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker']::text[]
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- Atomically decrement caller-owned ingredient stock (floors at 0)
create or replace function public.decrement_stock(p_ingredient_id uuid, p_quantity numeric)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'p_quantity must be greater than 0';
  end if;

  update public.ingredients
  set stock_quantity = greatest(0, stock_quantity - p_quantity)
  where id = p_ingredient_id
    and user_id = (select auth.uid());
end;
$$;

revoke all on function public.decrement_stock(uuid, numeric) from public;
grant execute on function public.decrement_stock(uuid, numeric) to authenticated;


-- =============================================================
-- Scoped Partial Unique Indexes & Performance Indexes
-- =============================================================

create unique index if not exists idx_ingredients_user_name on public.ingredients (user_id, lower(name)) where user_id is not null;
create unique index if not exists idx_ingredients_global_name on public.ingredients (lower(name)) where user_id is null;
create index if not exists idx_ingredients_public on public.ingredients (is_public) where user_id is null and is_public = true;

create unique index if not exists idx_recipes_user_name on public.recipes (user_id, lower(name)) where user_id is not null;
create unique index if not exists idx_recipes_global_name on public.recipes (lower(name)) where user_id is null;
create index if not exists idx_recipes_public on public.recipes (is_public) where user_id is null and is_public = true;

create unique index if not exists idx_day_plans_user_day_recipe on public.day_plans (user_id, day_of_week, recipe_id);

create index if not exists idx_ingredients_user on public.ingredients (user_id);
create index if not exists idx_recipes_user     on public.recipes (user_id);
create index if not exists idx_day_plans_user   on public.day_plans (user_id);
create index if not exists idx_logs_user        on public.consumption_logs (user_id);

create index if not exists idx_ri_recipe        on public.recipe_ingredients (recipe_id);
create index if not exists idx_ri_ingredient    on public.recipe_ingredients (ingredient_id);
create index if not exists idx_dp_day           on public.day_plans (day_of_week, sort_order);
create index if not exists idx_cl_date          on public.consumption_logs (log_date);
create index if not exists idx_cl_ingredient    on public.consumption_logs (ingredient_id);


-- =============================================================
-- Row Level Security (RLS)
-- =============================================================

alter table public.user_profiles enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.day_plans enable row level security;
alter table public.consumption_logs enable row level security;

-- user_profiles policies
drop policy if exists "user_profiles_select" on public.user_profiles;
drop policy if exists "user_profiles_insert" on public.user_profiles;
drop policy if exists "user_profiles_update" on public.user_profiles;
drop policy if exists "user_profiles_delete" on public.user_profiles;

create policy "user_profiles_select" on public.user_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "user_profiles_insert" on public.user_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "user_profiles_update" on public.user_profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "user_profiles_delete" on public.user_profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- ingredients policies (starter templates only readable if explicitly marked is_public=true)
drop policy if exists "ingredients_select" on public.ingredients;
drop policy if exists "ingredients_insert" on public.ingredients;
drop policy if exists "ingredients_update" on public.ingredients;
drop policy if exists "ingredients_delete" on public.ingredients;

create policy "ingredients_select" on public.ingredients
  for select to anon, authenticated using (
    (select auth.uid()) = user_id
    or (user_id is null and is_public = true)
  );
create policy "ingredients_insert" on public.ingredients
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and is_public = false
  );
create policy "ingredients_update" on public.ingredients
  for update to authenticated using (
    (select auth.uid()) = user_id
  ) with check (
    (select auth.uid()) = user_id
    and is_public = false
  );
create policy "ingredients_delete" on public.ingredients
  for delete to authenticated using (
    (select auth.uid()) = user_id
  );

-- recipes policies (starter templates only readable if explicitly marked is_public=true)
drop policy if exists "recipes_select" on public.recipes;
drop policy if exists "recipes_insert" on public.recipes;
drop policy if exists "recipes_update" on public.recipes;
drop policy if exists "recipes_delete" on public.recipes;

create policy "recipes_select" on public.recipes
  for select to anon, authenticated using (
    (select auth.uid()) = user_id
    or (user_id is null and is_public = true)
  );
create policy "recipes_insert" on public.recipes
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and is_public = false
  );
create policy "recipes_update" on public.recipes
  for update to authenticated using (
    (select auth.uid()) = user_id
  ) with check (
    (select auth.uid()) = user_id
    and is_public = false
  );
create policy "recipes_delete" on public.recipes
  for delete to authenticated using (
    (select auth.uid()) = user_id
  );

-- recipe_ingredients policies
drop policy if exists "ri_select" on public.recipe_ingredients;
drop policy if exists "ri_insert" on public.recipe_ingredients;
drop policy if exists "ri_update" on public.recipe_ingredients;
drop policy if exists "ri_delete" on public.recipe_ingredients;

create policy "ri_select" on public.recipe_ingredients
  for select to anon, authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (
          r.user_id = (select auth.uid())
          or (r.user_id is null and r.is_public = true)
        )
    )
  );
create policy "ri_insert" on public.recipe_ingredients
  for insert to authenticated with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.ingredients i
      where i.id = recipe_ingredients.ingredient_id
        and (
          i.user_id = (select auth.uid())
          or (i.user_id is null and i.is_public = true)
        )
    )
  );
create policy "ri_update" on public.recipe_ingredients
  for update to authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.ingredients i
      where i.id = recipe_ingredients.ingredient_id
        and (
          i.user_id = (select auth.uid())
          or (i.user_id is null and i.is_public = true)
        )
    )
  );
create policy "ri_delete" on public.recipe_ingredients
  for delete to authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = (select auth.uid())
    )
  );

-- day_plans policies (strictly authenticated owner)
drop policy if exists "dp_select" on public.day_plans;
drop policy if exists "dp_insert" on public.day_plans;
drop policy if exists "dp_update" on public.day_plans;
drop policy if exists "dp_delete" on public.day_plans;

create policy "dp_select" on public.day_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dp_insert" on public.day_plans
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.recipes r
      where r.id = day_plans.recipe_id
        and (
          r.user_id = (select auth.uid())
          or (r.user_id is null and r.is_public = true)
        )
    )
  );
create policy "dp_update" on public.day_plans
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.recipes r
      where r.id = day_plans.recipe_id
        and (
          r.user_id = (select auth.uid())
          or (r.user_id is null and r.is_public = true)
        )
    )
  );
create policy "dp_delete" on public.day_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- consumption_logs policies (strictly authenticated owner)
drop policy if exists "cl_select" on public.consumption_logs;
drop policy if exists "cl_insert" on public.consumption_logs;
drop policy if exists "cl_update" on public.consumption_logs;
drop policy if exists "cl_delete" on public.consumption_logs;

create policy "cl_select" on public.consumption_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cl_insert" on public.consumption_logs
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ingredients i
      where i.id = consumption_logs.ingredient_id
        and (
          i.user_id = (select auth.uid())
          or (i.user_id is null and i.is_public = true)
        )
    )
  );
create policy "cl_update" on public.consumption_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ingredients i
      where i.id = consumption_logs.ingredient_id
        and (
          i.user_id = (select auth.uid())
          or (i.user_id is null and i.is_public = true)
        )
    )
  );
create policy "cl_delete" on public.consumption_logs
  for delete to authenticated using ((select auth.uid()) = user_id);
