/**
 * GAEP Governance Gate - validate.ts v1.3 (FIXED PATH RESOLUTION)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

interface ValidationResult {
  status: 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL';
  reason?: string;
  failed_checks: string[];
  story_id: string;
  commit_hash: string;
  timestamp: string;
}

interface ScanManifest {
  boundaries: { allow: string[]; deny: string[] };
  ast_scope: {
    authority_check: { enabled: boolean; files_to_scan: string[]; required_params: string[]; fail_severity: string };
    tenant_check: { enabled: boolean; files_to_scan: string[]; required_clauses: string[]; fail_severity: string };
  };
  validation: { max_lines_changed: number; max_files_changed: number; forbidden_patterns: Array<{ pattern: string; reason: string; severity: string }> };
}

function loadManifest(): ScanManifest {
  const manifestPath = path.join(__dirname, '../governance/scan_manifest.yaml');
  const content = fs.readFileSync(manifestPath, 'utf8');
  return yaml.load(content) as ScanManifest;
}

function getChangedFiles(commitHash: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${commitHash}~1 ${commitHash}`, { encoding: 'utf8' });
    return output.trim().split('\n').filter(f => f.length > 0);
  } catch {
    try {
      const output = execSync(`git diff --name-only HEAD`, { encoding: 'utf8' });
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch { return []; }
  }
}

// Resolve file path - handle monorepo structure
function resolveFilePath(gitPath: string): string {
  // Try the path as-is first
  if (fs.existsSync(gitPath)) return gitPath;
  
  // If running from apps/solar-demo, strip that prefix
  const stripped = gitPath.replace(/^apps\/solar-demo\//, '');
  if (fs.existsSync(stripped)) return stripped;
  
  // Try from git root
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    const fullPath = path.join(gitRoot, gitPath);
    if (fs.existsSync(fullPath)) return fullPath;
  } catch {}
  
  return gitPath; // Return original if nothing works
}

function checkForbiddenPaths(changedFiles: string[], manifest: ScanManifest): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const file of changedFiles) {
    for (const denyPattern of manifest.boundaries.deny) {
      const regex = new RegExp(denyPattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      if (regex.test(file)) {
        violations.push(`FORBIDDEN: ${file} matches deny pattern ${denyPattern}`);
      }
    }
  }
  return { pass: violations.length === 0, violations };
}

function checkAuthorityMarker(changedFiles: string[], manifest: ScanManifest): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  if (!manifest.ast_scope.authority_check.enabled) return { pass: true, violations: [] };

  for (const gitPath of changedFiles) {
    // Check if file is in actions or handlers folder
    const isActionFile = gitPath.includes('/actions/') || gitPath.includes('/handlers/');
    const isTsFile = gitPath.endsWith('.ts') || gitPath.endsWith('.tsx');
    const isTestFile = gitPath.includes('.test.') || gitPath.includes('.spec.');
    
    if (!isActionFile || !isTsFile || isTestFile) continue;

    const filePath = resolveFilePath(gitPath);
    console.log(`   📄 Checking: ${gitPath}`);
    console.log(`      Resolved to: ${filePath}`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Find all async function declarations
      const functionRegex = /export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/g;
      let match;
      let foundFunctions = false;
      
      while ((match = functionRegex.exec(content)) !== null) {
        foundFunctions = true;
        const funcName = match[1];
        const params = match[2];
        
        console.log(`      🔍 Found: ${funcName}(${params.trim()})`);
        
        // Check if function name suggests it's an action/handler
        const isActionOrHandler = /action|handler|handle|create|update|delete/i.test(funcName);
        
        if (isActionOrHandler) {
          // Check if who_authorized or actor_id is in parameters
          const hasAuthority = /who_authorized|actor_id|authorizedBy|userId/i.test(params);
          
          console.log(`      🎯 Action/Handler: YES | Authority param: ${hasAuthority ? 'YES' : 'NO'}`);
          
          if (!hasAuthority) {
            violations.push(`AUTHORITY: ${gitPath} - '${funcName}()' missing authority parameter`);
          }
        }
      }
      
      if (!foundFunctions) {
        console.log(`      ℹ️  No exported async functions found`);
      }
    } catch (e: any) { 
      console.log(`      ⚠️ Error: ${e.message}`);
    }
  }
  
  return { pass: violations.length === 0, violations };
}

function checkTenantIsolation(changedFiles: string[], manifest: ScanManifest): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  if (!manifest.ast_scope.tenant_check.enabled) return { pass: true, violations: [] };

  for (const gitPath of changedFiles) {
    const isDbFile = gitPath.includes('/db/') || gitPath.includes('/services/') || gitPath.includes('/queries/');
    if (!isDbFile) continue;
    
    const filePath = resolveFilePath(gitPath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hasQuery = ['.select(', '.update(', '.delete(', 'supabase.from', 'prisma.'].some(p => content.includes(p));
      
      if (hasQuery) {
        const hasTenantClause = /tenant_id|\.eq\s*\(\s*['"]tenant|where.*tenant/i.test(content);
        if (!hasTenantClause) {
          violations.push(`TENANT: ${gitPath} has database query but missing tenant_id filter`);
        }
      }
    } catch {}
  }
  
  return { pass: violations.length === 0, violations };
}

function checkForbiddenPatterns(changedFiles: string[], manifest: ScanManifest): { hardFail: string[]; softFail: string[] } {
  const hardFail: string[] = [];
  const softFail: string[] = [];
  
  for (const gitPath of changedFiles) {
    const filePath = resolveFilePath(gitPath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const rule of manifest.validation.forbidden_patterns) {
        if (content.includes(rule.pattern)) {
          const msg = `PATTERN: ${gitPath} contains '${rule.pattern}' - ${rule.reason}`;
          if (rule.severity === 'HARD') hardFail.push(msg);
          else softFail.push(msg);
        }
      }
    } catch {}
  }
  
  return { hardFail, softFail };
}

function validate(commitHash: string, storyId: string): ValidationResult {
  const timestamp = new Date().toISOString();
  const failedChecks: string[] = [];
  let hasSoftFail = false;
  let hasHardFail = false;
  
  console.log('\n========================================');
  console.log('  GAEP GOVERNANCE GATE v1.3');
  console.log('========================================');
  console.log(`  Commit: ${commitHash}`);
  console.log(`  Story:  ${storyId}`);
  console.log(`  Time:   ${timestamp}`);
  console.log('========================================\n');
  
  const manifest = loadManifest();
  console.log('📋 Loaded scan_manifest.yaml\n');
  
  const changedFiles = getChangedFiles(commitHash);
  console.log(`📁 Changed files (${changedFiles.length}):`);
  changedFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');
  
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
  
  console.log('🔐 Check 2: Authority Marker');
  const authCheck = checkAuthorityMarker(changedFiles, manifest);
  if (!authCheck.pass) {
    hasHardFail = true;
    failedChecks.push(...authCheck.violations);
    authCheck.violations.forEach(v => console.log(`   ❌ ${v}`));
  } else {
    console.log('   ✅ All action/handlers have authority params');
  }
  console.log('');
  
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
  
  console.log('========================================');
  let status: 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL';
  let reason: string | undefined;
  
  if (hasHardFail) {
    status = 'HARD_FAIL';
    reason = 'Governance violation - commit blocked';
    console.log('  🔴 RESULT: HARD_FAIL');
    console.log('  📛 Commit BLOCKED');
    console.log('');
    console.log('  Failed checks:');
    failedChecks.forEach(c => console.log(`    - ${c}`));
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
  
  const logEntry = { timestamp, commit_hash: commitHash, story_id: storyId, status, failed_checks: failedChecks };
  const ledgerPath = path.join(__dirname, '../ledger/validation_log.json');
  let ledger: any[] = [];
  try { ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8')); } catch {}
  ledger.push(logEntry);
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
  console.log(`📝 Logged to ${ledgerPath}\n`);
  
  return { status, reason, failed_checks: failedChecks, story_id: storyId, commit_hash: commitHash, timestamp };
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npx tsx validate.ts <commit_hash> <story_id>');
  process.exit(1);
}

const [commitHash, storyId] = args;
const result = validate(commitHash, storyId);

if (result.status === 'HARD_FAIL') process.exit(1);
else if (result.status === 'SOFT_FAIL') process.exit(2);
else process.exit(0);
