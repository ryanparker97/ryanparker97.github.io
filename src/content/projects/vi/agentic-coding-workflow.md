---
title: 'Multi-Agent Coding System'
subtitle: 'Điều phối đa mô hình & công cụ cho nhà phát triển'
kind: 'personal'
summary: 'Hệ thống lập trình dùng một orchestrator duy nhất điều phối Claude, Gemini và Codex qua 11 flow chuyên biệt.'
start: '2025'
end:
tech: ['Claude', 'Gemini', 'Codex', 'tmux', 'hcom', 'AI-DLC']
featured: true
---

- **Sử dụng coding agent hằng ngày:** Dùng các coding agent (**Claude Code**, **Codex**, **Gemini**) **hằng ngày** cho thiết kế, triển khai, code review, kiểm thử và viết tài liệu, cả trong công việc lẫn dự án cá nhân.
- **Các flow chuyên biệt được điều phối:** Thiết kế hệ thống lập trình dùng một orchestrator duy nhất với **Claude**, **Gemini** và **Codex** cùng **11 flow chuyên biệt** cho khám phá, lập kế hoạch, gỡ lỗi, triển khai, kiểm chứng và audit, được điều phối qua các pane **tmux** và một event bus **hcom**.
- **Kiểm soát bàn giao tự động:** Triển khai workflow Conductor **AI-DLC** (AI-Driven Development Life Cycle) (**spec → plan → implement → test → ship → maintain**) với các quality gate do máy thực thi, vòng lặp audit verdict, yêu cầu smoke test và ràng buộc deploy nhằm tăng độ tin cậy của các thay đổi mã tự động.
- **Định tuyến, bộ nhớ & khôi phục:** Xây dựng lớp semantic memory theo từng dự án, task router, playbook tái sử dụng, mô hình tái sử dụng worker và các checkpoint khôi phục để agent có thể tiếp tục ngữ cảnh, tránh quét lại không cần thiết và giữ tiến độ qua các phiên chạy dài.
- **An toàn & kiểm chứng:** Bổ sung các guard xác định cho truy cập secret, ranh giới sandbox, các hành động rủi ro cần phê duyệt và chạy regression harness, tạo ra mô hình vận hành an toàn hơn cho triển khai và bảo trì do agent thực hiện.
