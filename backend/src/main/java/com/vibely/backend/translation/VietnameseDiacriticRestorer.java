package com.vibely.backend.translation;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Phục hồi dấu tiếng Việt cho caption viết không dấu (heuristic + từ điển ưu tiên).
 * Đủ tốt cho caption ngắn trên feed; không thay model neural.
 */
@Component
public class VietnameseDiacriticRestorer {

    public static final String TARGET_LANG = "vi-diacritic";

    private static final Pattern TOKEN = Pattern.compile(
        "(@[A-Za-z0-9._]+)|(#[\\p{L}\\p{N}_]+)|(https?://\\S+)|([A-Za-zÀ-ỹĐđ]+)|(\\s+)|(.)",
        Pattern.UNICODE_CHARACTER_CLASS
    );

    private static final Pattern HAS_VI_DIACRITIC = Pattern.compile(
        "[ăâêôơưđĂÂÊÔƠƯĐáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẮẰẲẴẶẤẦẨẪẬÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ]"
    );

    private static final Map<String, String> PREFERRED = buildPreferred();

    public String restore(String text) {
        if (!StringUtils.hasText(text)) {
            return text == null ? "" : text;
        }
        if (HAS_VI_DIACRITIC.matcher(text).find()) {
            return text;
        }
        Matcher matcher = TOKEN.matcher(text);
        StringBuilder out = new StringBuilder(text.length() + 16);
        while (matcher.find()) {
            String mention = matcher.group(1);
            String hashtag = matcher.group(2);
            String url = matcher.group(3);
            String word = matcher.group(4);
            String space = matcher.group(5);
            String other = matcher.group(6);
            if (mention != null) {
                out.append(mention);
            } else if (hashtag != null) {
                out.append(hashtag);
            } else if (url != null) {
                out.append(url);
            } else if (word != null) {
                out.append(restoreWord(word));
            } else if (space != null) {
                out.append(space);
            } else if (other != null) {
                out.append(other);
            }
        }
        return out.toString();
    }

    public boolean changesText(String text) {
        if (!StringUtils.hasText(text)) {
            return false;
        }
        String restored = restore(text);
        return !restored.equals(text);
    }

    private static String restoreWord(String word) {
        if (word.length() <= 1) {
            return word;
        }
        String bare = stripDiacritics(word).toLowerCase(Locale.ROOT);
        String preferred = PREFERRED.get(bare);
        if (preferred == null) {
            return word;
        }
        return applyCase(word, preferred);
    }

    static String stripDiacritics(String input) {
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String noMarks = normalized.replaceAll("\\p{M}+", "");
        return noMarks.replace('đ', 'd').replace('Đ', 'D');
    }

    private static String applyCase(String original, String accentedLower) {
        if (original.equals(original.toUpperCase(Locale.ROOT))) {
            return accentedLower.toUpperCase(Locale.ROOT);
        }
        if (!original.isEmpty() && Character.isUpperCase(original.charAt(0))) {
            return Character.toUpperCase(accentedLower.charAt(0)) + accentedLower.substring(1);
        }
        return accentedLower;
    }

    private static void put(Map<String, String> map, String bare, String accented) {
        map.put(bare.toLowerCase(Locale.ROOT), accented.toLowerCase(Locale.ROOT));
    }

    private static void putAccented(Map<String, String> map, String accented) {
        String lower = accented.toLowerCase(Locale.ROOT);
        put(map, stripDiacritics(lower), lower);
    }

    private static Map<String, String> buildPreferred() {
        Map<String, String> map = new HashMap<>(512);
        String[] commonAccented = {
            "tôi", "bạn", "anh", "chị", "em", "của", "và", "với", "cho", "trong", "ngoài",
            "không", "được", "rất", "nhiều", "những", "các", "một", "như", "thì", "là",
            "có", "này", "đó", "đây", "kia", "đã", "sẽ", "đang", "vẫn", "cũng", "chỉ",
            "vì", "nên", "nếu", "khi", "lúc", "ngày", "đêm", "tháng", "năm", "giờ",
            "người", "mình", "chúng", "họ", "gì", "đâu", "nào", "sao", "thế",
            "thích", "yêu", "muốn", "cần", "biết", "thấy", "nghe", "nói", "làm", "đi",
            "về", "ra", "vào", "lên", "xuống", "qua", "cùng", "hay", "hoặc", "nhưng", "mà",
            "để", "từ", "đến", "tới", "theo", "bằng", "nhạc", "bài", "hát", "âm", "thanh", "gốc",
            "sơn", "thủy", "trùng", "mây", "chung", "đông", "tây", "nam", "bắc",
            "hà", "nội", "sài", "gòn", "việt", "nam", "thương", "nhớ", "buồn", "vui",
            "đẹp", "xấu", "mới", "cũ", "học", "chơi", "ăn", "uống", "ngủ", "chạy", "nhảy",
            "xem", "đọc", "viết", "gửi", "nhận", "mở", "đóng", "lớn", "nhỏ", "cao", "thấp",
            "nhanh", "chậm", "gần", "xa", "đúng", "sai", "tốt", "mạnh", "yếu", "nóng", "lạnh",
            "trời", "mưa", "nắng", "gió", "biển", "núi", "sông", "hoa", "cây", "đường", "phố",
            "nhà", "trường", "bố", "mẹ", "con", "ông", "bà", "tim", "đời", "phim", "ảnh",
            "trăng", "sao", "đất", "nước", "lửa", "chờ", "đợi", "mong", "ước", "mơ", "thật",
            "tìm", "mất", "còn", "hết", "thêm", "đủ", "cảm", "ơn", "lỗi", "tha", "giúp",
            "hôm", "mai", "xưa", "sau", "trước", "tuần", "buổi", "sáng", "chiều", "tối",
            "phút", "giây", "cuộc", "sống", "hạnh", "phúc", "nỗi", "đau", "niềm", "nụ", "cười",
            "mắt", "vai", "tay", "chân", "tình", "chia", "gặp", "cố", "gắng", "thành", "công",
            "thất", "bại", "hy", "vọng", "tương", "lai", "hiện", "tại", "chúc", "mừng",
            "sinh", "nhật", "tuyệt", "vời", "đỉnh", "đăng", "tải", "dõi", "kéo",
            "hùng", "dũng", "minh", "tuấn", "huy", "long", "phong", "quân",
            "linh", "lan", "hương", "thảo", "trang", "đà", "lạt", "nha", "huế", "vũng", "tàu",
            "phú", "quốc", "tuyết", "xuân", "thu", "hương", "đẹp", "trai", "gái", "chào"
        };
        for (String word : commonAccented) {
            putAccented(map, word);
        }
        // Caption / music overrides (ưu tiên ngữ cảnh tiêu đề bài hát)
        put(map, "son", "sơn");
        put(map, "thuy", "thủy");
        put(map, "trung", "trùng");
        put(map, "may", "mây");
        put(map, "dong", "đông");
        put(map, "tuyet", "tuyết");
        put(map, "xuan", "xuân");
        put(map, "dem", "đêm");
        put(map, "tinh", "tình");
        put(map, "yeu", "yêu");
        put(map, "thuong", "thương");
        put(map, "nho", "nhớ");
        put(map, "buon", "buồn");
        put(map, "nhac", "nhạc");
        put(map, "moi", "mới");
        put(map, "nguoi", "người");
        put(map, "toi", "tôi");
        put(map, "ban", "bạn");
        put(map, "cua", "của");
        put(map, "khong", "không");
        put(map, "duoc", "được");
        put(map, "rat", "rất");
        put(map, "nhieu", "nhiều");
        put(map, "nhung", "những");
        put(map, "mot", "một");
        put(map, "nay", "này");
        put(map, "dang", "đang");
        put(map, "viet", "việt");
        put(map, "ha", "hà");
        put(map, "noi", "nội");
        put(map, "sai", "sài");
        put(map, "gon", "gòn");
        put(map, "am", "âm");
        put(map, "goc", "gốc");
        put(map, "bai", "bài");
        put(map, "hat", "hát");
        put(map, "dep", "đẹp");
        put(map, "gai", "gái");
        put(map, "chao", "chào");
        put(map, "on", "ơn");
        put(map, "loi", "lỗi");
        put(map, "hom", "hôm");
        put(map, "sang", "sáng");
        put(map, "chieu", "chiều");
        put(map, "nhe", "nhé");
        put(map, "oi", "ơi");
        put(map, "duong", "đường");
        put(map, "truong", "trường");
        put(map, "huong", "hương");
        put(map, "thao", "thảo");
        put(map, "hanh", "hạnh");
        put(map, "phuc", "phúc");
        put(map, "vong", "vọng");
        put(map, "tuong", "tương");
        put(map, "khu", "khứ");
        put(map, "hien", "hiện");
        put(map, "tai", "tại");
        put(map, "chuc", "chúc");
        put(map, "mung", "mừng");
        put(map, "nhat", "nhật");
        put(map, "voi", "vời");
        put(map, "dinh", "đỉnh");
        put(map, "doi", "dõi");
        put(map, "ngay", "ngày");
        put(map, "va", "và");
        put(map, "co", "có");
        put(map, "de", "để");
        put(map, "duoc", "được");
        put(map, "se", "sẽ");
        put(map, "da", "đã");
        put(map, "o", "ở");
        put(map, "bi", "bị");
        put(map, "ve", "về");
        put(map, "lai", "lại");
        put(map, "nua", "nữa");
        put(map, "lam", "làm");
        put(map, "gi", "gì");
        put(map, "sao", "sao");
        put(map, "the", "thế");
        put(map, "nao", "nào");
        put(map, "dau", "đâu");
        put(map, "roi", "rồi");
        put(map, "nhe", "nhé");
        return map;
    }
}
