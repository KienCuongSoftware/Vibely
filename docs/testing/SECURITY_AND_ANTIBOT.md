# Security & Anti-Bot Testing

## Test cases

| Case | Expected |
|------|----------|
| Login without captcha when risk low | 200 |
| Login high risk without header | 428 |
| Reuse verification token (after successful login) | 400 |
| Failed login with wrong password | Token captcha **not** consumed; retry OK |
| Failed register | Token captcha **not** consumed until user saved |
| `send-code` REGISTER with LOGIN captcha token | Rejected |
| `send-code` PASSWORD_RESET + reset-password | 200, password updated |
| `send-code` unknown email (PASSWORD_RESET) | 200 generic, no email sent |
| Failed login escalation | harder challenge level |
| Selenium webdriver flag | elevated risk score |
| Captcha instant solve | rejected |
| Linear mouse samples | behavior suspicious |
| Slider captcha drag | Puzzle piece visible and moves with slider |

## Tools

- OWASP ZAP baseline scan (CI roadmap)
- k6 credential stuffing simulation (staging only)

## 10–15.

Regression suite for `AuthProtectionService` and `VerificationTokenStore` with embedded Redis.
