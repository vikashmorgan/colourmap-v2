#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

failures=0

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

pass() {
  printf 'PASS %s\n' "$1"
}

fail() {
  printf 'FAIL %s\n' "$1"
  failures=$((failures + 1))
}

section() {
  printf '\n== %s ==\n' "$1"
}

require_file() {
  local path="$1"
  if [[ -f "$path" ]]; then
    pass "file exists: $path"
  else
    fail "missing file: $path"
  fi
}

require_dir() {
  local path="$1"
  if [[ -d "$path" ]]; then
    pass "directory exists: $path"
  else
    fail "missing directory: $path"
  fi
}

require_symlink_target() {
  local path="$1"
  local expected_target="$2"
  local actual_target

  if [[ ! -L "$path" ]]; then
    fail "expected symlink: $path"
    return
  fi

  actual_target="$(readlink "$path")"

  if [[ "$actual_target" == "$expected_target" ]]; then
    pass "symlink target ok: $path -> $expected_target"
  else
    fail "wrong symlink target: $path -> $actual_target (expected $expected_target)"
  fi
}

write_sorted_rule_list() {
  find rules -maxdepth 1 -type f -name '*.md' -print | LC_ALL=C sort > "$1"
}

write_sorted_skill_list() {
  find skills -mindepth 1 -maxdepth 1 -type d -print | LC_ALL=C sort > "$1"
}

section "Canonical Structure"

require_file "AGENTS.md"
require_file "docs/product.md"
require_dir "docs/specs"
require_dir "rules"
require_dir "skills"

for rule_file in rules/*.md; do
  require_file "$rule_file"
done

for skill_dir in skills/*; do
  if [[ -d "$skill_dir" ]]; then
    require_file "$skill_dir/SKILL.md"
    require_file "$skill_dir/agents/openai.yaml"
  fi
done

section "AGENTS Coverage"

awk '/^## Rule Map/{flag=1; next} /^## Skills/{flag=0} flag' AGENTS.md \
  | sed -n 's/^- `\([^`]*\)`.*/\1/p' \
  | LC_ALL=C sort > "$tmp_dir/agents-rules.txt"

awk '/^## Skills/{flag=1; next} /^## Agent Wiring/{flag=0} flag' AGENTS.md \
  | sed -n 's/^- `\([^`]*\)`.*/skills\/\1/p' \
  | LC_ALL=C sort > "$tmp_dir/agents-skills.txt"

write_sorted_rule_list "$tmp_dir/actual-rules.txt"
write_sorted_skill_list "$tmp_dir/actual-skills.txt"

while IFS= read -r listed_rule; do
  if grep -Fxq "$listed_rule" "$tmp_dir/actual-rules.txt"; then
    pass "AGENTS rule listed and present: $listed_rule"
  else
    fail "AGENTS references missing rule: $listed_rule"
  fi
done < "$tmp_dir/agents-rules.txt"

while IFS= read -r actual_rule; do
  if grep -Fxq "$actual_rule" "$tmp_dir/agents-rules.txt"; then
    pass "rule documented in AGENTS: $actual_rule"
  else
    fail "rule exists but is not documented in AGENTS: $actual_rule"
  fi
done < "$tmp_dir/actual-rules.txt"

while IFS= read -r listed_skill; do
  if grep -Fxq "$listed_skill" "$tmp_dir/actual-skills.txt"; then
    pass "AGENTS skill listed and present: $listed_skill"
  else
    fail "AGENTS references missing skill: $listed_skill"
  fi
done < "$tmp_dir/agents-skills.txt"

while IFS= read -r actual_skill; do
  if grep -Fxq "$actual_skill" "$tmp_dir/agents-skills.txt"; then
    pass "skill documented in AGENTS: $actual_skill"
  else
    fail "skill exists but is not documented in AGENTS: $actual_skill"
  fi
done < "$tmp_dir/actual-skills.txt"

section "Cross-File References"

rg -o 'specs/[A-Za-z0-9._/-]+\.md' docs/product.md | LC_ALL=C sort -u > "$tmp_dir/product-spec-links.txt" || true

while IFS= read -r spec_link; do
  [[ -z "$spec_link" ]] && continue
  if [[ -f "docs/$spec_link" ]]; then
    pass "product spec link resolves: docs/$spec_link"
  else
    fail "broken product spec link: docs/$spec_link"
  fi
done < "$tmp_dir/product-spec-links.txt"

for skill_dir in skills/*; do
  [[ -d "$skill_dir" ]] || continue

  skill_name="$(basename "$skill_dir")"

  rg -o 'references/[A-Za-z0-9._/-]+' "$skill_dir/SKILL.md" | LC_ALL=C sort -u > "$tmp_dir/$skill_name-references.txt" || true
  rg -o 'rules/[A-Za-z0-9._/-]+\.md' "$skill_dir/SKILL.md" | LC_ALL=C sort -u > "$tmp_dir/$skill_name-rules.txt" || true
  rg -o 'docs/[A-Za-z0-9._/-]+\.md' "$skill_dir/SKILL.md" | LC_ALL=C sort -u > "$tmp_dir/$skill_name-docs.txt" || true

  while IFS= read -r relative_ref; do
    [[ -z "$relative_ref" ]] && continue
    if [[ -e "$skill_dir/$relative_ref" ]]; then
      pass "$skill_name reference resolves: $skill_dir/$relative_ref"
    else
      fail "$skill_name missing reference target: $skill_dir/$relative_ref"
    fi
  done < "$tmp_dir/$skill_name-references.txt"

  while IFS= read -r repo_ref; do
    [[ -z "$repo_ref" ]] && continue
    if [[ -e "$repo_ref" ]]; then
      pass "$skill_name repo rule resolves: $repo_ref"
    else
      fail "$skill_name missing repo rule: $repo_ref"
    fi
  done < "$tmp_dir/$skill_name-rules.txt"

  while IFS= read -r repo_doc; do
    [[ -z "$repo_doc" ]] && continue
    if [[ -e "$repo_doc" ]]; then
      pass "$skill_name repo doc resolves: $repo_doc"
    else
      fail "$skill_name missing repo doc: $repo_doc"
    fi
  done < "$tmp_dir/$skill_name-docs.txt"

  declared_name="$(sed -n 's/^name: //p' "$skill_dir/SKILL.md" | head -n 1)"
  if [[ "$declared_name" == "$skill_name" ]]; then
    pass "skill frontmatter matches directory: $skill_name"
  else
    fail "skill frontmatter mismatch in $skill_dir/SKILL.md: expected $skill_name, got ${declared_name:-<empty>}"
  fi

  if grep -Fq "\$$skill_name" "$skill_dir/agents/openai.yaml"; then
    pass "OpenAI adapter prompt references skill token: $skill_name"
  else
    fail "OpenAI adapter prompt missing skill token: $skill_dir/agents/openai.yaml"
  fi
done

section "Canonical Portability"

runtime_hits="$(rg -n '\.claude/|\.codex/|CLAUDE\.md' skills --glob '!**/agents/**' || true)"

if [[ -z "$runtime_hits" ]]; then
  pass "canonical skill files avoid runtime-specific paths"
else
  printf '%s\n' "$runtime_hits"
  fail "canonical skill files contain runtime-specific paths"
fi

section "Adapter Wiring"

require_symlink_target "CLAUDE.md" "AGENTS.md"
require_symlink_target ".codex/AGENTS.md" "../AGENTS.md"

for rule_file in rules/*.md; do
  rule_name="$(basename "$rule_file")"
  require_symlink_target ".claude/rules/$rule_name" "../../rules/$rule_name"
  require_symlink_target ".codex/rules/$rule_name" "../../rules/$rule_name"
done

for skill_dir in skills/*; do
  [[ -d "$skill_dir" ]] || continue
  skill_name="$(basename "$skill_dir")"
  require_symlink_target ".claude/skills/$skill_name" "../../skills/$skill_name"
  require_symlink_target ".codex/skills/$skill_name" "../../skills/$skill_name"
done

printf '\n'

if [[ "$failures" -eq 0 ]]; then
  printf 'All instruction-system checks passed.\n'
else
  printf 'Instruction-system checks failed: %s issue(s).\n' "$failures"
fi

exit "$failures"
