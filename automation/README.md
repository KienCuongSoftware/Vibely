# Vibely Automation

Selenium flows: **login**, **signup**, **upload + For You engage**, **A↔B direct messages**.

## Configure

```powershell
copy src\test\resources\credentials.local.properties.example src\test\resources\credentials.local.properties
```

```properties
test.user.email=a@example.com
test.user.password=...
test.user.username=auser
test.user.b.email=b@example.com
test.user.b.password=...
test.user.b.username=buser
test.video.path=C:\\path\\to\\video.mp4
action.delay.ms=2000
```

## Run

```powershell
cd automation

# Default: A messages B → B accepts → B replies
mvn test

mvn test -Dgroups=upload
mvn test -Dgroups=login
mvn test -Dgroups=signup
mvn test -Dgroups=message

# Chậm hơn khi xem tay (vd 3 giây mỗi thao tác)
mvn test -Dgroups=upload "-Daction.delay.ms=3000"
```

## Flow (signup)

1. Open `/signup` → **Sử dụng email**  
2. DOB + email + password → OTP via API (`challengePassed`) when `expose-code-in-api` is on  
3. Enter OTP → **Tiếp** → Vibely ID → **Đăng ký**

Local tip: set `app.mail.expose-code-in-api: true` (dev only) so `demoCode` is returned. Override OTP with `test.signup.otp` if needed.

## Flow (message)

1. Login A → open `/@{B}` → **Tin nhắn** → send first message  
2. Logout A → login B → **Yêu cầu tin nhắn** → **Chấp nhận** → reply  
