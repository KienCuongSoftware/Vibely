# Vibely Automation

Selenium + JUnit 5 + Allure: **login → upload → For You engage** (like / follow / comment / favorite).

## Requirements

- JDK 25+
- Maven 3.9+
- Brave (default), or Chrome / Edge / Firefox
- Frontend at `base.url` + backend
- A short local `.mp4` for upload tests

## Configure

```powershell
copy src\test\resources\credentials.local.properties.example src\test\resources\credentials.local.properties
```

```properties
test.user.email=you@example.com
test.user.password=your-password
test.video.path=C:\\Users\\Admin\\Downloads\\your-video.mp4
```

## Run

```powershell
cd automation
mvn test
```

Default group is `upload`: one browser session — login, publish, then `/foryou` like / follow (if shown) / comment / favorite.

```powershell
mvn test -Dgroups=login
```

## Layout

- `login/LoginTest` — login only
- `upload/UploadTest` — upload then feed engagement
- `pages/LoginPage`, `UploadPage`, `FeedPage`
