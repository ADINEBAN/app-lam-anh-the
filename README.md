# App Làm Ảnh Thẻ

Ứng dụng web hỗ trợ tạo ảnh thẻ từ ảnh chân dung ngay trên trình duyệt.

**Bản online (GitHub Pages):** https://adineban.github.io/app-lam-anh-the/

## Chức năng MVP

- Tải ảnh chân dung lên
- Xoá phông tự động với 2 chế độ: Nhanh (model nhỏ, thu ảnh về 1024px) và Chất lượng (model lớn hơn, giữ tới 1600px)
- Thêm phông trắng hoặc phông xanh
- Giữ nền gốc hoặc xuất nền trong suốt
- Chọn kích thước 3x4, 4x6, 2x3, hộ chiếu 35x45 mm (xuất 300 DPI)
- Kéo ảnh để căn vị trí, phóng to/thu nhỏ
- Căn chỉnh ánh sáng: độ sáng, tương phản, độ bão hoà
- Tự động cân sáng
- Tải ảnh PNG/JPG
- Giao diện kính trong suốt trên nền sáng, điểm nhấn cam/xanh dương, hiệu ứng quét sáng trên ảnh và thanh tiến trình phần trăm khi xoá phông
- Nền động Vanta.js NET: mạng điểm và đường nối chuyển động trên nền trong suốt, tự giảm mật độ trên mobile
- Responsive cho mobile: nút dễ chạm, chống phóng to khi focus trên iOS, tự cuộn tới ảnh sau khi tải lên

## Cách chạy

Mở trực tiếp `index.html` trong trình duyệt, hoặc dùng một static server:

```bash
python3 -m http.server 8000
```

Sau đó mở http://localhost:8000

> Chức năng xoá phông dùng thư viện chạy trong trình duyệt và cần internet ở lần đầu để tải model.

## Cấu trúc

```text
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── docs/
    └── PLAN.md
```

## Trạng thái

MVP đã có giao diện và các chức năng chính. Các bước tiếp theo xem trong `docs/PLAN.md`.
