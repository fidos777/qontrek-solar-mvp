# CIVOS Governance Invariants v1.0.0

**STATUS: FROZEN** - No modifications allowed

## Classification Types

| Type | Name | Execution | AI Role |
|------|------|-----------|---------|
| A | AUTO | Immediate | AI executes |
| B | CONFIRM | After delay | AI proposes, human confirms |
| C | HOLD | Human only | AI silent |

## Priority Rule
```
C > B > A (most restrictive wins)
```

## Spend Thresholds (MYR)
- Type A: ≤ 100
- Type B: ≤ 1,000  
- Type C: > 1,000

## Confirmation Delays
- Phase 1 (MVP): 1 second
- Phase 2 (Growth): 2 seconds
- Phase 3 (Scale): 3 seconds

## Lock Statements

1. **AI may act, never decide** - Final authority always human
2. **Classification is pure** - Same input = same output
3. **Most restrictive wins** - C overrides B, B overrides A
4. **Frozen means frozen** - No runtime modifications

## Version History
- v1.0.0 (2026-01-06): Initial freeze
