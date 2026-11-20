-- =============================================================
-- Kora – kitchen cost & nutrition planner
-- Schema migration v1 (personal single-user)
-- =============================================================

-- 0. Extensions
-- -------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()


-- 1. ingredients
-- -------------------------------------------------------------
create table ingredients (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null unique,
  unit           text        not null,            -- e.g. 'g', 'ml', 'pcs'
  pack_size      numeric     not null check (pack_size > 0),
  pack_cost      numeric     not null check (pack_cost >= 0),
  calories_per_unit numeric  not null default 0 check (calories_per_unit >= 0),
  created_at     timestamptz not null default now()
);


-- 2. recipes
-- -------------------------------------------------------------
create table recipes (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null unique,
  notes          text,
  created_at     timestamptz not null default now()
);


-- 3. recipe_ingredients  (junction)
-- -------------------------------------------------------------
create table recipe_ingredients (
  id             uuid        primary key default gen_random_uuid(),
  recipe_id      uuid        not null references recipes (id)      on delete cascade,
  ingredient_id  uuid        not null references ingredients (id)   on delete cascade,
  quantity_used  numeric     not null check (quantity_used > 0),

  unique (recipe_id, ingredient_id)
);


-- 4. day_plans
-- -------------------------------------------------------------
create table day_plans (
  id             uuid        primary key default gen_random_uuid(),
  day_of_week    smallint    not null check (day_of_week between 0 and 6),  -- 0 = Sun
  recipe_id      uuid        not null references recipes (id)      on delete cascade,
  servings       numeric     not null default 1 check (servings > 0),
  sort_order     integer     not null default 0,

  unique (day_of_week, recipe_id)
);


-- 5. consumption_logs
-- -------------------------------------------------------------
create table consumption_logs (
  id                 uuid        primary key default gen_random_uuid(),
  log_date           date        not null default current_date,
  ingredient_id      uuid        not null references ingredients (id) on delete cascade,
  quantity_consumed  numeric     not null check (quantity_consumed > 0),
  computed_cost      numeric     not null default 0 check (computed_cost >= 0),
  health_score       numeric              check (health_score between 0 and 100)
);


-- =============================================================
-- Indexes
-- =============================================================

-- recipe_ingredients: fast lookup by either FK
create index idx_ri_recipe     on recipe_ingredients (recipe_id);
create index idx_ri_ingredient on recipe_ingredients (ingredient_id);

-- day_plans: weekly view
create index idx_dp_day        on day_plans (day_of_week, sort_order);

-- consumption_logs: date-range queries
create index idx_cl_date       on consumption_logs (log_date);
create index idx_cl_ingredient on consumption_logs (ingredient_id);


-- =============================================================
-- Row-Level Security  (permissive – v1 personal use)
-- =============================================================
-- Every table is open to anon and authenticated users (no Supabase Auth login in v1).
-- Tighten with user_id columns when multi-tenancy is needed.

alter table ingredients        enable row level security;
alter table recipes            enable row level security;
alter table recipe_ingredients enable row level security;
alter table day_plans          enable row level security;
alter table consumption_logs   enable row level security;

-- ingredients
create policy "ingredients_select" on ingredients for select to anon, authenticated using (true);
create policy "ingredients_insert" on ingredients for insert to anon, authenticated with check (true);
create policy "ingredients_update" on ingredients for update to anon, authenticated using (true) with check (true);
create policy "ingredients_delete" on ingredients for delete to anon, authenticated using (true);

-- recipes
create policy "recipes_select" on recipes for select to anon, authenticated using (true);
create policy "recipes_insert" on recipes for insert to anon, authenticated with check (true);
create policy "recipes_update" on recipes for update to anon, authenticated using (true) with check (true);
create policy "recipes_delete" on recipes for delete to anon, authenticated using (true);

-- recipe_ingredients
create policy "ri_select" on recipe_ingredients for select to anon, authenticated using (true);
create policy "ri_insert" on recipe_ingredients for insert to anon, authenticated with check (true);
create policy "ri_update" on recipe_ingredients for update to anon, authenticated using (true) with check (true);
create policy "ri_delete" on recipe_ingredients for delete to anon, authenticated using (true);

-- day_plans
create policy "dp_select" on day_plans for select to anon, authenticated using (true);
create policy "dp_insert" on day_plans for insert to anon, authenticated with check (true);
create policy "dp_update" on day_plans for update to anon, authenticated using (true) with check (true);
create policy "dp_delete" on day_plans for delete to anon, authenticated using (true);

-- consumption_logs
create policy "cl_select" on consumption_logs for select to anon, authenticated using (true);
create policy "cl_insert" on consumption_logs for insert to anon, authenticated with check (true);
create policy "cl_update" on consumption_logs for update to anon, authenticated using (true) with check (true);
create policy "cl_delete" on consumption_logs for delete to anon, authenticated using (true);
