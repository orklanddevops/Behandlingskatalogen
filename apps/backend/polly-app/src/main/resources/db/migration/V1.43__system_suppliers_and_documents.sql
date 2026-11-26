-- Copy each main agreement to every system linked to its treatment. Keep agreements
-- on treatments without a known system so that no document is lost.
CREATE TEMP TABLE main_agreement_moves ON COMMIT DROP AS
SELECT p.process_id, c.code AS system_code, docs.document
FROM process p
CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(NULLIF(p.data #> '{qualitySystemLinks,documents}', 'null'::jsonb), '[]'::jsonb)
    || CASE WHEN NULLIF(btrim(p.data #>> '{qualitySystemLinks,mainAgreement}'), '') IS NOT NULL
       THEN jsonb_build_array(jsonb_build_object('type', 'HOVEDAVTALE', 'name', 'Hovedavtale',
            'url', btrim(p.data #>> '{qualitySystemLinks,mainAgreement}')))
       ELSE '[]'::jsonb END
) AS docs(document)
JOIN codelist c ON c.list_name = 'SYSTEM'
    AND jsonb_exists(p.data #> '{affiliation,products}', c.code)
WHERE docs.document ->> 'type' = 'HOVEDAVTALE';

-- Match UUID.nameUUIDFromBytes("system-information:" + code) used by the service.
WITH system_documents AS (
    SELECT system_code, jsonb_agg(DISTINCT document) AS documents,
           md5('system-information:' || system_code) AS hash
    FROM main_agreement_moves GROUP BY system_code
)
INSERT INTO system_information (id, system_code, version, data, created_by, created_date, last_modified_by, last_modified_date)
SELECT (substr(hash, 1, 12) || '3' || substr(hash, 14, 3)
        || substr('89ab', (('x' || substr(hash, 17, 1))::bit(4)::int % 4) + 1, 1)
        || substr(hash, 18))::uuid,
       system_code, 0,
       jsonb_build_object('administrators', '[]'::jsonb, 'superUsers', '[]'::jsonb,
                          'supplierIds', '[]'::jsonb, 'documents', documents),
       'Migration', now(), 'Migration', now()
FROM system_documents
ON CONFLICT (system_code) DO UPDATE
SET data = jsonb_set(system_information.data, '{documents}',
        (SELECT jsonb_agg(DISTINCT document)
         FROM jsonb_array_elements(
            COALESCE(NULLIF(system_information.data -> 'documents', 'null'::jsonb), '[]'::jsonb)
            || (EXCLUDED.data -> 'documents')) AS entries(document))),
    version = system_information.version + 1,
    last_modified_by = 'Migration', last_modified_date = now();

UPDATE process p
SET data = jsonb_set(p.data #- '{qualitySystemLinks,mainAgreement}', '{qualitySystemLinks,documents}',
    COALESCE((SELECT jsonb_agg(document ORDER BY position)
        FROM jsonb_array_elements(
            COALESCE(NULLIF(p.data #> '{qualitySystemLinks,documents}', 'null'::jsonb), '[]'::jsonb)
        ) WITH ORDINALITY AS entries(document, position)
        WHERE document ->> 'type' IS DISTINCT FROM 'HOVEDAVTALE'), '[]'::jsonb)),
    last_modified_by = 'Migration', last_modified_date = now()
WHERE EXISTS (SELECT 1 FROM main_agreement_moves m WHERE m.process_id = p.process_id);
