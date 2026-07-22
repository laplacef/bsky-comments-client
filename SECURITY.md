# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

Only the latest release receives security patches.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

To report a vulnerability, use [GitHub's private vulnerability reporting](https://github.com/laplacef/bsky-comments-client/security/advisories/new). You can expect an initial response within 72 hours.

Please include:
- A description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment

## Scope

The following are considered security issues:
- Cross-site scripting through rendered post or profile content
- Reader IP address or request metadata leaking to Bluesky when proxy mode is configured
- Dependency vulnerabilities in the build toolchain that reach the published bundle

## Out of Scope

The following are **not** security issues:
- Availability or rate limiting of Bluesky's public API
- Vulnerabilities in Bluesky itself, or in content authored by Bluesky users
- Moderation or content quality of the rendered thread
