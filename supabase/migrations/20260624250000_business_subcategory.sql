-- Specific business subcategories under parent industry categories.

alter table public.businesses
  add column if not exists subcategory text not null default '';

create index if not exists idx_businesses_category_sub on public.businesses (category, subcategory);
