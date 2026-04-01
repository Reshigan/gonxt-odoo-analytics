# Changelog

All notable changes to the GONXT Odoo Analytics Platform will be documented in this file.

## [2.0.1] - 2026-04-01
### Fixed
- CI/CD deployment failures due to React dependency conflicts
- TypeScript compilation errors in Next.js App Router pages
- Cloudflare authentication issues in GitHub Actions workflows
- Missing comprehensive error reporting and diagnostics

### Changed
- Enhanced CI/CD workflow with detailed logging and error handling
- Improved Cloudflare token validation with remediation guidance
- Updated dependency installation to handle peer conflicts with --legacy-peer-deps
- Added npx-based wrangler command execution for reliability

### Added
- Comprehensive diagnostic information for deployment troubleshooting
- Clear error messages with specific remediation steps
- Job differentiation in CI/CD workflow for easier troubleshooting
- Automated deployment on merge to main with failure continuation