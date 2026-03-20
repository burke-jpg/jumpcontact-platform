# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in JumpContact Platform, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainers directly with:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. Potential impact assessment
4. Any suggested fixes (if applicable)

### What to Expect

- **Acknowledgment** within 48 hours
- **Assessment** within 5 business days
- **Fix or mitigation** timeline communicated after assessment

## Security Best Practices

When contributing to this project, please follow these guidelines:

### Environment Variables

- Never commit `.env` files or API keys to the repository
- Use `.env.local` for local development (already in `.gitignore`)
- Rotate credentials immediately if accidentally exposed

### API Security

- All Twilio recording access is proxied through `/api/calls/recording` to avoid exposing credentials client-side
- Google Sheets access uses server-side service account authentication
- API routes should validate and sanitize all query parameters

### Dependencies

- Keep dependencies up to date with `npm audit`
- Review dependency changes in pull requests
- Use `npm audit fix` to resolve known vulnerabilities

## Scope

This security policy covers the JumpContact Platform codebase and its deployment infrastructure. Third-party services (Twilio, Google Sheets) have their own security policies.
