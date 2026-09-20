VYNT GitHub Configuration

This directory contains GitHub configuration, issue templates, and automated workflows for the VYNT repository.

Contents

Issue Templates

* ISSUE_TEMPLATE/bug_report.md — Report bugs or unexpected behavior.
* ISSUE_TEMPLATE/feature_request.md — Suggest new features or improvements.

Workflows

* workflows/docs-check.yml — Verifies required public documentation files.
* workflows/markdown-lint.yml — Checks Markdown formatting.
* workflows/link-check.yml — Checks links in public documentation.
* workflows/release.yml — Creates GitHub releases when a version tag is pushed.
* workflows/security.yml — Runs repository security checks.
* workflows/dependency-review.yml — Reviews dependency changes for known security issues.

Repository Scope

The public VYNT repository contains product documentation, public project information, release information, examples, and repository configuration.

The proprietary VYNT application source code, production infrastructure, private credentials, API secrets, OAuth secrets, database credentials, license secrets, and other confidential technology are not stored in this repository.

Security

Never commit:

* API keys
* OAuth client secrets
* Stripe secret keys
* Database credentials
* Private license keys
* Authentication secrets
* Production environment variables
* Private user data

Security issues should be reported according to the repository’s security policy.
