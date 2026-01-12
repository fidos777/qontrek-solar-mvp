# Feature: Solar Quote Generation Enhancement

## Objective
Improve the quote generation flow to ensure all quotes are:
- System-generated (not manual)
- Properly authorized
- Tenant-isolated
- Audit-traceable

## Problem Statement
Current quote flow allows:
- Manual price entry (risk of errors/fraud)
- Missing authorization tracking
- No proof trail for disputes

## Scope

### IN SCOPE
- Add `who_authorized` parameter to quote handlers
- Ensure all prices come from approved pricing table
- Add `quote_hash` generation for proof
- Add `tenant_id` validation in queries

### OUT OF SCOPE
- Payment processing
- Commission calculation
- Customer notification
- PDF generation

## Risk Assessment
- **Involves money?** YES - quote prices affect revenue
- **Involves authority?** YES - who can approve quotes
- **Involves customer data?** YES - customer details in quotes
- **Governance level:** HIGH - requires HARD gates

## Success Criteria
1. All quote actions have `who_authorized` parameter
2. All prices fetched from `pricing_table` only
3. All SQL queries include `tenant_id` filter
4. Quote hash generated and stored
5. Ralph blocked if any criteria missing

## Policy References
- SOL.G1.REQ_DEP.AUTH.001 (Authority)
- SOL.G2.QUOTE.SYS.001 (System pricing)
- SOL.G4.MAX.DISC.001 (Discount limits)

## Technical Notes
- Target files: src/actions/quote.ts, src/services/pricing.ts
- Database: quotes table, pricing_table
- Auth: Supabase RLS + application-level checks
