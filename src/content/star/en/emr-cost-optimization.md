---
title: 'Cutting EMR costs by more than half'
question: 'Tell me about a time you reduced cost without hurting performance.'
role: 'datum-security-bank-data-engineer'
competencies: ['ownership', 'technical-depth', 'customer-focus']
date: 2025-06-01
metrics:
  - prefix: 'Cut'
    label: 'EMR costs'
    value: '>50%'
    note: "On the bank's AWS data platform (Datum / Security Bank); pipeline performance stayed the same."
  - label: 'pipeline performance'
    value: 'unchanged'
image: '../../../assets/star/emr-cost-optimization.svg'
imageAlt: 'Diagram: an Airflow DAG checks the running EMR clusters first and sends its work to an idle one; a new cluster starts only when none is free, and a cluster idle for 15 minutes shuts down.'
featured: true
---

## Situation

The bank's data platform ran on AWS, with daily ingestion and processing jobs on Amazon EMR. One day the business asked why the platform's cost kept going up.

## Task

I owned the investigation: find out what was driving the cost and bring it down without slowing the daily pipelines.

## Action

I found two causes. Jobs did not reuse EMR clusters: each one started its own, so several clusters often ran at the same time. And cluster sizing was hard-coded, so every job got the same configuration whatever its workload.

I built a framework in Airflow to fix both:

- **Reuse before create:** the first step of every DAG that ingests data or touches EMR lists the running clusters and picks one that is idle or lightly loaded. Work goes to that cluster, and a new one is created only when none is available.
- **Idle shutdown:** a cluster that stays idle for 15 minutes is shut down automatically.
- **Configurable sizing:** cluster sizes and settings live in Airflow Variables, so they can be tuned per workload without a code change or a deploy.

## Result

EMR cost dropped by **more than 50%**, and the pipelines kept the same performance.
