-- =====================================================
-- Public document tokens for QR sharing
-- Date: 2025-12-21
-- Description: Add public_token + public_expires_at for invoices and quotes,
--              and create RPC to fetch a document by token without auth.
-- =====================================================

-- Add columns (Invoices)
alter table public.invoices
  add column if not exists public_token text,
  add column if not exists public_expires_at timestamptz;

update public.invoices
set
  public_token = coalesce(public_token, encode(gen_random_bytes(16), 'hex')),
  public_expires_at = coalesce(public_expires_at, now() + interval '10 days')
where public_token is null or public_expires_at is null;

create unique index if not exists invoices_public_token_uidx
  on public.invoices(public_token);

create index if not exists invoices_public_expires_idx
  on public.invoices(public_expires_at);

-- Add columns (Quotes)
alter table public.quotes
  add column if not exists public_token text,
  add column if not exists public_expires_at timestamptz;

update public.quotes
set
  public_token = coalesce(public_token, encode(gen_random_bytes(16), 'hex')),
  public_expires_at = coalesce(public_expires_at, now() + interval '10 days')
where public_token is null or public_expires_at is null;

create unique index if not exists quotes_public_token_uidx
  on public.quotes(public_token);

create index if not exists quotes_public_expires_idx
  on public.quotes(public_expires_at);

-- Set defaults for new rows
alter table public.invoices
  alter column public_token set default encode(gen_random_bytes(16), 'hex');

alter table public.invoices
  alter column public_expires_at set default (now() + interval '10 days');

alter table public.quotes
  alter column public_token set default encode(gen_random_bytes(16), 'hex');

alter table public.quotes
  alter column public_expires_at set default (now() + interval '10 days');

-- Public RPC (security definer) - returns header + lines
-- Note: executed as migration owner (postgres) so it can bypass RLS.
create or replace function public.get_public_document_by_token(doc_type text, doc_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if doc_type is null or doc_token is null then
    return null;
  end if;

  if lower(trim(doc_type)) = 'invoice' then
    select jsonb_build_object(
      'type', 'invoice',
      'header', to_jsonb(inv),
      'lines', coalesce(
        (select jsonb_agg(to_jsonb(l)) from public.invoice_lines l where l.invoice_id = inv.id),
        '[]'::jsonb
      )
    )
    into result
    from public.invoices inv
    where inv.public_token = doc_token
      and inv.public_expires_at > now()
    limit 1;

    return result;
  end if;

  if lower(trim(doc_type)) = 'quote' then
    select jsonb_build_object(
      'type', 'quote',
      'header', to_jsonb(q),
      'lines', coalesce(
        (select jsonb_agg(to_jsonb(l)) from public.quote_lines l where l.quote_id = q.id),
        '[]'::jsonb
      )
    )
    into result
    from public.quotes q
    where q.public_token = doc_token
      and q.public_expires_at > now()
    limit 1;

    return result;
  end if;

  return null;
end;
$$;

grant execute on function public.get_public_document_by_token(text, text) to anon;
grant execute on function public.get_public_document_by_token(text, text) to authenticated;
