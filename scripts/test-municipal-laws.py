#!/usr/bin/env python3
"""Run only inside: pg_virtualenv -t python3 scripts/test-municipal-laws.py"""
import csv
import io
import json
import os
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "apps/backend/polly-app/src/main/resources/db/migration"
MANIFEST = json.loads((ROOT / "scripts/import-data/municipal-national-laws-2026-11-11.json").read_text())
SEED_SQL = (MIGRATIONS / "V1.41__municipal_national_laws.sql").read_text()
DESCRIPTION_SQL = (MIGRATIONS / "V1.42__national_law_descriptions.sql").read_text()
SQL = SEED_SQL + "\n" + DESCRIPTION_SQL
LAWS = MANIFEST["laws"]

def quote(value):
    return "'" + value.replace("'", "''") + "'"

def database(sql):
    result = subprocess.run(
        ["psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
        input=sql, text=True, capture_output=True, check=False,
    )
    if result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()

class MunicipalLawImportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config = Path(os.environ.get("PG_CLUSTER_CONF_ROOT", "/not-a-test-cluster"))
        if not config.parent.name.startswith("pg_virtualenv."):
            raise RuntimeError("Run with pg_virtualenv -t; never use the application database.")
        initial = (MIGRATIONS / "V1.1__initial_domain.sql").read_text()
        database(initial.split("CREATE TABLE IF NOT EXISTS TERM")[0])
        database((MIGRATIONS / "V1.9__codelist_shortname.sql").read_text())

    def setUp(self):
        database("TRUNCATE CODELIST;")

    def seed(self, list_name, code, name, description):
        database("INSERT INTO CODELIST (LIST_NAME,CODE,SHORT_NAME,DESCRIPTION,CREATED_BY,CREATED_DATE)"
                 " VALUES (" + ",".join(map(quote, [list_name, code, name, description, "existing"])) + ",now());")

    def snapshot(self):
        return database("SELECT coalesce(json_agg(c ORDER BY LIST_NAME,CODE),'[]'::json) FROM CODELIST c;")

    def test_empty_database_receives_exactly_the_selected_laws(self):
        database(SQL)
        actual = json.loads(database("SELECT json_agg(json_build_array(CODE,SHORT_NAME,DESCRIPTION) ORDER BY CODE)"
                                     " FROM CODELIST WHERE LIST_NAME='NATIONAL_LAW';"))
        expected = sorted([[r["code"], r["shortName"], r["description"]] for r in LAWS])
        self.assertEqual(actual, expected)
        for row in LAWS:
            self.assertRegex(row["code"], r"^[A-Z0-9_]+$")
            self.assertEqual(row["url"], "https://lovdata.no/lov/" + row["lawId"].removeprefix("LOV-"))

    def test_repeated_execution_never_changes_existing_rows(self):
        database(SQL)
        before = self.snapshot()
        database(SQL)
        self.assertEqual(self.snapshot(), before)

    def test_existing_aliases_and_lovdata_identifier_formats_are_preserved(self):
        forms = [
            "1997-02-28-19",
            "LOV-2018-06-22-83",
            "https://lovdata.no/lov/2018-06-15-38/",
            "https://lovdata.no/dokument/NL/lov/1967-02-10",
        ]
        for index, description in enumerate(forms):
            self.seed("NATIONAL_LAW", "EXISTING_" + str(index), "Existing label " + str(index), description)
        database(SQL)
        self.assertEqual(int(database("SELECT count(*) FROM CODELIST;")), len(LAWS))
        self.assertEqual(int(database("SELECT count(*) FROM CODELIST WHERE CODE LIKE 'EXISTING_%' AND CREATED_BY='existing';")), 4)
        self.assertEqual(int(database("SELECT count(*) FROM CODELIST WHERE CODE IN "
                                     "('LOV_1997_02_28_19','LOV_2018_06_22_83','LOV_2018_06_15_38','LOV_1967_02_10');")), 0)

    def test_code_collisions_and_other_categories_are_not_overwritten(self):
        first = LAWS[0]
        self.seed("NATIONAL_LAW", first["code"], "Keep manual entry", "manual description")
        self.seed("TEAM", first["code"], "Keep team", "team description")
        database(SQL)
        self.assertEqual(database("SELECT SHORT_NAME FROM CODELIST WHERE LIST_NAME='NATIONAL_LAW' AND CODE="
                                  + quote(first["code"]) + ";"), "Keep manual entry")
        self.assertEqual(database("SELECT SHORT_NAME FROM CODELIST WHERE LIST_NAME='TEAM';"), "Keep team")
        self.assertEqual(int(database("SELECT count(*) FROM CODELIST WHERE LIST_NAME='NATIONAL_LAW';")), len(LAWS))

    def test_followup_updates_previously_imported_dates_without_changing_codes(self):
        database(SEED_SQL)
        codes_before = database("SELECT string_agg(CODE, ',' ORDER BY CODE) FROM CODELIST;")
        database(DESCRIPTION_SQL)
        self.assertEqual(codes_before, database("SELECT string_agg(CODE, ',' ORDER BY CODE) FROM CODELIST;"))
        mineral = next(row for row in LAWS if row["code"] == "LOV_2025_06_20_107")
        self.assertEqual(database("SELECT DESCRIPTION FROM CODELIST WHERE CODE='LOV_2025_06_20_107';"),
                         mineral["description"])

    def test_existing_editorial_description_is_not_overwritten(self):
        law = LAWS[0]
        self.seed("NATIONAL_LAW", law["code"], "Existing name", "Existing reviewed description")
        database(SQL)
        self.assertEqual(database("SELECT DESCRIPTION FROM CODELIST WHERE CODE=" + quote(law["code"]) + ";"),
                         "Existing reviewed description")

    def test_manifest_and_complete_export_review_are_consistent(self):
        review = list(csv.DictReader(io.StringIO((ROOT / "docs/municipal-national-laws-review.tsv").read_text()), delimiter="\t"))
        self.assertEqual(len(review), MANIFEST["reviewedDocuments"])
        selected = {row["Lovdata-ID"] for row in review if row["Beslutning"] == "VALGT"}
        self.assertEqual(selected, {law["lawId"] for law in LAWS})
        self.assertEqual(len(selected), len(LAWS))
        excluded = {"LOV-2025-06-20-81", "LOV-2025-06-20-40", "LOV-2026-05-22-19", "LOV-2026-06-19-53"}
        self.assertTrue(selected.isdisjoint(excluded))
        for row in LAWS:
            self.assertRegex(row["sourceSha256"], r"^[0-9a-f]{64}$")
            self.assertNotIn("..", Path(row["sourceFile"]).parts)
            self.assertTrue(row["reason"])
            self.assertGreater(len(row["description"]), 45)
            self.assertNotRegex(row["description"], r"^\d{4}-\d{2}-\d{2}")

if __name__ == "__main__":
    unittest.main(verbosity=2)
