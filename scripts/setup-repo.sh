#!/usr/bin/env bash
# One-time GitHub repo settings (spec §11.9). Needs `gh` logged in as the repo admin.
# Usage: scripts/setup-repo.sh [owner/repo]   (a few settings can still need the web UI)
set -euo pipefail
REPO="${1:-ryanparker97/ryanparker97.github.io}"
api() { gh api -H "Accept: application/vnd.github+json" "$@"; }

echo "Pages: source = GitHub Actions"
api -X POST "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 ||
  api -X PUT "repos/$REPO/pages" -f build_type=workflow

echo "Environment github-pages: deploy from main only"
api -X PUT "repos/$REPO/environments/github-pages" \
  --input - <<<'{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' >/dev/null
api -X POST "repos/$REPO/environments/github-pages/deployment-branch-policies" \
  -f name=main -f type=branch >/dev/null 2>&1 || true

echo "Actions: read-only token, allowed actions, SHA pinning"
api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
api -X PUT "repos/$REPO/actions/permissions" -F enabled=true -f allowed_actions=selected -F sha_pinning_required=true
api -X PUT "repos/$REPO/actions/permissions/selected-actions" --input - <<<'{"github_owned_allowed":true,"verified_allowed":true,"patterns_allowed":["pnpm/action-setup@*","lycheeverse/lychee-action@*"]}'

echo "Variable PUBLIC_CF_BEACON_TOKEN (set the value when you have one)"
if [[ -n "${PUBLIC_CF_BEACON_TOKEN:-}" ]]; then
  gh variable set PUBLIC_CF_BEACON_TOKEN --repo "$REPO" --body "$PUBLIC_CF_BEACON_TOKEN"
fi

echo "Code security: secret scanning, push protection, Dependabot alerts + updates"
api -X PATCH "repos/$REPO" --input - >/dev/null <<<'{
  "security_and_analysis": {
    "secret_scanning": {"status": "enabled"},
    "secret_scanning_push_protection": {"status": "enabled"}
  }
}'
api -X PUT "repos/$REPO/vulnerability-alerts"
api -X PUT "repos/$REPO/automated-security-fixes"
# CodeQL default setup must stay off: this repo uses the advanced setup in codeql.yml.
api -X PATCH "repos/$REPO/code-scanning/default-setup" -f state=not-configured >/dev/null 2>&1 || true

echo "Merge settings: squash only, PR title as message, auto-delete branches, auto-merge"
api -X PATCH "repos/$REPO" --input - >/dev/null <<<'{
  "allow_squash_merge": true, "allow_merge_commit": false, "allow_rebase_merge": false,
  "squash_merge_commit_title": "PR_TITLE", "squash_merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true, "allow_auto_merge": true
}'

echo "Ruleset on main"
api -X POST "repos/$REPO/rulesets" --input - >/dev/null <<'JSON'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [
          { "context": "ci-ok" },
          { "context": "Analyze (javascript-typescript)" },
          { "context": "Analyze (actions)" } ] } }
  ]
}
JSON
echo "Done. Remaining by hand: README status badge."
