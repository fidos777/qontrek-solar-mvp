# GAEP Agent Memory

This file stores long-term learnings across Ralph iterations.

## Governance Learnings

### Authority Requirements
- All action handlers MUST have `who_authorized` parameter
- Alternative acceptable: `actor_id`
- Missing authority = HARD_FAIL

### Tenant Isolation
- All database queries MUST include `tenant_id` filter
- Cross-tenant queries = HARD_FAIL
- Use `.eq('tenant_id', tenantId)` pattern

### Forbidden Patterns
- Never use `eval()` - security risk
- Never access `process.env` directly - use config
- Remove `console.log` before commit

## Case Law

(Disputes and rulings will be logged here)

## Gotchas

(Learnings from blocked commits will be logged here)
