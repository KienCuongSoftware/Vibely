package com.vibely.backend.auth.mail;

/**
 * Shared Vibely transactional email shell: glitch color bar, logo, and footer.
 */
public final class VibelyEmailLayout {

    public static final String SUPPORT_EMAIL = "kiencuongsoftware@gmail.com";

    private VibelyEmailLayout() {
    }

    public static String supportEmailLink() {
        return supportEmailLink(SUPPORT_EMAIL);
    }

    public static String supportEmailLink(String label) {
        String safeLabel = escapeHtml(label == null || label.isBlank() ? SUPPORT_EMAIL : label);
        return "<a href=\"mailto:" + SUPPORT_EMAIL + "\" style=\"color:#2563eb;text-decoration:none;\">"
            + safeLabel
            + "</a>";
    }

    public static String colorBarHtml() {
        return """
            <table role="presentation" width="620" border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%%;max-width:620px;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
              <tr>
                <td width="124" height="8" bgcolor="#fe2c55" style="width:124px;height:8px;background-color:#fe2c55;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
                <td width="124" height="8" bgcolor="#25f4ee" style="width:124px;height:8px;background-color:#25f4ee;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
                <td width="124" height="8" bgcolor="#000000" style="width:124px;height:8px;background-color:#000000;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
                <td width="124" height="8" bgcolor="#6922d1" style="width:124px;height:8px;background-color:#6922d1;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
                <td width="124" height="8" bgcolor="#fe2c55" style="width:124px;height:8px;background-color:#fe2c55;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
              </tr>
            </table>
            """;
    }

    public static String document(String pageTitle, String bodyRowsHtml, String footerUsername) {
        String safeTitle = escapeHtml(pageTitle);
        String footerRecipient = footerUsername == null || footerUsername.isBlank()
            ? ""
            : "<div>Email này được tạo cho @" + escapeHtml(footerUsername) + ".</div>";
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>%s</title>
            </head>
            <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#161823;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background:#ffffff;padding:24px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-collapse:collapse;">
                      <tr>
                        <td style="padding:0;line-height:0;font-size:0;">
                          %s
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:24px 28px 8px;">
                          <div style="font-size:34px;font-weight:900;letter-spacing:-1px;color:#161823;">Vibely</div>
                        </td>
                      </tr>
                      %s
                      <tr>
                        <td align="center" style="padding:8px 28px 28px;color:#a1a1aa;font-size:12px;line-height:1.6;">
                          <div style="font-size:18px;font-weight:800;color:#b4b4bb;margin-bottom:8px;">Vibely</div>
                          %s
                          <div>Đây là email tự động, vui lòng không trả lời.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(safeTitle, colorBarHtml(), bodyRowsHtml, footerRecipient);
    }

    public static String headingRow(String heading) {
        return """
            <tr>
              <td align="center" style="padding:0 28px 14px;">
                <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:800;color:#161823;">%s</h1>
              </td>
            </tr>
            """.formatted(escapeHtml(heading));
    }

    public static String escapeHtml(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        return raw.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
