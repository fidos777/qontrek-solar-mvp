#!/bin/bash

# ============================================================================
# GAEP v1.0 SETUP SCRIPT
# Creates all mandatory files for Governed Autonomous Engineering Protocol
# 
# Usage: 
#   chmod +x setup-gaep.sh
#   ./setup-gaep.sh
#
# This script creates:
#   1. /qontrek folder structure
#   2. /ralph folder structure  
#   3. PRD.md (intent specification)
#   4. prd.json (GAEP-enhanced stories)
#   5. scan_manifest.yaml (boundary lock)
#   6. validate.ts (governance gate)
#   7. ralph.sh modification instructions
#
# Target: First governed run where Ralph gets BLOCKED for valid reason
# ============================================================================

set -e

echo "============================================"
echo "  GAEP v1.0 SETUP SCRIPT"
echo "  Governed Autonomous Engineering Protocol"
echo "============================================"
echo ""

# ============================================================================
# STEP 0: CREATE FOLDER STRUCTURE
# ============================================================================

echo "📁 Creating folder structure..."

mkdir -p qontrek/governance
mkdir -p qontrek/mcp
mkdir -p qontrek/ledger
mkdir -p ralph

echo "   ✅ /qontrek/governance"
echo "   ✅ /qontrek/mcp"
echo "   ✅ /qontrek/ledger"
echo "   ✅ /ralph"
echo ""

# ============================================================================
# FILE 1: PRD.md (Intent Specification)
# ============================================================================

echo "📄 Creating PRD.md..."

cat > ralph/PRD.md << 'EOF'
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
EOF

echo "   ✅ ralph/PRD.md created"
echo ""

# ============================================================================
# FILE 2: prd.json (GAEP-Enhanced Stories)
# ============================================================================

echo "📄 Creating prd.json..."

cat > ralph/prd.json << 'EOF'
{
  "project": "solar-quote-enhancement",
  "version": "1.0",
  "policy_version": "SOL.v1.0",
  "stories": [
    {
      "id": "S-001",
      "title": "Add authority parameter to quote action",
      "description": "Ensure createQuote action requires who_authorized parameter",
      "clause_id": "SOL.G1.REQ_DEP.AUTH.001",
      "severity": "HARD",
      "invariants": ["AUTHORITY"],
      "economic_effect": {
        "type": "quote_authorization",
        "affects": ["quote_validity", "dispute_liability"]
      },
      "acceptance_criteria": [
        "createQuote function has who_authorized parameter",
        "who_authorized is validated against allowed roles",
        "Action fails if who_authorized is missing or invalid",
        "who_authorized is logged with the quote record"
      ],
      "target_files": [
        "src/actions/quote.ts"
      ],
      "passes": false
    },
    {
      "id": "S-002",
      "title": "Enforce system-generated pricing",
      "description": "All quote prices must come from approved pricing table, not manual input",
      "clause_id": "SOL.G2.QUOTE.SYS.001",
      "severity": "HARD",
      "invariants": ["PROOF", "ECONOMICS"],
      "economic_effect": {
        "type": "price_source",
        "affects": ["margin", "commission_base", "dispute_proof"]
      },
      "acceptance_criteria": [
        "Price is fetched from pricing_table by system_size",
        "Manual price input is not accepted",
        "price_source field is set to 'system'",
        "pricing_table_id is stored with quote"
      ],
      "target_files": [
        "src/services/pricing.ts",
        "src/actions/quote.ts"
      ],
      "passes": false
    },
    {
      "id": "S-003",
      "title": "Add tenant isolation to quote queries",
      "description": "All quote-related database queries must include tenant_id filter",
      "clause_id": "SOL.G4.TENANT.001",
      "severity": "HARD",
      "invariants": ["TENANT"],
      "economic_effect": {
        "type": "data_isolation",
        "affects": ["security", "compliance", "multi_tenant_integrity"]
      },
      "acceptance_criteria": [
        "All SELECT queries on quotes table include WHERE tenant_id = ?",
        "All UPDATE queries on quotes table include WHERE tenant_id = ?",
        "All DELETE queries on quotes table include WHERE tenant_id = ?",
        "No cross-tenant data leakage possible"
      ],
      "target_files": [
        "src/db/quotes.ts",
        "src/services/pricing.ts"
      ],
      "passes": false
    },
    {
      "id": "S-004",
      "title": "Generate quote hash for proof",
      "description": "Each quote must have a unique hash for dispute resolution",
      "clause_id": "SOL.G2.QUOTE.PROOF.001",
      "severity": "HARD",
      "invariants": ["PROOF"],
      "economic_effect": {
        "type": "proof_generation",
        "affects": ["dispute_resolution", "audit_trail", "legal_validity"]
      },
      "acceptance_criteria": [
        "quote_hash is generated using SHA256",
        "Hash includes: customer_id, system_size, price, timestamp",
        "quote_hash is stored in quotes table",
        "quote_hash is returned in API response"
      ],
      "target_files": [
        "src/actions/quote.ts",
        "src/utils/hash.ts"
      ],
      "passes": false
    },
    {
      "id": "S-005",
      "title": "Add discount limit validation",
      "description": "Discounts cannot exceed 10% without escalation",
      "clause_id": "SOL.G4.MAX.DISC.001",
      "severity": "SOFT",
      "invariants": ["ECONOMICS", "ESCALATION"],
      "economic_effect": {
        "type": "discount_limit",
        "max_value": 10,
        "unit": "percent",
        "affects": ["margin", "commission_base"]
      },
      "acceptance_criteria": [
        "Discount percentage is validated before quote creation",
        "Discounts > 10% trigger SOFT_FAIL requiring human approval",
        "Discounts > 20% trigger HARD_FAIL (blocked)",
        "discount_approved_by is logged if override granted"
      ],
      "target_files": [
        "src/actions/quote.ts",
        "src/validators/discount.ts"
      ],
      "passes": false
    }
  ],
  "metadata": {
    "created_at": "2026-01-12T00:00:00Z",
    "created_by": "human",
    "total_stories": 5,
    "hard_stories": 4,
    "soft_stories": 1
  }
}
EOF

echo "   ✅ ralph/prd.json created (5 stories)"
echo ""

# ============================================================================
# FILE 3: scan_manifest.yaml (Boundary Lock)
# ============================================================================

echo "📄 Creating scan_manifest.yaml..."

cat > qontrek/governance/scan_manifest.yaml << 'EOF'
# GAEP Scan Manifest v1.0
# Defines what Ralph CAN and CANNOT touch
# This file protects the governance system from AI modification

version: "1.0"
tenant: "solar"

# =============================================================================
# BOUNDARY DEFINITIONS
# =============================================================================

boundaries:
  # Files Ralph IS ALLOWED to modify
  allow:
    - "src/actions/**/*.ts"
    - "src/services/**/*.ts"
    - "src/components/**/*.tsx"
    - "src/pages/**/*.tsx"
    - "src/db/**/*.ts"
    - "src/utils/**/*.ts"
    - "src/validators/**/*.ts"
    - "src/lib/**/*.ts"

  # Files Ralph is FORBIDDEN from touching
  deny:
    - "qontrek/**"           # Governance system itself
    - "ralph/**"             # Ralph config (only human modifies)
    - "ledger/**"            # Proof ledger
    - ".env*"                # Environment secrets
    - "package.json"         # Dependencies
    - "package-lock.json"    # Lock file
    - "next.config.js"       # Build config
    - "tsconfig.json"        # TypeScript config
    - "vercel.json"          # Deployment config
    - ".git/**"              # Git internals
    - "node_modules/**"      # Dependencies

# =============================================================================
# AST SCOPE (for structural validation)
# =============================================================================

ast_scope:
  # Authority check: Ensure action handlers have who_authorized
  authority_check:
    enabled: true
    files_to_scan:
      - "src/actions/**/*.ts"
      - "src/handlers/**/*.ts"
      - "src/api/**/*.ts"
    exclude:
      - "**/*.test.ts"
      - "**/*.spec.ts"
      - "**/internal/**"
    function_patterns:
      - "*Action"
      - "*Handler"
      - "handle*"
      - "create*"
      - "update*"
      - "delete*"
    required_params:
      - "who_authorized"
      - "actor_id"         # Alternative acceptable param
    fail_severity: "HARD"

  # Tenant check: Ensure all queries have tenant_id
  tenant_check:
    enabled: true
    files_to_scan:
      - "src/db/**/*.ts"
      - "src/services/**/*.ts"
      - "src/queries/**/*.ts"
    exclude:
      - "**/*.test.ts"
      - "**/migrations/**"
    query_patterns:
      - "supabase.from"
      - "prisma."
      - "db.query"
      - ".select("
      - ".update("
      - ".delete("
    required_clauses:
      - "tenant_id"
      - ".eq('tenant_id'"
      - "where.*tenant"
    fail_severity: "HARD"

# =============================================================================
# VALIDATION RULES
# =============================================================================

validation:
  # Maximum lines changed per commit
  max_lines_changed: 500
  
  # Maximum files changed per commit
  max_files_changed: 10
  
  # Forbidden patterns in code
  forbidden_patterns:
    - pattern: "eval("
      reason: "Security risk"
      severity: "HARD"
    - pattern: "process.env"
      reason: "Direct env access forbidden - use config"
      severity: "HARD"
    - pattern: "// TODO"
      reason: "Incomplete work"
      severity: "SOFT"
    - pattern: "console.log"
      reason: "Debug code in production"
      severity: "SOFT"

# =============================================================================
# ECONOMIC BOUNDARIES
# =============================================================================

economic:
  # Maximum discount that can be coded without escalation
  max_discount_percent: 10
  
  # Maximum monetary value per transaction
  max_transaction_value: 100000
  
  # Forbidden economic actions
  forbidden_actions:
    - "direct_bank_transfer"
    - "commission_override"
    - "price_manual_set"
EOF

echo "   ✅ qontrek/governance/scan_manifest.yaml created"
echo ""

# ============================================================================
# FILE 4: validate.ts (Governance Gate)
# ============================================================================

echo "📄 Creating validate.ts..."

cat > qontrek/mcp/validate.ts << 'EOF'
/**
 * GAEP Governance Gate - validate.ts v1.0
 * 
 * This is the "constitutional wall" that Ralph cannot cross.
 * Every proposed commit must pass through this gate.
 * 
 * Usage:
 *   npx ts-node qontrek/mcp/validate.ts <commit_hash> <story_id>
 * 
 * Returns:
 *   PASS - Commit allowed
 *   SOFT_FAIL - Needs human approval
 *   HARD_FAIL - Commit blocked
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

// =============================================================================
// TYPES
// =============================================================================

interface ValidationResult {
  status: 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL';
  reason?: string;
  failed_checks: string[];
  story_id: string;
  commit_hash: string;
  timestamp: string;
}

interface ScanManifest {
  boundaries: {
    allow: string[];
    deny: string[];
  };
  ast_scope: {
    authority_check: {
      enabled: boolean;
      files_to_scan: string[];
      required_params: string[];
      fail_severity: string;
    };
    tenant_check: {
      enabled: boolean;
      files_to_scan: string[];
      required_clauses: string[];
      fail_severity: string;
    };
  };
  validation: {
    max_lines_changed: number;
    max_files_changed: number;
    forbidden_patterns: Array<{
      pattern: string;
      reason: string;
      severity: string;
    }>;
  };
}

// =============================================================================
// LOAD MANIFEST
// =============================================================================

function loadManifest(): ScanManifest {
  const manifestPath = path.join(__dirname, '../governance/scan_manifest.yaml');
  const content = fs.readFileSync(manifestPath, 'utf8');
  return yaml.load(content) as ScanManifest;
}

// =============================================================================
// GET CHANGED FILES
// =============================================================================

function getChangedFiles(commitHash: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${commitHash}~1 ${commitHash}`, {
      encoding: 'utf8'
    });
    return output.trim().split('\n').filter(f => f.length > 0);
  } catch {
    // If single commit, compare to empty tree
    try {
      const output = execSync(`git diff --name-only HEAD`, { encoding: 'utf8' });
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }
}

// =============================================================================
// CHECK: FORBIDDEN PATHS
// =============================================================================

function checkForbiddenPaths(
  changedFiles: string[], 
  manifest: ScanManifest
): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  
  for (const file of changedFiles) {
    for (const denyPattern of manifest.boundaries.deny) {
      // Simple glob matching
      const regex = new RegExp(
        '^' + denyPattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      if (regex.test(file)) {
        violations.push(`FORBIDDEN: ${file} matches deny pattern ${denyPattern}`);
      }
    }
  }
  
  return { pass: violations.length === 0, violations };
}

// =============================================================================
// CHECK: AUTHORITY MARKER
// =============================================================================

function checkAuthorityMarker(
  changedFiles: string[],
  manifest: ScanManifest
): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (!manifest.ast_scope.authority_check.enabled) {
    return { pass: true, violations: [] };
  }
  
  const requiredParams = manifest.ast_scope.authority_check.required_params;
  
  for (const file of changedFiles) {
    // Check if file matches patterns to scan
    const shouldScan = manifest.ast_scope.authority_check.files_to_scan.some(pattern => {
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      return regex.test(file);
    });
    
    if (!shouldScan) continue;
    
    // Read file content
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for action/handler functions
      const functionPatterns = [
        /async\s+function\s+\w*(Action|Handler)\s*\(/gi,
        /const\s+\w*(Action|Handler)\s*=\s*async/gi,
        /export\s+async\s+function\s+(handle|create|update|delete)\w*\s*\(/gi
      ];
      
      for (const pattern of functionPatterns) {
        if (pattern.test(content)) {
          // Check if any required param exists
          const hasRequiredParam = requiredParams.some(param => 
            content.includes(param)
          );
          
          if (!hasRequiredParam) {
            violations.push(
              `AUTHORITY: ${file} has action/handler but missing ${requiredParams.join(' or ')}`
            );
          }
        }
      }
    } catch {
      // File doesn't exist yet or can't be read
    }
  }
  
  return { pass: violations.length === 0, violations };
}

// =============================================================================
// CHECK: TENANT ISOLATION
// =============================================================================

function checkTenantIsolation(
  changedFiles: string[],
  manifest: ScanManifest
): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  
  if (!manifest.ast_scope.tenant_check.enabled) {
    return { pass: true, violations: [] };
  }
  
  const requiredClauses = manifest.ast_scope.tenant_check.required_clauses;
  
  for (const file of changedFiles) {
    // Check if file matches patterns to scan
    const shouldScan = manifest.ast_scope.tenant_check.files_to_scan.some(pattern => {
      const regex = new RegExp(
        '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
      );
      return regex.test(file);
    });
    
    if (!shouldScan) continue;
    
    // Read file content
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for query patterns
      const queryPatterns = manifest.ast_scope.tenant_check.files_to_scan;
      const hasQuery = ['.select(', '.update(', '.delete(', 'supabase.from', 'prisma.']
        .some(p => content.includes(p));
      
      if (hasQuery) {
        // Check if any required clause exists
        const hasTenantClause = requiredClauses.some(clause => 
          content.toLowerCase().includes(clause.toLowerCase())
        );
        
        if (!hasTenantClause) {
          violations.push(
            `TENANT: ${file} has database query but missing tenant_id filter`
          );
        }
      }
    } catch {
      // File doesn't exist yet or can't be read
    }
  }
  
  return { pass: violations.length === 0, violations };
}

// =============================================================================
// CHECK: FORBIDDEN PATTERNS
// =============================================================================

function checkForbiddenPatterns(
  changedFiles: string[],
  manifest: ScanManifest
): { hardFail: string[]; softFail: string[] } {
  const hardFail: string[] = [];
  const softFail: string[] = [];
  
  for (const file of changedFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      for (const rule of manifest.validation.forbidden_patterns) {
        if (content.includes(rule.pattern)) {
          const msg = `FORBIDDEN_PATTERN: ${file} contains '${rule.pattern}' - ${rule.reason}`;
          if (rule.severity === 'HARD') {
            hardFail.push(msg);
          } else {
            softFail.push(msg);
          }
        }
      }
    } catch {
      // File doesn't exist yet or can't be read
    }
  }
  
  return { hardFail, softFail };
}

// =============================================================================
// CHECK: SIZE LIMITS
// =============================================================================

function checkSizeLimits(
  changedFiles: string[],
  commitHash: string,
  manifest: ScanManifest
): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Check file count
  if (changedFiles.length > manifest.validation.max_files_changed) {
    violations.push(
      `SIZE: ${changedFiles.length} files changed, max is ${manifest.validation.max_files_changed}`
    );
  }
  
  // Check line count
  try {
    const output = execSync(`git diff --stat ${commitHash}~1 ${commitHash}`, {
      encoding: 'utf8'
    });
    const match = output.match(/(\d+) insertions?\(\+\), (\d+) deletions?\(-\)/);
    if (match) {
      const totalLines = parseInt(match[1]) + parseInt(match[2]);
      if (totalLines > manifest.validation.max_lines_changed) {
        violations.push(
          `SIZE: ${totalLines} lines changed, max is ${manifest.validation.max_lines_changed}`
        );
      }
    }
  } catch {
    // Can't get stats, skip this check
  }
  
  return { pass: violations.length === 0, violations };
}

// =============================================================================
// MAIN VALIDATION
// =============================================================================

function validate(commitHash: string, storyId: string): ValidationResult {
  const timestamp = new Date().toISOString();
  const failedChecks: string[] = [];
  let hasSoftFail = false;
  let hasHardFail = false;
  
  console.log('\n========================================');
  console.log('  GAEP GOVERNANCE GATE v1.0');
  console.log('========================================');
  console.log(`  Commit: ${commitHash}`);
  console.log(`  Story:  ${storyId}`);
  console.log(`  Time:   ${timestamp}`);
  console.log('========================================\n');
  
  // Load manifest
  const manifest = loadManifest();
  console.log('📋 Loaded scan_manifest.yaml\n');
  
  // Get changed files
  const changedFiles = getChangedFiles(commitHash);
  console.log(`📁 Changed files (${changedFiles.length}):`);
  changedFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');
  
  // CHECK 1: Forbidden paths
  console.log('🔒 Check 1: Forbidden Paths');
  const pathCheck = checkForbiddenPaths(changedFiles, manifest);
  if (!pathCheck.pass) {
    hasHardFail = true;
    failedChecks.push(...pathCheck.violations);
    pathCheck.violations.forEach(v => console.log(`   ❌ ${v}`));
  } else {
    console.log('   ✅ No forbidden paths touched');
  }
  console.log('');
  
  // CHECK 2: Authority marker
  console.log('🔐 Check 2: Authority Marker');
  const authCheck = checkAuthorityMarker(changedFiles, manifest);
  if (!authCheck.pass) {
    hasHardFail = true;
    failedChecks.push(...authCheck.violations);
    authCheck.violations.forEach(v => console.log(`   ❌ ${v}`));
  } else {
    console.log('   ✅ Authority markers present');
  }
  console.log('');
  
  // CHECK 3: Tenant isolation
  console.log('🏢 Check 3: Tenant Isolation');
  const tenantCheck = checkTenantIsolation(changedFiles, manifest);
  if (!tenantCheck.pass) {
    hasHardFail = true;
    failedChecks.push(...tenantCheck.violations);
    tenantCheck.violations.forEach(v => console.log(`   ❌ ${v}`));
  } else {
    console.log('   ✅ Tenant isolation enforced');
  }
  console.log('');
  
  // CHECK 4: Forbidden patterns
  console.log('⚠️  Check 4: Forbidden Patterns');
  const patternCheck = checkForbiddenPatterns(changedFiles, manifest);
  if (patternCheck.hardFail.length > 0) {
    hasHardFail = true;
    failedChecks.push(...patternCheck.hardFail);
    patternCheck.hardFail.forEach(v => console.log(`   ❌ ${v}`));
  }
  if (patternCheck.softFail.length > 0) {
    hasSoftFail = true;
    failedChecks.push(...patternCheck.softFail);
    patternCheck.softFail.forEach(v => console.log(`   ⚠️  ${v}`));
  }
  if (patternCheck.hardFail.length === 0 && patternCheck.softFail.length === 0) {
    console.log('   ✅ No forbidden patterns found');
  }
  console.log('');
  
  // CHECK 5: Size limits
  console.log('📏 Check 5: Size Limits');
  const sizeCheck = checkSizeLimits(changedFiles, commitHash, manifest);
  if (!sizeCheck.pass) {
    hasSoftFail = true;
    failedChecks.push(...sizeCheck.violations);
    sizeCheck.violations.forEach(v => console.log(`   ⚠️  ${v}`));
  } else {
    console.log('   ✅ Size within limits');
  }
  console.log('');
  
  // FINAL RESULT
  console.log('========================================');
  let status: 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL';
  let reason: string | undefined;
  
  if (hasHardFail) {
    status = 'HARD_FAIL';
    reason = 'Governance violation - commit blocked';
    console.log('  🔴 RESULT: HARD_FAIL');
    console.log('  📛 Commit BLOCKED');
  } else if (hasSoftFail) {
    status = 'SOFT_FAIL';
    reason = 'Needs human approval';
    console.log('  🟡 RESULT: SOFT_FAIL');
    console.log('  ⏳ Needs human approval');
  } else {
    status = 'PASS';
    console.log('  🟢 RESULT: PASS');
    console.log('  ✅ Commit ALLOWED');
  }
  console.log('========================================\n');
  
  // Log to ledger (simple file for v0)
  const logEntry = {
    timestamp,
    commit_hash: commitHash,
    story_id: storyId,
    status,
    failed_checks: failedChecks,
    changed_files: changedFiles
  };
  
  const ledgerPath = path.join(__dirname, '../ledger/validation_log.json');
  let ledger: any[] = [];
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch {
    // File doesn't exist, start fresh
  }
  ledger.push(logEntry);
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  console.log(`📝 Logged to ${ledgerPath}\n`);
  
  return {
    status,
    reason,
    failed_checks: failedChecks,
    story_id: storyId,
    commit_hash: commitHash,
    timestamp
  };
}

// =============================================================================
// CLI ENTRY POINT
// =============================================================================

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx ts-node validate.ts <commit_hash> <story_id>');
  console.log('Example: npx ts-node validate.ts abc123 S-001');
  process.exit(1);
}

const [commitHash, storyId] = args;
const result = validate(commitHash, storyId);

// Exit with appropriate code
if (result.status === 'HARD_FAIL') {
  process.exit(1);
} else if (result.status === 'SOFT_FAIL') {
  process.exit(2);
} else {
  process.exit(0);
}
EOF

echo "   ✅ qontrek/mcp/validate.ts created"
echo ""

# ============================================================================
# FILE 5: arbitrator.yaml (with SLA)
# ============================================================================

echo "📄 Creating arbitrator.yaml..."

cat > qontrek/governance/arbitrator.yaml << 'EOF'
# GAEP Arbitrator Rules v1.0
# Defines WHO can override WHAT and for HOW LONG

version: "1.0"
tenant: "solar"

# =============================================================================
# ARBITRATORS (Who can approve what)
# =============================================================================

arbitrators:
  OWNER:
    description: "Business owner - highest authority"
    can_override: ["SOFT"]
    cannot_override: ["HARD"]
    max_override_value: 50000
    requires_justification: true
    sla_hours: 24
    on_timeout: "BLOCK"

  FINANCE:
    description: "Finance manager"
    can_override: ["SOFT"]
    scope: ["G4_financial", "discount", "payment"]
    max_override_value: 10000
    requires_justification: true
    sla_hours: 8
    on_timeout: "ESCALATE_UP"

  PROJECT_MANAGER:
    description: "Project manager"
    can_override: []
    cannot_override: ["SOFT", "HARD"]
    sla_hours: 4
    on_timeout: "ESCALATE_UP"

  BD_MANAGER:
    description: "Business development manager"
    can_override: []
    scope: ["quote_review"]
    sla_hours: 2
    on_timeout: "ESCALATE_UP"

# =============================================================================
# ESCALATION CHAIN
# =============================================================================

escalation_chain:
  default: ["BD_MANAGER", "PROJECT_MANAGER", "FINANCE", "OWNER"]
  financial: ["FINANCE", "OWNER"]
  legal: ["OWNER"]
  technical: ["PROJECT_MANAGER", "OWNER"]

# =============================================================================
# ABSOLUTE BLOCKS (No one can override)
# =============================================================================

absolute_blocks:
  - clause_id: "SOL.G4.BANK.REG.001"
    reason: "Unregistered bank account - always block"
  - clause_id: "SOL.G1.COMMIT.AUTH.001"
    reason: "Unauthorized commit - always block"
  - clause_id: "SOL.G4.TENANT.LEAK.001"
    reason: "Cross-tenant data leakage - always block"

# =============================================================================
# TIMEOUT ACTIONS
# =============================================================================

timeout_actions:
  BLOCK: "Reject action, log timeout violation"
  ESCALATE_UP: "Move to next in chain, reset SLA"
  AUTO_REJECT: "Reject with reason: governance_timeout"
  NOTIFY_ONLY: "Continue waiting, send reminder"

# =============================================================================
# APPROVAL REQUIREMENTS
# =============================================================================

approval_requirements:
  # Discounts over 10% need FINANCE or higher
  discount_over_10:
    min_role: "FINANCE"
    requires_justification: true
    log_to_ledger: true

  # New customer onboarding needs PM
  new_customer:
    min_role: "PROJECT_MANAGER"
    requires_justification: false
    log_to_ledger: true

  # Payment changes need OWNER
  payment_change:
    min_role: "OWNER"
    requires_justification: true
    log_to_ledger: true
EOF

echo "   ✅ qontrek/governance/arbitrator.yaml created"
echo ""

# ============================================================================
# FILE 6: policy.yaml (Solar Policy v1.0)
# ============================================================================

echo "📄 Creating policy.yaml..."

cat > qontrek/governance/policy.yaml << 'EOF'
# Solar Policy Engine v1.0
# 12 clauses governing Voltek Solar operations

version: "1.0"
tenant: "solar"
effective_date: "2026-01-12"

# =============================================================================
# G1: AUTHORITY CLAUSES
# =============================================================================

gates:
  G1_authority:
    - clause_id: "SOL.G1.REQ_DEP.AUTH.001"
      action: "REQUEST_DEPOSIT"
      require: "role IN ['FINANCE', 'OWNER']"
      severity: "HARD"
      message: "Only FINANCE or OWNER can request deposits"

    - clause_id: "SOL.G1.COMMIT.AUTH.001"
      action: "COMMIT_ORDER"
      require: "role IN ['PM', 'OWNER']"
      severity: "HARD"
      message: "Only PM or OWNER can commit orders"

# =============================================================================
# G2: SCOPE CLAUSES
# =============================================================================

  G2_scope:
    - clause_id: "SOL.G2.QUOTE.SYS.001"
      action: "GENERATE_QUOTE"
      require: "price_source = 'system'"
      severity: "HARD"
      message: "All prices must be system-generated"

    - clause_id: "SOL.G2.PROP.TPL.001"
      action: "CREATE_PROPOSAL"
      require: "template IN approved_templates"
      severity: "HARD"
      message: "Proposals must use approved templates only"

    - clause_id: "SOL.G2.BOM.LOCK.001"
      action: "FINALIZE_BOM"
      require: "bom_hash = proposal_hash"
      severity: "HARD"
      message: "BOM must match proposal hash"

    - clause_id: "SOL.G2.CLAIM.FORBID.001"
      action: "CREATE_CONTENT"
      forbid: "text CONTAINS 'guaranteed savings'"
      severity: "HARD"
      message: "No guaranteed savings claims allowed"

    - clause_id: "SOL.G2.QUOTE.PROOF.001"
      action: "GENERATE_QUOTE"
      require: "quote_hash EXISTS"
      severity: "HARD"
      message: "Every quote must have proof hash"

# =============================================================================
# G3: DATA LEGALITY CLAUSES
# =============================================================================

  G3_data:
    - clause_id: "SOL.G3.CONSENT.REQ.001"
      action: "STORE_CUSTOMER_DATA"
      require: "consent_given = true"
      severity: "HARD"
      message: "Customer consent required before storing data"

    - clause_id: "SOL.G3.DATA.MIN.001"
      action: "CREATE_QUOTE"
      require: "address EXISTS AND tnb_bill EXISTS"
      severity: "SOFT"
      message: "Minimum data: address + TNB bill required"

# =============================================================================
# G4: FINANCIAL CLAUSES
# =============================================================================

  G4_financial:
    - clause_id: "SOL.G4.MAX.DISC.001"
      action: "APPLY_DISCOUNT"
      require: "discount_percent <= 10"
      severity: "SOFT"
      message: "Discounts over 10% require approval"
      escalate_to: "FINANCE"

    - clause_id: "SOL.G4.MIN.MARGIN.001"
      action: "FINALIZE_QUOTE"
      require: "margin_percent >= 15"
      severity: "SOFT"
      message: "Minimum margin 15% required"
      escalate_to: "FINANCE"

    - clause_id: "SOL.G4.BANK.REG.001"
      action: "RECEIVE_PAYMENT"
      require: "bank_account IN registered_accounts"
      severity: "HARD"
      message: "Only registered bank accounts allowed"

    - clause_id: "SOL.G4.DEPOSIT.LIMIT.001"
      action: "REQUEST_DEPOSIT"
      require: "deposit_percent <= 30"
      severity: "SOFT"
      message: "Maximum deposit 30% of contract"
      escalate_to: "OWNER"

    - clause_id: "SOL.G4.TENANT.001"
      action: "ANY_DATA_ACCESS"
      require: "tenant_id = current_tenant"
      severity: "HARD"
      message: "Cross-tenant data access forbidden"

# =============================================================================
# G5: JURISDICTION CLAUSES
# =============================================================================

  G5_jurisdiction:
    - clause_id: "SOL.G5.TPL.B2C.001"
      action: "CREATE_CONTRACT"
      require: "template IN my_approved_templates"
      severity: "HARD"
      message: "Only MY-approved contract templates allowed"

# =============================================================================
# METADATA
# =============================================================================

metadata:
  total_clauses: 15
  hard_clauses: 11
  soft_clauses: 4
  last_updated: "2026-01-12"
  updated_by: "system"
EOF

echo "   ✅ qontrek/governance/policy.yaml created (15 clauses)"
echo ""

# ============================================================================
# FILE 7: Empty ledger initialization
# ============================================================================

echo "📄 Initializing ledger..."

cat > qontrek/ledger/validation_log.json << 'EOF'
[]
EOF

echo "   ✅ qontrek/ledger/validation_log.json initialized"
echo ""

# ============================================================================
# FILE 8: agents.md (Long-term memory)
# ============================================================================

echo "📄 Creating agents.md..."

cat > ralph/agents.md << 'EOF'
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
EOF

echo "   ✅ ralph/agents.md created"
echo ""

# ============================================================================
# FILE 9: progress.txt (Iteration log)
# ============================================================================

echo "📄 Creating progress.txt..."

cat > ralph/progress.txt << 'EOF'
# GAEP Progress Log

## Session Start
Timestamp: (will be populated by Ralph)
PRD: Solar Quote Enhancement
Stories: 5

## Iterations
(Ralph will log each iteration here)
EOF

echo "   ✅ ralph/progress.txt created"
echo ""

# ============================================================================
# FILE 10: ralph.sh instructions
# ============================================================================

echo "📄 Creating ralph_hook_instructions.md..."

cat > ralph/ralph_hook_instructions.md << 'EOF'
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
EOF

echo "   ✅ ralph/ralph_hook_instructions.md created"
echo ""

# ============================================================================
# INSTALL DEPENDENCIES (if package.json exists)
# ============================================================================

echo "📦 Checking dependencies..."

if [ -f "package.json" ]; then
  # Check if js-yaml is installed
  if ! grep -q "js-yaml" package.json; then
    echo "   Installing js-yaml..."
    npm install js-yaml --save-dev 2>/dev/null || echo "   ⚠️  Run: npm install js-yaml --save-dev"
  fi
  
  if ! grep -q "ts-node" package.json; then
    echo "   Installing ts-node..."
    npm install ts-node --save-dev 2>/dev/null || echo "   ⚠️  Run: npm install ts-node --save-dev"
  fi
else
  echo "   ⚠️  No package.json found. Run these manually:"
  echo "      npm install js-yaml ts-node --save-dev"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "============================================"
echo "  ✅ GAEP SETUP COMPLETE!"
echo "============================================"
echo ""
echo "📁 Created structure:"
echo "   qontrek/"
echo "   ├── governance/"
echo "   │   ├── scan_manifest.yaml"
echo "   │   ├── arbitrator.yaml"
echo "   │   └── policy.yaml"
echo "   ├── mcp/"
echo "   │   └── validate.ts"
echo "   └── ledger/"
echo "       └── validation_log.json"
echo ""
echo "   ralph/"
echo "   ├── PRD.md"
echo "   ├── prd.json"
echo "   ├── agents.md"
echo "   ├── progress.txt"
echo "   └── ralph_hook_instructions.md"
echo ""
echo "📋 Next steps:"
echo "   1. Review PRD.md and adjust for your feature"
echo "   2. Review prd.json stories"
echo "   3. Install deps: npm install js-yaml ts-node --save-dev"
echo "   4. Test validate.ts: npx ts-node qontrek/mcp/validate.ts HEAD S-001"
echo "   5. Modify ralph.sh per ralph_hook_instructions.md"
echo "   6. Run Ralph and watch for FIRST BLOCK!"
echo ""
echo "🎯 Success = Ralph gets BLOCKED for valid reason"
echo "============================================"
EOF

echo "   ✅ setup-gaep.sh created"
echo ""

chmod +x /home/claude/setup-gaep.sh

echo "============================================"
echo "  SETUP SCRIPT READY!"
echo "============================================"
