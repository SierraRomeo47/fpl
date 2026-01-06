# Cursor Rules for FPL DnD

This folder contains rules that Cursor AI should reference before executing any command or making code changes.

## Rule Files

- **security.md** - Security best practices and critical checks
- **safety.md** - Error handling, validation, and resource management
- **design.md** - UI/UX, responsive design, and accessibility
- **deployment.md** - Build, deployment, and pre-deployment checks
- **code-quality.md** - TypeScript, code organization, and Git practices
- **never-do.md** - Absolute prohibitions and critical rules
- **hetzner-cloud.md** - Hetzner Cloud specific deployment rules

## How to Use

Cursor AI should automatically reference these rules before:
- Making code changes
- Executing commands
- Creating new files
- Modifying existing code
- Preparing for deployment

## Priority Order

1. **never-do.md** - Check first, these are absolute prohibitions
2. **security.md** - Critical security checks
3. **safety.md** - Error handling and validation
4. **code-quality.md** - Code standards
5. **design.md** - UI/UX standards
6. **deployment.md** - Before any deployment
7. **hetzner-cloud.md** - For Hetzner Cloud operations

## Quick Reference

Before every action, ask:
1. ❌ Does this violate any "NEVER DO" rule?
2. 🔒 Does this create a security risk?
3. 🛡️ Is error handling in place?
4. ✅ Does this follow code quality standards?
5. 🎨 Is the design responsive and accessible?
6. 🚀 Is this ready for deployment?

---

**Last Updated:** 2025-01-XX
**Project:** FPL DnD

