---
title: 'Migrating 500 Talend pipelines to Databricks in one month'
question: 'Tell me about a time you led a large migration without breaking the business.'
role: 'fpt-software-senior-data-engineer'
competencies: ['leadership', 'delivery', 'technical-depth']
date: 2026-10-01
metrics:
  - prefix: 'Migrated'
    label: 'Talend pipelines'
    value: '500'
    note: 'To Databricks, in about one month (FPT Software).'
  - label: 'breaking changes to the business model'
    value: '0'
  - label: 'data schemas'
    value: 'unchanged'
image: '../../../assets/star/talend-databricks-migration.svg'
imageAlt: 'Diagram: Talend XML pipelines go through an AI skill that writes a plain spec, become Databricks pipelines in bronze, silver and gold layers, and an MCP server checks the output against the dev database.'
featured: false
---

## Situation

Our data pipelines ran in Talend, where each one is defined as XML. The files are very long and hard to read, so the logic behind a pipeline was hard to understand. On top of that, the team had no access to Talend itself to check how a pipeline behaved.

## Task

I led the migration of the Talend pipelines to Databricks. The target was about 500 pipelines in one month, with no breaking change to the business model and the data schema left exactly as it was.

## Action

I removed the two blockers with AI tooling:

- **An AI skill to read the pipelines:** it inspects the pipeline definitions straight from the code repository and extracts the logic as a plain spec, so nobody needs Talend access or has to read the XML.
- **Medallion conversion:** the same skill turns each spec into a Databricks pipeline that follows the medallion data model (bronze, silver, gold).
- **An MCP server for validation:** I wrote an MCP that connects to the database in the dev environment, so the team could check the output of each migrated pipeline against the expected data and schema.

## Result

The team migrated **500 pipelines in one month**, with no breaking change to the business model and the data schema still correct as it was.
