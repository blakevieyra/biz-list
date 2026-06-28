-- Add marketer to user_role enum (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'marketer'
      and enumtypid = 'user_role'::regtype
  ) then
    alter type user_role add value 'marketer';
  end if;
end $$;
