# Security Policy

## Supported Versions

Only the latest `main` branch is actively supported with security updates.

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Instead, report vulnerabilities privately via:

- GitHub: [KienCuongSoftware](https://github.com/KienCuongSoftware)

When reporting, include:

- A clear description of the issue
- Steps to reproduce
- Potential impact
- Suggested remediation (if known)

## Response Process

- Acknowledgement target: within 72 hours
- Initial triage and severity assessment
- Fix development and validation
- Responsible disclosure after patch release

## Security Configuration Notes

- Never commit real secrets to source control.
- Use environment variables for `DB_PASSWORD`, `JWT_SECRET`, and production DB credentials.
- Rotate JWT secret and database credentials after any suspected exposure.

## Operational Hardening

- Use `X-Request-Id` for request tracing in logs during incident response.
- Keep refresh tokens short-lived in production and revoke tokens on suspicious activity.
