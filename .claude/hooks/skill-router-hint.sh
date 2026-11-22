#!/usr/bin/env bash
# UserPromptSubmit hook: on the first prompt of each session, remind Claude
# to route the request through the skill-router skill. Later prompts: no-op.
set -u

input="$(cat)"

# Extract session_id without depending on jq.
session_id="$(printf '%s' "$input" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
[ -z "$session_id" ] && exit 0

# Keep only safe characters for the marker file name.
session_id="$(printf '%s' "$session_id" | tr -cd 'A-Za-z0-9_-')"
[ -z "$session_id" ] && exit 0

marker_dir="${TMPDIR:-/tmp}/claude-skill-router"
mkdir -p "$marker_dir" 2>/dev/null || exit 0
marker="$marker_dir/$session_id"

# Already hinted in this session.
[ -e "$marker" ] && exit 0
touch "$marker" 2>/dev/null

# Plain stdout from UserPromptSubmit is added to Claude's context.
echo "First request of this session: before starting work, invoke the skill-router skill to pick the best skill for this request. Skip routing if the request is a quick question or a one-line fix."
exit 0
