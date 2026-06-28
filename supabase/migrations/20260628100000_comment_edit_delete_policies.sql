-- Allow users to edit their own comments (UPDATE policies)
-- and fix missing DELETE policy for event_comments

do $$ begin
  create policy "Authors can edit own business post comments"
    on public.business_post_comments for update
    using (auth.uid() = author_id)
    with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authors can edit own event comments"
    on public.event_comments for update
    using (auth.uid() = author_id)
    with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Event comment author can delete"
    on public.event_comments for delete
    using (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authors can edit own forum comments"
    on public.forum_comments for update
    using (auth.uid() = author_id)
    with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Authors can edit own collaboration comments"
    on public.collaboration_comments for update
    using (auth.uid() = author_id)
    with check (auth.uid() = author_id);
exception when duplicate_object then null; end $$;
