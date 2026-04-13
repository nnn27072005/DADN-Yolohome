# Hướng dẫn Triển khai YoloHome trên Render (Backend, Database & Frontend Web)

Tài liệu này hướng dẫn bạn cách đưa toàn bộ hệ thống YoloHome lên internet bằng dịch vụ Render.

## 1. Chuẩn bị
- Đảm bảo bạn đã đẩy toàn bộ code mới nhất (bao gồm file `render.yaml` ở thư mục gốc) lên một Repository trên GitHub hoặc GitLab.
- Tạo tài khoản [Render](https://render.com/).

## 2. Triển khai bằng Blueprints (Siêu nhanh)
Render sẽ tự động đọc file `render.yaml` và thiết lập 3 dịch vụ cho bạn.

1. Truy cập vào Dashboard của Render -> Chọn nút **New +** -> Chọn **Blueprint**.
2. Kết nối với Repository chứa dự án của bạn.
3. Render sẽ phân tích và hiển thị danh sách các dịch vụ sẽ được tạo:
   - `yolohome-db` (PostgreSQL)
   - `yolohome-backend` (Node.js Web Service)
   - `yolohome-frontend` (Static Site - Bản Web)
4. Nhấn **Apply**.

## 3. Cấu hình Biến môi trường
Sau khi nhấn Apply, Render sẽ yêu cầu bạn nhập một số thông tin còn thiếu (do tính bảo mật nên không để trong file config):

- **Cho `yolohome-backend`**:
  - `ADAFRUIT_IO_USERNAME`: Tên đăng nhập Adafruit IO của bạn.
  - `ADAFRUIT_IO_KEY`: API Key của Adafruit IO.
  - `JWT_SECRET_KEY`: (Tự động tạo, bạn có thể đổi nếu muốn).
  - `SECRET_KEY`: (Tự động tạo).

## 4. Kiểm tra sau khi triển khai
### Backend
- Đợi Render build xong (thông báo "Live").
- Truy cập URL của backend (ví dụ: `https://yolohome-backend.onrender.com/`). Bạn sẽ thấy thông báo `{"message": "Server is running!"}`.

### Frontend Web
- Truy cập URL của frontend (ví dụ: `https://yolohome-frontend.onrender.com/`).
- Bản web sẽ tự động kết nối tới Backend của bạn nhờ vào biến môi trường `EXPO_PUBLIC_API_URL` đã được cấu hình tự động trong Blueprint.

### Mobile App (iOS/Android)
- Để chạy app trên điện thoại kết nối tới Backend mới, bạn cần tạo file `.env` trong thư mục `frontend/` và đặt:
  ```env
  EXPO_PUBLIC_API_URL=https://yolohome-backend.onrender.com/api
  ```
- Sau đó chạy `npx expo start` để test.

## Lưu ý về Database
- Render PostgreSQL (Gói Free) sẽ tự động bị xóa sau 90 ngày nếu không nâng cấp. Bạn hãy sao lưu dữ liệu quan trọng thường xuyên hoặc cân nhắc nâng cấp gói Starter nếu dùng lâu dài.

---
**Chúc mừng! Dự án của bạn đã hoạt động trên môi trường production.**
