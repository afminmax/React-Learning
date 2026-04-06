# ACME Data Governance Catalog — AI/BI Dashboard Build Guide

## Overview

This guide walks through building a native Databricks AI/BI Dashboard on top of `sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog`.

The table uses a two-prefix schema convention:
- **`sor_`** — System of Record (source metadata from Salesforce)
- **`rdg_`** — Represented Data Governance (stewardship and classification metadata)

---

## Step 1 — Save All Queries in the SQL Editor

Run each query below in **Databricks SQL Editor** and save it with the name shown. You will reference these by name when building the dashboard canvas.

---

### `q_kpi_summary`

Top-line numbers for KPI counter tiles.

```sql
SELECT
  COUNT(*)                                                        AS total_fields,
  COUNT(DISTINCT sor_entity_name)                                 AS total_entities,
  SUM(CASE WHEN UPPER(rdg_contains_pii) = 'TRUE'  THEN 1 ELSE 0 END) AS pii_field_count,
  SUM(CASE WHEN UPPER(rdg_data_sensitivity) = 'RESTRICTED'   THEN 1 ELSE 0 END) AS restricted_count,
  SUM(CASE WHEN UPPER(rdg_data_sensitivity) = 'CONFIDENTIAL' THEN 1 ELSE 0 END) AS confidential_count,
  SUM(CASE WHEN rdg_data_steward_status IS NULL
            OR rdg_data_steward_status = '' THEN 1 ELSE 0 END)   AS pending_review_count,
  ROUND(
    100.0 * SUM(CASE WHEN rdg_data_classification IS NOT NULL
                      AND rdg_data_classification != '' THEN 1 ELSE 0 END)
    / COUNT(*), 1)                                                AS classification_coverage_pct,
  ROUND(
    100.0 * SUM(CASE WHEN rdg_data_sensitivity IS NOT NULL
                      AND rdg_data_sensitivity != '' THEN 1 ELSE 0 END)
    / COUNT(*), 1)                                                AS sensitivity_coverage_pct
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog;
```

---

### `q_sensitivity_breakdown`

Donut / bar chart of sensitivity levels.

```sql
SELECT
  COALESCE(NULLIF(rdg_data_sensitivity, ''), 'Unclassified') AS sensitivity_level,
  COUNT(*) AS field_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)         AS pct_of_total
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
GROUP BY 1
ORDER BY field_count DESC;
```

---

### `q_fields_by_entity`

Stacked bar chart — fields per Salesforce entity, coloured by sensitivity level.

```sql
SELECT
  sor_entity_name,
  COALESCE(NULLIF(rdg_data_sensitivity, ''), 'Unclassified') AS sensitivity_level,
  COUNT(*) AS field_count
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
GROUP BY 1, 2
ORDER BY 1, 2;
```

---

### `q_pii_by_entity`

Bar chart — PII field concentration per Salesforce entity.

```sql
SELECT
  sor_entity_name,
  COALESCE(NULLIF(rdg_pii_type, ''), 'None / Not Set')       AS pii_type,
  COUNT(*) AS field_count
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
WHERE UPPER(rdg_contains_pii) = 'TRUE'
GROUP BY 1, 2
ORDER BY 1, field_count DESC;
```

---

### `q_data_family_breakdown`

Bar chart — fields grouped by data family and semantic group.

```sql
SELECT
  COALESCE(NULLIF(rdg_data_family, ''),       'Unassigned') AS data_family,
  COALESCE(NULLIF(rdg_semantic_group_one, ''), 'Unassigned') AS semantic_group,
  COUNT(*) AS field_count
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
GROUP BY 1, 2
ORDER BY field_count DESC;
```

---

### `q_stewardship_status`

Governance health — steward assignment and review status.

```sql
SELECT
  COALESCE(NULLIF(rdg_data_steward_status, ''), 'No Status Set') AS steward_status,
  COALESCE(NULLIF(rdg_data_steward_primary, ''), 'Unassigned')   AS primary_steward,
  COUNT(*) AS field_count
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
GROUP BY 1, 2
ORDER BY field_count DESC;
```

---

### `q_classification_confidence`

Table — flags fields where AI classification confidence is low or medium, requiring steward review.

```sql
SELECT
  sor_entity_name,
  sor_entity_attribute_label,
  sor_datatype,
  rdg_data_classification,
  rdg_data_classification_confidence,
  rdg_data_sensitivity,
  rdg_data_sensitivity_confidence,
  rdg_contains_pii,
  rdg_contains_pii_confidence,
  rdg_data_steward_status
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
WHERE rdg_data_classification_confidence IN ('Low', 'low', 'MEDIUM', 'Medium', 'medium')
   OR rdg_data_sensitivity_confidence    IN ('Low', 'low', 'MEDIUM', 'Medium', 'medium')
   OR rdg_contains_pii_confidence        IN ('Low', 'low', 'MEDIUM', 'Medium', 'medium')
ORDER BY sor_entity_name, sor_entity_attribute_label;
```

---

### `q_full_catalog`

Filterable browse table — master view for data stewards, with a parameter filter by entity.

```sql
SELECT
  sor_entity_name,
  sor_entity_attribute_label          AS field_label,
  sor_api_name                        AS api_name,
  sor_datatype                        AS data_type,
  sor_description                     AS source_description,
  rdg_data_classification             AS classification,
  rdg_data_sensitivity                AS sensitivity,
  rdg_contains_pii                    AS contains_pii,
  rdg_pii_type                        AS pii_type,
  rdg_data_family                     AS data_family,
  rdg_semantic_group_one              AS semantic_group,
  rdg_data_steward_status             AS steward_status,
  rdg_data_steward_primary            AS primary_steward,
  rdg_business_owner_primary          AS business_owner,
  rdg_last_modified_by                AS last_modified_by,
  rdg_last_modified_date              AS last_modified_date
FROM sandbox_dev.test_acme_enterprise_data_catalog.poc_salesforce_data_catalog
WHERE sor_entity_name = :entity_filter
   OR :entity_filter  = 'All'
ORDER BY sor_entity_name, sor_entity_attribute_label;
```

> **Note:** Set the default value of `:entity_filter` to `All` in the SQL Editor parameter settings before saving the query.

---

## Step 2 — Create the Dashboard

1. In your Databricks workspace, go to **New → Dashboard → AI/BI Dashboard**
2. Name it `ACME Data Governance Catalog`
3. In the **Data tab**, add each of the 8 saved queries as a dataset
4. Switch to the **Canvas tab** to build the layout

---

## Step 3 — Canvas Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ACME Enterprise Data Governance Catalog             [filters]  │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤
│  Total   │  Total   │  PII     │Restricted│ Class.   │ Steward  │
│  Fields  │ Entities │  Fields  │  Fields  │ Cover %  │ Pending  │
│  (q1)    │  (q1)    │  (q1)    │  (q1)    │  (q1)    │  (q1)   │
├──────────┴──────────┼──────────┴──────────┴──────────┴──────────┤
│  Sensitivity        │  Fields by Entity + Sensitivity            │
│  Breakdown (donut)  │  (stacked bar — q3)                        │
│  (q2)               │                                            │
├─────────────────────┼────────────────────────────────────────────┤
│  PII by Entity      │  Stewardship Status                        │
│  (bar — q4)         │  (bar — q6)                                │
├─────────────────────┴────────────────────────────────────────────┤
│  Data Family / Semantic Group breakdown (bar — q5)               │
├──────────────────────────────────────────────────────────────────┤
│  ⚠️  Low Confidence — Needs Steward Review (table — q7)          │
├──────────────────────────────────────────────────────────────────┤
│  Full Catalog Browse  [entity_filter dropdown]  (table — q8)     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Step 4 — Widget Configuration Reference

| Widget | Query | Viz Type | Dimension | Measure |
|---|---|---|---|---|
| Total Fields (KPI) | q_kpi_summary | Counter | — | `total_fields` |
| Total Entities (KPI) | q_kpi_summary | Counter | — | `total_entities` |
| PII Fields (KPI) | q_kpi_summary | Counter | — | `pii_field_count` |
| Restricted Fields (KPI) | q_kpi_summary | Counter | — | `restricted_count` |
| Classification Coverage (KPI) | q_kpi_summary | Counter | — | `classification_coverage_pct` |
| Steward Pending (KPI) | q_kpi_summary | Counter | — | `pending_review_count` |
| Sensitivity Breakdown | q_sensitivity_breakdown | Donut | `sensitivity_level` | `field_count` |
| Fields by Entity | q_fields_by_entity | Stacked Bar | `sor_entity_name` | `field_count`, colour by `sensitivity_level` |
| PII by Entity | q_pii_by_entity | Bar | `sor_entity_name` | `field_count`, colour by `pii_type` |
| Stewardship Status | q_stewardship_status | Bar | `steward_status` | `field_count` |
| Data Family Breakdown | q_data_family_breakdown | Bar | `data_family` | `field_count`, colour by `semantic_group` |
| Low Confidence Review | q_classification_confidence | Table | all columns | — |
| Full Catalog Browse | q_full_catalog | Table | all columns | — |

---

## Step 5 — Add the Entity Filter

1. In the Canvas tab, click **Add Filter**
2. Select **New dashboard filter**
3. Bind it to the `q_full_catalog` dataset, column `sor_entity_name`
4. Set the filter style to **Dropdown**
5. Set default value to `All`
6. This gives stewards a single dropdown to scope the browse table to a specific Salesforce entity (Account, Contact, Contract, Campaign, etc.)

---

## Step 6 — Publish and Share

1. Click **Publish** in the top right of the canvas
2. Go to **Share** and add your data stewards group
3. Stewards receive a direct URL — they authenticate with their own Databricks credentials
4. Access is governed by the Unity Catalog grants already in place — no additional configuration needed

---

## Next Steps

| Phase | Description |
|---|---|
| ✅ Phase 1 | AI/BI Dashboard — read-only governance overview (this guide) |
| 🔲 Phase 2 | Databricks App (Dash) — steward edit layer for sensitivity, PII flags, and descriptions |
| 🔲 Phase 3 | Audit log table — track every steward edit with timestamp and before/after values |
| 🔲 Phase 4 | Approval workflow — `Draft → Pending Review → Approved` status lifecycle |

---

## Notes

- **Confidence columns** (`rdg_data_classification_confidence`, `rdg_data_sensitivity_confidence`, `rdg_contains_pii_confidence`): Query 7 assumes values of `Low`, `Medium`, or `High`. If your data uses a different scale (e.g. numeric 0–1), update the `WHERE` clause accordingly.
- **`rdg_is_computed`**: Not included in the dashboard queries above but available for a future widget showing how many fields are formula/computed vs raw source fields.
- **Refresh schedule**: Set an automatic refresh on the dashboard (Dashboard menu → Schedule) to keep KPI tiles current as stewards update records.
