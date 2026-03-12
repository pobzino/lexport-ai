create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_request_id uuid not null references public.review_requests(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  author_type text not null check (author_type = any (array['owner'::text, 'reviewer'::text])),
  author_name text not null,
  author_email text,
  content text not null,
  clause_id text,
  resolved boolean default false,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  selected_text text
);

create index if not exists idx_review_comments_review_request_id
  on public.review_comments (review_request_id);

create index if not exists idx_review_comments_contract_id
  on public.review_comments (contract_id);

create index if not exists idx_review_comments_clause_id
  on public.review_comments (clause_id);

alter table public.review_comments enable row level security;

drop policy if exists "Anyone can view comments" on public.review_comments;
create policy "Anyone can view comments"
  on public.review_comments
  for select
  using (true);

drop policy if exists "Reviewers can add comments" on public.review_comments;
create policy "Reviewers can add comments"
  on public.review_comments
  for insert
  with check (
    exists (
      select 1
      from public.review_requests
      where review_requests.id = review_comments.review_request_id
        and review_requests.status = any (array['pending'::text, 'viewed'::text])
    )
  );

drop policy if exists "Users can manage comments on their contracts" on public.review_comments;
create policy "Users can manage comments on their contracts"
  on public.review_comments
  for all
  using (
    exists (
      select 1
      from public.contracts
      where contracts.id = review_comments.contract_id
        and contracts.user_id = auth.uid()
    )
  );
