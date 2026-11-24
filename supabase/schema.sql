-- =============================================================
-- Kora – kitchen cost & nutrition planner
-- Schema migration v3 (Multi-User, AI Chef Assistant, Macros)
-- v3 adds: user_profiles table, user_id foreign keys, macros (protein, carbs, fats),
--          scoped partial unique indexes, and Row-Level Security (RLS) policies.
-- =============================================================

-- 0. Extensions
-- -------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()


-- 1. user_profiles
-- -------------------------------------------------------------
create table if not exists public.user_profiles (
  id                   uuid          primary key references auth.users (id) on delete cascade,
  display_name         text,
  daily_calorie_target integer       not null default 2200 check (daily_calorie_target > 0),
  protein_target_g     integer       not null default 100 check (protein_target_g >= 0),
  carbs_target_g       integer       not null default 250 check (carbs_target_g >= 0),
  fats_target_g        integer       not null default 70 check (fats_target_g >= 0),
  micro_goals          text[]        not null default '{}',
  cookware             text[]        not null default '{"Induction Cooktop","Non-Stick Pan","Pressure Cooker"}',
  dietary_preferences  text,
  updated_at           timestamptz   not null default now()
);


-- 2. ingredients
-- -------------------------------------------------------------
create table if not exists public.ingredients (
  id                uuid          primary key default gen_random_uuid(),
  user_id           uuid          null references auth.users (id) on delete cascade,
  name              text          not null,
  unit              text          not null check (unit in ('g','ml','pcs')),
  pack_size         numeric(12,3) not null check (pack_size > 0),
  pack_cost         numeric(10,2) not null check (pack_cost >= 0),
  calories_per_unit numeric(10,4) not null default 0 check (calories_per_unit >= 0),
  protein_per_unit  numeric(10,3) not null default 0 check (protein_per_unit >= 0),
  carbs_per_unit    numeric(10,3) not null default 0 check (carbs_per_unit >= 0),
  fats_per_unit     numeric(10,3) not null default 0 check (fats_per_unit >= 0),
  weight_per_unit_g numeric(10,3) null,        -- g per piece; non-null for pcs items (egg=50, onion=80)
  stock_quantity    numeric(12,3) not null default 0, -- current pantry stock in canonical unit
  created_at        timestamptz   not null default now()
);


-- 3. recipes
-- -------------------------------------------------------------
create table if not exists public.recipes (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        null references auth.users (id) on delete cascade,
  name           text        not null,
  notes          text,
  created_at     timestamptz not null default now()
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


-- 5. day_plans
-- -------------------------------------------------------------
create table if not exists public.day_plans (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        null references auth.users (id) on delete cascade,
  day_of_week    smallint    not null check (day_of_week between 0 and 6),  -- 0 = Sun
  recipe_id      uuid        not null references public.recipes (id) on delete cascade,
  servings       numeric     not null default 1 check (servings > 0),
  sort_order     integer     not null default 0
);


-- 6. consumption_logs
-- -------------------------------------------------------------
create table if not exists public.consumption_logs (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        null references auth.users (id) on delete cascade,
  log_date           date        not null default current_date,
  ingredient_id      uuid        not null references public.ingredients (id) on delete cascade,
  quantity_consumed  numeric     not null check (quantity_consumed > 0),
  computed_cost      numeric     not null default 0 check (computed_cost >= 0),
  health_score       numeric     check (health_score between 0 and 100)
);


-- =============================================================
-- Functions
-- =============================================================

-- Atomically decrement ingredient stock (floors at 0)
create or replace function decrement_stock(p_ingredient_id uuid, p_quantity numeric)
returns void
language sql
as $$
  update public.ingredients
  set stock_quantity = greatest(0, stock_quantity - p_quantity)
  where id = p_ingredient_id;
$$;


-- =============================================================
-- Scoped Partial Unique Indexes & Performance Indexes
-- =============================================================

-- Scoped unique indexes (unique per user, and unique for global items where user_id IS NULL)
create unique index if not exists idx_ingredients_user_name on public.ingredients (user_id, lower(name)) where user_id is not null;
create unique index if not exists idx_ingredients_global_name on public.ingredients (lower(name)) where user_id is null;

create unique index if not exists idx_recipes_user_name on public.recipes (user_id, lower(name)) where user_id is not null;
create unique index if not exists idx_recipes_global_name on public.recipes (lower(name)) where user_id is null;

create unique index if not exists idx_day_plans_user_day_recipe on public.day_plans (user_id, day_of_week, recipe_id) where user_id is not null;
create unique index if not exists idx_day_plans_global_day_recipe on public.day_plans (day_of_week, recipe_id) where user_id is null;

-- Fast index lookups
create index if not exists idx_ingredients_user on public.ingredients (user_id);
create index if not exists idx_recipes_user     on public.recipes (user_id);
create index if not exists idx_day_plans_user   on public.day_plans (user_id);
create index if not exists idx_logs_user        on public.consumption_logs (user_id);

-- recipe_ingredients: fast lookup by either FK
create index if not exists idx_ri_recipe        on public.recipe_ingredients (recipe_id);
create index if not exists idx_ri_ingredient    on public.recipe_ingredients (ingredient_id);

-- day_plans: weekly view
create index if not exists idx_dp_day           on public.day_plans (day_of_week, sort_order);

-- consumption_logs: date-range queries
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
  for select to authenticated using (auth.uid() = id);
create policy "user_profiles_insert" on public.user_profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "user_profiles_update" on public.user_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "user_profiles_delete" on public.user_profiles
  for delete to authenticated using (auth.uid() = id);

-- ingredients policies
drop policy if exists "ingredients_select" on public.ingredients;
drop policy if exists "ingredients_insert" on public.ingredients;
drop policy if exists "ingredients_update" on public.ingredients;
drop policy if exists "ingredients_delete" on public.ingredients;

create policy "ingredients_select" on public.ingredients
  for select to anon, authenticated using (auth.uid() = user_id or user_id is null);
create policy "ingredients_insert" on public.ingredients
  for insert to anon, authenticated with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "ingredients_update" on public.ingredients
  for update to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null)) with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "ingredients_delete" on public.ingredients
  for delete to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null));

-- recipes policies
drop policy if exists "recipes_select" on public.recipes;
drop policy if exists "recipes_insert" on public.recipes;
drop policy if exists "recipes_update" on public.recipes;
drop policy if exists "recipes_delete" on public.recipes;

create policy "recipes_select" on public.recipes
  for select to anon, authenticated using (auth.uid() = user_id or user_id is null);
create policy "recipes_insert" on public.recipes
  for insert to anon, authenticated with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "recipes_update" on public.recipes
  for update to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null)) with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "recipes_delete" on public.recipes
  for delete to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null));

-- recipe_ingredients policies (linked to recipe ownership)
drop policy if exists "ri_select" on public.recipe_ingredients;
drop policy if exists "ri_insert" on public.recipe_ingredients;
drop policy if exists "ri_update" on public.recipe_ingredients;
drop policy if exists "ri_delete" on public.recipe_ingredients;

create policy "ri_select" on public.recipe_ingredients
  for select to anon, authenticated using (
    (select user_id from public.recipes where id = recipe_ingredients.recipe_id) is null
    or auth.uid() = (select user_id from public.recipes where id = recipe_ingredients.recipe_id)
  );
create policy "ri_insert" on public.recipe_ingredients
  for insert to anon, authenticated with check (
    auth.uid() = (select user_id from public.recipes where id = recipe_ingredients.recipe_id)
    or (auth.uid() is null and (select user_id from public.recipes where id = recipe_ingredients.recipe_id) is null)
  );
create policy "ri_update" on public.recipe_ingredients
  for update to anon, authenticated using (
    auth.uid() = (select user_id from public.recipes where id = recipe_ingredients.recipe_id)
    or (auth.uid() is null and (select user_id from public.recipes where id = recipe_ingredients.recipe_id) is null)
  ) with check (
    auth.uid() = (select user_id from public.recipes where id = recipe_ingredients.recipe_id)
    or (auth.uid() is null and (select user_id from public.recipes where id = recipe_ingredients.recipe_id) is null)
  );
create policy "ri_delete" on public.recipe_ingredients
  for delete to anon, authenticated using (
    auth.uid() = (select user_id from public.recipes where id = recipe_ingredients.recipe_id)
    or (auth.uid() is null and (select user_id from public.recipes where id = recipe_ingredients.recipe_id) is null)
  );

-- day_plans policies
drop policy if exists "dp_select" on public.day_plans;
drop policy if exists "dp_insert" on public.day_plans;
drop policy if exists "dp_update" on public.day_plans;
drop policy if exists "dp_delete" on public.day_plans;

create policy "dp_select" on public.day_plans
  for select to anon, authenticated using (auth.uid() = user_id or user_id is null);
create policy "dp_insert" on public.day_plans
  for insert to anon, authenticated with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "dp_update" on public.day_plans
  for update to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null)) with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "dp_delete" on public.day_plans
  for delete to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null));

-- consumption_logs policies
drop policy if exists "cl_select" on public.consumption_logs;
drop policy if exists "cl_insert" on public.consumption_logs;
drop policy if exists "cl_update" on public.consumption_logs;
drop policy if exists "cl_delete" on public.consumption_logs;

create policy "cl_select" on public.consumption_logs
  for select to anon, authenticated using (auth.uid() = user_id or user_id is null);
create policy "cl_insert" on public.consumption_logs
  for insert to anon, authenticated with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "cl_update" on public.consumption_logs
  for update to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null)) with check (auth.uid() = user_id or (auth.uid() is null and user_id is null));
create policy "cl_delete" on public.consumption_logs
  for delete to anon, authenticated using (auth.uid() = user_id or (auth.uid() is null and user_id is null));
