-- Tags in references: ersten Buchstaben groß, Rest klein; Duplikate (case-insensitiv) entfernen

UPDATE public.references r
SET tags = NULL
WHERE tags IS NULL OR btrim(tags) = '';

UPDATE public.references r
SET tags = sub.norm_tags
FROM (
  SELECT
    id,
    CASE
      WHEN array_length(tag_array, 1) IS NULL THEN NULL
      ELSE array_to_string(tag_array, ' ')
    END AS norm_tags
  FROM (
    SELECT
      id,
      (
        SELECT array_agg(initcap(lower(t)) ORDER BY initcap(lower(t)))
        FROM (
          SELECT DISTINCT lower(trim(t)) AS t
          FROM unnest(regexp_split_to_array(coalesce(tags, ''), '[,\\s]+')) AS t
          WHERE trim(t) <> ''
        ) s
      ) AS tag_array
    FROM public.references
  ) x
) sub
WHERE r.id = sub.id;

