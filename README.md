# SME-FE - Social Media Platform Frontend

## 📋 Giới thiệu

SME-FE là ứng dụng frontend của nền tảng mạng xã hội được xây dựng bằng React. Đây là đồ án môn Công nghệ Phần mềm Mới của Trường Đại học Sư phạm Kỹ thuật TP. HCM.

### Sinh viên thực hiện
- **Tô Hữu Đức** - MSSV: 22110311
- **Đặng Huỳnh Sơn** - MSSV: 22110406

### Giảng viên hướng dẫn
- **ThS. Nguyễn Hữu Trung**

## 🎯 Mục đích

Xây dựng giao diện người dùng cho nền tảng mạng xã hội với các chức năng:
- Quản lý tài khoản và hồ sơ cá nhân
- Tạo, chỉnh sửa, xóa bài viết
- Tương tác xã hội (like, comment, share, follow)
- Nhắn tin riêng tư
- Tìm kiếm người dùng và bài viết
- Nhận thông báo real-time
- Gợi ý kết bạn

## 🛠️ Công nghệ sử dụng

- **React 18.x** - Thư viện JavaScript để xây dựng giao diện người dùng
- **Tailwind CSS** - Framework CSS utility-first để thiết kế giao diện
- **React Router** - Quản lý điều hướng trong ứng dụng
- **Axios** - Thư viện HTTP client để giao tiếp với backend API

## 📦 Yêu cầu hệ thống

### Phần cứng
- **CPU**: Bộ xử lý lõi kép trở lên (khuyến nghị Intel i7 hoặc tương đương)
- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB)
- **Ổ cứng**: Còn trống tối thiểu 2GB
- **Hệ điều hành**: Windows 10/11, macOS hoặc Linux (Ubuntu)

### Phần mềm
- **Node.js**: Phiên bản 18.x LTS trở lên
- **npm** hoặc **yarn**: Package manager
- **Trình duyệt**: Chrome, Firefox, Edge, Safari (phiên bản mới nhất)
- **Git**: Để clone repository

## 🚀 Cài đặt và chạy ứng dụng

### Bước 1: Clone repository

```bash
git clone https://github.com/thduck284/SME-FE.git
cd SME-FE
```

### Bước 2: Cài đặt dependencies

```bash
npm install
```

hoặc nếu sử dụng yarn:

```bash
yarn install
```

### Bước 3: Cấu hình môi trường

Tạo file `.env` trong thư mục gốc và cấu hình các biến môi trường:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

### Bước 4: Khởi chạy ứng dụng

```bash
npm start
```

hoặc:

```bash
yarn start
```

Ứng dụng sẽ chạy tại `http://localhost:3001` (hoặc port khác nếu 3001 đã được sử dụng).

## 📱 Tính năng chính

### 1. Quản lý tài khoản
- ✅ Đăng ký tài khoản mới với xác thực OTP
- ✅ Đăng nhập/Đăng xuất
- ✅ Quên mật khẩu và đặt lại mật khẩu
- ✅ Xem và cập nhật thông tin cá nhân
- ✅ Thiết lập quyền riêng tư

### 2. Bài viết
- ✅ Tạo bài viết mới (văn bản, hình ảnh, video)
- ✅ Chỉnh sửa và xóa bài viết của mình
- ✅ Xem chi tiết bài viết
- ✅ Thích/Bỏ thích bài viết
- ✅ Bình luận và chỉnh sửa/xóa bình luận
- ✅ Chia sẻ bài viết

### 3. Tương tác xã hội
- ✅ Theo dõi/Bỏ theo dõi người dùng khác
- ✅ Xem danh sách người theo dõi và đang theo dõi
- ✅ Mention người dùng trong bài viết
- ✅ Hashtag cho bài viết

### 4. Tìm kiếm
- ✅ Tìm kiếm người dùng theo tên
- ✅ Tìm kiếm bài viết theo từ khóa
- ✅ Tìm kiếm theo hashtag

### 5. Thông báo
- ✅ Nhận thông báo khi có người like, comment
- ✅ Nhận thông báo khi có người follow
- ✅ Nhận thông báo khi được mention

### 6. Nhắn tin
- ✅ Gửi tin nhắn riêng tư cho người dùng khác
- ✅ Xem lịch sử trò chuyện
- ✅ Hiển thị trạng thái đã đọc/chưa đọc

### 7. Gợi ý kết bạn
- ✅ Gợi ý người dùng dựa trên bạn chung
- ✅ Gợi ý dựa trên sở thích và tương tác

## 📂 Cấu trúc thư mục

```
SME-FE/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── assets/         # Images, icons, fonts
│   ├── styles/         # CSS/Tailwind configs
│   ├── App.js          # Main App component
│   └── index.js        # Entry point
├── .env                # Environment variables
├── package.json        # Dependencies
├── tailwind.config.js  # Tailwind configuration
└── README.md          # Documentation
```

## 🎨 Giao diện người dùng

### Trang chủ (Home)
Hiển thị bảng tin với các bài viết từ người dùng đang follow

### Trang tìm kiếm (Search)
- Tìm kiếm người dùng để follow
- Tìm kiếm bài viết theo từ khóa
- Tìm kiếm theo hashtag

### Trang thông báo (Notifications)
Hiển thị các thông báo về tương tác (like, comment, follow, mention)

### Trang cá nhân (Profile)
- Thông tin cá nhân
- Danh sách bài viết
- Danh sách người theo dõi/đang theo dõi
- Thư viện ảnh từ các bài viết

### Trang tạo bài viết (Create Post)
Tạo bài viết mới với khả năng:
- Đính kèm hình ảnh/video
- Mention người dùng khác
- Thêm hashtag

### Trang gợi ý kết bạn (Friend Suggestions)
Hiển thị danh sách người dùng được gợi ý dựa trên:
- Bạn chung
- Sở thích tương đồng
- Lịch sử tương tác

## 🔗 Kết nối với Backend

Backend repository: [SME-BE](https://github.com/huynhsown/SME-BE)

Đảm bảo backend đã được cài đặt và chạy trước khi khởi động frontend.

## 🧪 Testing

Để chạy các test cases:

```bash
npm test
```

Để chạy test với coverage:

```bash
npm run test:coverage
```

## 🏗️ Build cho production

```bash
npm run build
```

Thư mục `build/` sẽ chứa các file static đã được tối ưu hóa.

## 📄 Tài liệu tham khảo

1. [React Documentation](https://react.dev/)
2. [Tailwind CSS Documentation](https://tailwindcss.com/docs)
3. [React Router Documentation](https://reactrouter.com/)
4. Báo cáo đồ án: Xem file tài liệu đính kèm

## 👥 Đóng góp

Nếu bạn muốn đóng góp cho dự án:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 🐛 Báo lỗi

Nếu bạn phát hiện lỗi, vui lòng tạo issue mới trên GitHub với thông tin:
- Mô tả lỗi chi tiết
- Các bước để tái hiện lỗi
- Screenshots (nếu có)
- Thông tin môi trường (OS, Node version, Browser)

## 📝 License

Dự án này được phát triển cho mục đích học tập tại Trường Đại học Sư phạm Kỹ thuật TP. HCM.

## 📞 Liên hệ

- **GitHub**: 
  - [thduck284](https://github.com/thduck284)
  - [huynhsown](https://github.com/huynhsown)

## 🙏 Lời cảm ơn

Xin gửi lời cảm ơn chân thành đến:
- **ThS. Nguyễn Hữu Trung** - Giảng viên hướng dẫn
- **Khoa Công nghệ Thông tin** - Trường ĐH Sư phạm Kỹ thuật TP.HCM
- Tất cả các thành viên đã đóng góp cho dự án

---

⭐ Nếu bạn thấy dự án này hữu ích, hãy cho chúng tôi một star trên GitHub!

**Made with ❤️ by Tô Hữu Đức & Đặng Huỳnh Sơn**
