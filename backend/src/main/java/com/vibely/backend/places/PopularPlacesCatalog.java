package com.vibely.backend.places;

import java.util.List;

/** Curated VN POIs shown when GPS/IP nearby is empty or as filler. */
final class PopularPlacesCatalog {

    private PopularPlacesCatalog() {
    }

    static List<PlaceSuggestionResponse> all() {
        return List.of(
            place("vinhomes-smart-city", "Vinhomes Smart City", "ĐL Thăng Long, Tây Mỗ, Nam Từ Liêm, Hà Nội", 21.0046, 105.7360),
            place("hanoi-old-quarter", "Hanoi Old Quarter", "Phố cổ Hà Nội, Hoàn Kiếm, Hà Nội", 21.0340, 105.8500),
            place("ho-guom", "Hồ Hoàn Kiếm", "Hoàn Kiếm, Hà Nội", 21.0287, 105.8522),
            place("van-mieu", "Văn Miếu - Quốc Tử Giám", "Đống Đa, Hà Nội", 21.0278, 105.8355),
            place("tay-ho", "Hồ Tây", "Tây Hồ, Hà Nội", 21.0583, 105.8220),
            place("cong-vien-thong-nhat", "Công viên Thống Nhất", "Hai Bà Trưng, Hà Nội", 21.0145, 105.8440),
            place("aeon-ha-dong", "AEON Mall Hà Đông", "Hà Đông, Hà Nội", 20.9870, 105.7510),
            place("landmark-81", "Landmark 81", "Bình Thạnh, TP. Hồ Chí Minh", 10.7950, 106.7220),
            place("nguyen-hue", "Phố đi bộ Nguyễn Huệ", "Quận 1, TP. Hồ Chí Minh", 10.7735, 106.7030),
            place("ben-thanh", "Chợ Bến Thành", "Quận 1, TP. Hồ Chí Minh", 10.7725, 106.6980),
            place("bitexco", "Bitexco Financial Tower", "Quận 1, TP. Hồ Chí Minh", 10.7717, 106.7042),
            place("phu-my-hung", "Phú Mỹ Hưng", "Quận 7, TP. Hồ Chí Minh", 10.7290, 106.7210),
            place("thao-dien", "Thảo Điền", "Thủ Đức, TP. Hồ Chí Minh", 10.8050, 106.7350),
            place("suoi-tien", "Suối Tiên", "Quận 9, TP. Hồ Chí Minh", 10.8660, 106.8030),
            place("cau-rong", "Cầu Rồng", "Hải Châu, Đà Nẵng", 16.0610, 108.2275),
            place("my-khe", "Bãi biển Mỹ Khê", "Sơn Trà, Đà Nẵng", 16.0600, 108.2470),
            place("ba-na", "Bà Nà Hills", "Hòa Vang, Đà Nẵng", 15.9950, 107.9880),
            place("hoi-an", "Phố cổ Hội An", "Hội An, Quảng Nam", 15.8801, 108.3380),
            place("nha-tho-duc-ba", "Nhà thờ Đức Bà", "Quận 1, TP. Hồ Chí Minh", 10.7798, 106.6990),
            place("cho-dong-xuan", "Chợ Đồng Xuân", "Hoàn Kiếm, Hà Nội", 21.0385, 105.8495),
            place("vincom-center-bd", "Vincom Center Bà Triệu", "Hai Bà Trưng, Hà Nội", 21.0125, 105.8490),
            place("cong-vien-23-9", "Công viên 23/9", "Quận 1, TP. Hồ Chí Minh", 10.7685, 106.6935),
            place("da-lat-center", "Chợ Đà Lạt", "Đà Lạt, Lâm Đồng", 11.9404, 108.4380),
            place("nha-trang-beach", "Bãi biển Nha Trang", "Nha Trang, Khánh Hòa", 12.2388, 109.1967),
            place("hue-citadel", "Kinh thành Huế", "Huế, Thừa Thiên Huế", 16.4690, 107.5770),
            place("ha-long", "Vịnh Hạ Long", "Hạ Long, Quảng Ninh", 20.9101, 107.1839),
            place("sapa-town", "Thị trấn Sa Pa", "Sa Pa, Lào Cai", 22.3360, 103.8440),
            place("can-tho-ninh-kieu", "Bến Ninh Kiều", "Ninh Kiều, Cần Thơ", 10.0330, 105.7830)
        );
    }

    private static PlaceSuggestionResponse place(
        String id,
        String name,
        String address,
        double lat,
        double lng
    ) {
        return new PlaceSuggestionResponse("popular:" + id, name, address, lat, lng);
    }
}
