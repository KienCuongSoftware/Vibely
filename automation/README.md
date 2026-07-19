# Vibely Automation

Selenium + JUnit 5 + Allure UI tests focused on **login** only.

## Requirements

- JDK 25+
- Maven 3.9+
- Brave (default), or Chrome / Edge / Firefox
- Frontend at `base.url` + backend for real login

## Configure

Edit `src/test/resources/config.properties`:

```properties
base.url=http://localhost:5173
browser=brave
headless=false
brave.path=C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe
```

Copy credentials (gitignored):

```bash
cp src/test/resources/credentials.local.properties.example src/test/resources/credentials.local.properties
```

Or set `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`.

## Run

```bash
cd automation

# Login with credentials.local.properties (default)
mvn test
```


### Captcha

With backend profile `dev`, `auth-protection-enabled` defaults to **false** so Selenium is not blocked by the captcha slider.

## Layout

- `src/test/java/.../login/LoginTest.java` — login scenarios
- `src/main/java/.../pages/LoginPage.java` — login page object
- `src/main/java/.../driver/` — Brave/Chrome/Edge/Firefox drivers
