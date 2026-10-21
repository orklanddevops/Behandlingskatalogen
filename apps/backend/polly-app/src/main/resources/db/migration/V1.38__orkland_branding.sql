-- Update the upstream seed wording without changing previous migration checksums.
-- Restrict the change to the original organization-specific sentence.
UPDATE CODELIST
SET DESCRIPTION = replace(DESCRIPTION, 'NAV er underlagt', 'Orkland kommune er underlagt'),
    LAST_MODIFIED_BY = 'system',
    LAST_MODIFIED_DATE = now()
WHERE LIST_NAME = 'GDPR_ARTICLE'
  AND CODE = 'ART61C'
  AND DESCRIPTION LIKE '%NAV er underlagt%';
