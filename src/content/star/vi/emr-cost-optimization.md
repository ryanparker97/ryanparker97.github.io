---
title: 'Giảm hơn một nửa chi phí EMR'
question: 'Hãy kể về một lần bạn giảm chi phí mà không ảnh hưởng đến hiệu năng.'
role: 'datum-security-bank-data-engineer'
competencies: ['ownership', 'technical-depth', 'customer-focus']
date: 2025-06-01
metrics:
  - prefix: 'Giảm'
    label: 'chi phí EMR'
    value: '>50%'
  - label: 'hiệu năng pipeline'
    value: 'không đổi'
featured: true
---

## Bối cảnh

Nền tảng dữ liệu của ngân hàng chạy trên AWS, với các job nạp và xử lý dữ liệu hằng ngày trên Amazon EMR. Một ngày, phía nghiệp vụ hỏi vì sao chi phí của nền tảng liên tục tăng.

## Nhiệm vụ

Tôi chịu trách nhiệm điều tra: tìm ra nguyên nhân làm chi phí tăng và giảm chi phí mà không làm chậm các pipeline hằng ngày.

## Hành động

Tôi tìm ra hai nguyên nhân. Các job không tái sử dụng cụm EMR: mỗi job tự khởi tạo cụm riêng, nên thường có nhiều cụm chạy cùng lúc. Và cấu hình kích thước cụm bị cố định, nên job nào cũng dùng một cấu hình như nhau bất kể khối lượng công việc.

Tôi xây dựng một framework trên Airflow để xử lý cả hai:

- **Tái sử dụng trước khi tạo mới:** bước đầu tiên của mọi DAG nạp dữ liệu hoặc dùng EMR là liệt kê các cụm đang chạy và chọn một cụm đang rảnh hoặc tải thấp. Công việc được gửi tới cụm đó, và chỉ tạo cụm mới khi không còn cụm phù hợp.
- **Tự tắt khi rảnh:** cụm nào rảnh liên tục 15 phút sẽ tự động bị tắt.
- **Cấu hình linh hoạt:** kích thước và thiết lập của cụm được lưu trong Airflow Variables, nên có thể điều chỉnh theo từng khối lượng công việc mà không cần sửa code hay deploy lại.

## Kết quả

Chi phí EMR giảm **hơn 50%**, trong khi các pipeline vẫn giữ nguyên hiệu năng.
