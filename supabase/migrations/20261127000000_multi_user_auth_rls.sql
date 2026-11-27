-- =============================================================
-- Kora – Multi-User Auth, Auto-Provisioning & Strict RLS
-- =============================================================

-- 1. Update user_profiles defaults for flat-living Indian kitchen targets (2800 kcal, 120g protein)
alter table public.user_profiles
  alter column daily_calorie_target set default 2800,
  alter column protein_target_g set default 120,
  alter column carbs_target_g set default 350,
  alter column fats_target_g set default 85,
  alter column micro_goals set default '{"High Fiber","Iron Rich"}'::text[],
  alter column cookware set default '{"Induction Cooktop","Non-Stick Pan","Pressure Cooker"}'::text[];

-- 2. Explicit public starter template marking & stock non-negative check
alter table public.ingredients
  add column if not exists is_public boolean not null default false;

alter table public.ingredients
  drop constraint if exists ingredients_public_only_global,
  add constraint ingredients_public_only_global check (is_public = false or user_id is null);

alter table public.ingredients
  drop constraint if exists ingredients_stock_non_negative,
  add constraint ingredients_stock_non_negative check (stock_quantity >= 0);

alter table public.recipes
  add column if not exists is_public boolean not null default false;

alter table public.recipes
  drop constraint if exists recipes_public_only_global,
  add constraint recipes_public_only_global check (is_public = false or user_id is null);

create index if not exists idx_ingredients_public on public.ingredients (is_public) where user_id is null and is_public = true;
create index if not exists idx_recipes_public on public.recipes (is_public) where user_id is null and is_public = true;

-- 3. Enforce strict ownership on personal schedule and consumption ledger tables
delete from public.day_plans where user_id is null;
delete from public.consumption_logs where user_id is null;

alter table public.day_plans
  alter column user_id set not null,
  alter column user_id set default auth.uid();

alter table public.consumption_logs
  alter column user_id set not null,
  alter column user_id set default auth.uid();

-- 4. Auto-provisioning trigger on auth.users -> public.user_profiles
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
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Kora Chef'
  ),
  2800,
  120,
  350,
  85,
  array['High Fiber', 'Iron Rich']::text[],
  array['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker']::text[]
from auth.users u
where not exists (
  select 1 from public.user_profiles p where p.id = u.id
)
on conflict (id) do nothing;

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

-- 5. Harden decrement_stock RPC
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

-- 6. Strict Multi-User Row-Level Security (RLS) Policies
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
