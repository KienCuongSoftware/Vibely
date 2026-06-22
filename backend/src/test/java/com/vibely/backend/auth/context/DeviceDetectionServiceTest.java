package com.vibely.backend.auth.context;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DeviceDetectionServiceTest {

    private final DeviceDetectionService service = new DeviceDetectionService();

    @Test
    void detectsChromeOnWindowsDesktop() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        );

        assertThat(info.browser()).isEqualTo("Chrome");
        assertThat(info.operatingSystem()).isEqualTo("Windows");
        assertThat(info.deviceType()).isEqualTo("Desktop");
        assertThat(info.displayName()).isEqualTo("Chrome trên Windows");
    }

    @Test
    void prefersBrowserHintForBrave() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Brave"
        );

        assertThat(info.browser()).isEqualTo("Brave");
        assertThat(info.operatingSystem()).isEqualTo("Windows");
        assertThat(info.displayName()).isEqualTo("Brave trên Windows");
    }

    @Test
    void detectsSafariOnIphone() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
                + "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        );

        assertThat(info.browser()).isEqualTo("Safari");
        assertThat(info.operatingSystem()).isEqualTo("iOS");
        assertThat(info.deviceType()).isEqualTo("Mobile");
        assertThat(info.displayName()).isEqualTo("Safari trên iPhone");
    }

    @Test
    void detectsFirefoxOnUbuntu() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"
        );

        assertThat(info.browser()).isEqualTo("Firefox");
        assertThat(info.operatingSystem()).isEqualTo("Ubuntu");
        assertThat(info.deviceType()).isEqualTo("Desktop");
        assertThat(info.displayName()).isEqualTo("Firefox trên Ubuntu");
    }

    @Test
    void detectsEdgeOnAndroid() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.0.0"
        );

        assertThat(info.browser()).isEqualTo("Edge");
        assertThat(info.operatingSystem()).isEqualTo("Android");
        assertThat(info.deviceType()).isEqualTo("Mobile");
        assertThat(info.displayName()).isEqualTo("Edge trên Android");
    }

    @Test
    void detectsSamsungInternetOnAndroidTablet() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Safari/537.36"
        );

        assertThat(info.browser()).isEqualTo("Samsung Internet");
        assertThat(info.operatingSystem()).isEqualTo("Android");
        assertThat(info.deviceType()).isEqualTo("Tablet");
        assertThat(info.displayName()).isEqualTo("Samsung Internet trên Android");
    }

    @Test
    void detectsSafariOnIpad() {
        DeviceInfo info = service.detect(
            "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
                + "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
        );

        assertThat(info.browser()).isEqualTo("Safari");
        assertThat(info.operatingSystem()).isEqualTo("iPadOS");
        assertThat(info.deviceType()).isEqualTo("Tablet");
        assertThat(info.displayName()).isEqualTo("Safari trên iPad");
    }
}
