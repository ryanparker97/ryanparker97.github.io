---
title: 'Di chuyển 500 pipeline Talend sang Databricks trong một tháng'
question: 'Hãy kể về một lần bạn dẫn dắt một đợt di chuyển lớn mà không làm ảnh hưởng đến nghiệp vụ.'
role: 'fpt-software-senior-data-engineer'
competencies: ['leadership', 'delivery', 'technical-depth']
date: 2026-10-01
metrics:
  - prefix: 'Di chuyển'
    label: 'pipeline Talend'
    value: '500'
    note: 'Sang Databricks, trong khoảng một tháng (FPT Software).'
  - label: 'thay đổi phá vỡ mô hình nghiệp vụ'
    value: '0'
  - label: 'schema dữ liệu'
    value: 'không đổi'
image: '../../../assets/star/talend-databricks-migration.svg'
imageAlt: 'Sơ đồ: các pipeline Talend dạng XML đi qua một AI skill để thành đặc tả dễ đọc, trở thành pipeline Databricks theo các tầng bronze, silver và gold, và một MCP server đối chiếu kết quả với cơ sở dữ liệu dev.'
featured: false
---

## Bối cảnh

Các pipeline dữ liệu của chúng tôi chạy trên Talend, nơi mỗi pipeline được định nghĩa bằng XML. Các tệp này rất dài và khó đọc nên rất khó hiểu logic của pipeline. Thêm vào đó, nhóm không có quyền truy cập vào chính Talend để kiểm tra pipeline hoạt động ra sao. Bản thân mỗi pipeline cũng phức tạp: một pipeline tạo ra nhiều bảng đầu ra rồi dùng lại chính những bảng đó làm bảng nguồn cho các bước transform tiếp theo.

## Nhiệm vụ

Tôi dẫn dắt việc di chuyển các pipeline Talend sang Databricks. Mục tiêu là khoảng 500 pipeline trong một tháng, không có thay đổi nào phá vỡ mô hình nghiệp vụ và schema dữ liệu giữ nguyên. Việc di chuyển cũng là cơ hội để giảm độ phức tạp và các phụ thuộc đó.

## Hành động

Tôi gỡ hai điểm nghẽn bằng công cụ AI và giảm độ phức tạp trong quá trình đó:

- **AI skill để đọc pipeline:** skill đọc trực tiếp định nghĩa pipeline từ kho mã nguồn và trích xuất logic thành một đặc tả (spec) dễ hiểu, nên không ai cần quyền truy cập Talend hay phải đọc XML.
- **Chuyển đổi theo medallion với Spark Declarative Pipelines:** cũng skill đó biến mỗi spec thành pipeline Databricks xây dựng bằng Spark Declarative Pipelines theo mô hình dữ liệu medallion (bronze, silver, gold), thay cho các bảng được ghi ra rồi đọc lại ngay trong một pipeline, và giảm độ phức tạp cũng như các phụ thuộc.
- **MCP server để kiểm chứng:** tôi viết một MCP kết nối với cơ sở dữ liệu ở môi trường dev để nhóm đối chiếu kết quả của từng pipeline đã di chuyển với dữ liệu và schema mong đợi.

## Kết quả

Nhóm đã di chuyển **500 pipeline trong một tháng**, không có thay đổi nào phá vỡ mô hình nghiệp vụ và schema dữ liệu vẫn đúng như cũ. Kết quả có độ phức tạp và phụ thuộc ít hơn so với Talend.
