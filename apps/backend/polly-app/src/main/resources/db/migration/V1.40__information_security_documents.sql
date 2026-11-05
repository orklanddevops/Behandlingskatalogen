INSERT INTO CODELIST (LIST_NAME, CODE, SHORT_NAME, DESCRIPTION, CREATED_BY, CREATED_DATE, LAST_MODIFIED_BY, LAST_MODIFIED_DATE)
VALUES
('INFORMASJONSIKKERHET_CATEGORY', 'DATABEHANDLERAVTALE', 'Databehandleravtale', 'Databehandleravtale', 'Migration', now(), 'Migration', now()),
('INFORMASJONSIKKERHET_CATEGORY', 'DPIA', 'DPIA', 'Personvernkonsekvensvurdering', 'Migration', now(), 'Migration', now()),
('INFORMASJONSIKKERHET_CATEGORY', 'INITIELL_DPIA', 'Initiell DPIA', 'Initiell personvernkonsekvensvurdering', 'Migration', now(), 'Migration', now()),
('INFORMASJONSIKKERHET_CATEGORY', 'ROS', 'ROS', 'Risiko- og sårbarhetsanalyse', 'Migration', now(), 'Migration', now()),
('INFORMASJONSIKKERHET_CATEGORY', 'HOVEDAVTALE', 'Hovedavtale', 'Hovedavtale', 'Migration', now(), 'Migration', now()),
('INFORMASJONSIKKERHET_CATEGORY', 'ANNEN_AVTALE', 'Annen avtale', 'Annen avtale', 'Migration', now(), 'Migration', now());

UPDATE PROCESS p
SET DATA = jsonb_set(p.DATA, '{qualitySystemLinks}', jsonb_build_object('documents',
    COALESCE(NULLIF(p.DATA #> '{qualitySystemLinks,documents}', 'null'::jsonb), '[]'::jsonb) ||
    COALESCE((SELECT jsonb_agg(jsonb_build_object('type', legacy.code, 'name', legacy.name, 'url', btrim(p.DATA #>> ARRAY['qualitySystemLinks', legacy.key])) ORDER BY legacy.position)
        FROM (VALUES
            (1, 'dataProcessingAgreement', 'DATABEHANDLERAVTALE', 'Databehandleravtale'),
            (2, 'dpia', 'DPIA', 'DPIA'),
            (3, 'initialDpia', 'INITIELL_DPIA', 'Initiell DPIA'),
            (4, 'ros', 'ROS', 'ROS'),
            (5, 'mainAgreement', 'HOVEDAVTALE', 'Hovedavtale'),
            (6, 'otherAgreement', 'ANNEN_AVTALE', 'Annen avtale')
        ) AS legacy(position, key, code, name)
        WHERE NULLIF(btrim(p.DATA #>> ARRAY['qualitySystemLinks', legacy.key]), '') IS NOT NULL
    ), '[]'::jsonb)
))
WHERE jsonb_typeof(p.DATA -> 'qualitySystemLinks') = 'object';
