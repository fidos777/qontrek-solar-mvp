# Ralph Hook Instructions

## How to Modify ralph.sh for GAEP

Add this code block AFTER test passes and BEFORE git commit:

```bash
# =============================================================================
# GAEP GOVERNANCE GATE
# =============================================================================

echo "🔐 Running GAEP governance gate..."

# Get staged changes hash
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "STAGED")

# Run validation
VALIDATE_RESULT=$(npx ts-node qontrek/mcp/validate.ts "$COMMIT_HASH" "$STORY_ID")
VALIDATE_EXIT=$?

if [ $VALIDATE_EXIT -eq 0 ]; then
  echo "✅ GAEP: PASS - Commit allowed"
  git commit -m "$COMMIT_MSG"
elif [ $VALIDATE_EXIT -eq 2 ]; then
  echo "🟡 GAEP: SOFT_FAIL - Needs human approval"
  echo "   Waiting for approval..."
  # In v0, we block. In v1+, we could wait for approval
  exit 1
else
  echo "🔴 GAEP: HARD_FAIL - Commit BLOCKED"
  echo "   Reason: See validation log"
  git reset --hard HEAD
  exit 1
fi
```

## Key Points

1. **Validate BEFORE commit** - Never after
2. **Exit codes:**
   - 0 = PASS (commit)
   - 1 = HARD_FAIL (block)
   - 2 = SOFT_FAIL (escalate)
3. **On HARD_FAIL:** `git reset --hard HEAD`
4. **Log location:** `qontrek/ledger/validation_log.json`

## Testing the Hook

```bash
# Test with a known violation
echo "eval('test')" >> src/test.ts
git add .
# Run validate manually
npx ts-node qontrek/mcp/validate.ts HEAD S-TEST
# Should return HARD_FAIL
```
