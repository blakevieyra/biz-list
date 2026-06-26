-- Add missing RLS DELETE policies for content tables

create policy "Post author or business owner can delete"
  on public.business_posts for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.businesses b
      where b.id = business_posts.business_id and b.owner_id = auth.uid()
    )
  );

create policy "Comment author can delete"
  on public.business_post_comments for delete
  using (auth.uid() = author_id);

create policy "Collaboration author can delete"
  on public.collaborations for delete
  using (auth.uid() = author_id);

create policy "Collaboration comment author can delete"
  on public.collaboration_comments for delete
  using (auth.uid() = author_id);

create policy "Forum post author can delete"
  on public.forum_posts for delete
  using (auth.uid() = author_id);

create policy "Forum comment author can delete"
  on public.forum_comments for delete
  using (auth.uid() = author_id);
