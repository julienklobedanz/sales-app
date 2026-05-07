-- Normalize existing reference narrative texts:
-- - remove manual line breaks
-- - collapse excessive whitespace
-- - remove directly duplicated sentences

begin;

update public.references
set
  summary = nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(summary, ''), E'[\\r\\n]+', ' ', 'g'),
          E'\\s{2,}',
          ' ',
          'g'
        ),
        E'([^.!?]{8,220}[.!?])\\s+\\1',
        E'\\1',
        'gi'
      )
    ),
    ''
  ),
  customer_challenge = nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(customer_challenge, ''), E'[\\r\\n]+', ' ', 'g'),
          E'\\s{2,}',
          ' ',
          'g'
        ),
        E'([^.!?]{8,220}[.!?])\\s+\\1',
        E'\\1',
        'gi'
      )
    ),
    ''
  ),
  our_solution = nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(our_solution, ''), E'[\\r\\n]+', ' ', 'g'),
          E'\\s{2,}',
          ' ',
          'g'
        ),
        E'([^.!?]{8,220}[.!?])\\s+\\1',
        E'\\1',
        'gi'
      )
    ),
    ''
  ),
  updated_at = now()
where
  summary is not null
  or customer_challenge is not null
  or our_solution is not null;

commit;

