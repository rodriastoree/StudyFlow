create table public.study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('task', 'material')),
  title text not null check (char_length(title) between 1 and 160),
  subject text not null check (char_length(subject) between 1 and 100),
  status text not null check (status in ('pending', 'completed', 'to-summarize', 'summarized', 'printed')),
  printed_at timestamptz,
  archived_manually boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_items_user_id_created_at_idx on public.study_items (user_id, created_at desc);

alter table public.study_items enable row level security;

create policy "Users can view their own study items"
on public.study_items for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their own study items"
on public.study_items for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own study items"
on public.study_items for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own study items"
on public.study_items for delete to authenticated
using (auth.uid() = user_id);
