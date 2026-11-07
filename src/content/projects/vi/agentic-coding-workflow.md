---
title: 'Multi-Agent Coding System'
subtitle: 'Các agent AI lập kế hoạch, viết và review mã, với con người giữ quyền quyết định'
kind: 'personal'
summary: 'Một lead Claude điều hành nhóm agent AI viết mã qua ba giai đoạn và bốn quality gate, và con người duyệt trước khi bắt đầu xây dựng lẫn khi review.'
start: '2025'
end:
tech: ['Claude', 'Antigravity', 'Codex', 'tmux', 'hcom', 'AI-DLC']
image: '../../../assets/art/project-agentic-loop.svg'
imageAlt: 'Hình minh họa: ba chặng trên một đường đi, các gate xen giữa, hai dấu duyệt và một làn các nút agent bên dưới.'
stats:
  - value: '2'
    label: 'lần con người duyệt mỗi run'
    note: 'Cuối Inception và cuối Review. Lệnh approve từ chối chạy bên trong một phiên AI.'
  - value: '0'
    label: 'lần tự động merge'
    note: 'Chỉ lead merge, sau khi các gate đạt, và không agent nào chạy với cờ bỏ qua quyền.'
  - value: '286'
    label: 'test tự động'
    note: 'Đều đạt trong một shell thường khi spec của kit được audit ngày 26/10/2026.'
problem: 'Các agent AI viết mã rất nhanh, nhưng mỗi agent mạnh nhất ở một việc khác nhau: có agent nghiên cứu, có agent thiết kế, có agent viết mã, có agent review. Không nền tảng đơn lẻ nào làm tốt tất cả, nên phải kết hợp chúng thành một hệ thống. Nếu chạy song song mà không có quy tắc, chúng bỏ bước, mất dấu ai đã quyết định gì, và báo hoàn thành mà không có bằng chứng.'
approach: 'Giao cho mỗi agent đúng việc nó làm tốt nhất, và để quy trình điều khiển. Lead Claude lập kế hoạch và điều phối mọi task, Antigravity nghiên cứu và thiết kế, Codex xây dựng theo hướng test trước, còn một Claude reviewer với ngữ cảnh mới kiểm tra công việc. Mỗi run đi qua ba giai đoạn và bốn gate, với con người duyệt trước khi bắt đầu xây dựng và khi review.'
result: 'Công việc đến kèm bằng chứng thay vì lời hứa. Mỗi unit phải qua một lệnh kiểm chứng đã được con người duyệt, reviewer đối chiếu với biên nhận do chính kit viết, và mọi task, kết quả, quyết định đều là một tệp có thể đọc lại.'
loop:
  title: 'AI-DLC kit'
  lines: ['research', 'requirements', 'architecture', 'implement', 'verify', 'review']
design:
  intro: 'Một CLI Python nhỏ, chỉ dùng thư viện chuẩn, đưa mọi task qua cùng một vòng đời. Sơ đồ cho thấy đường đi: ba giai đoạn, bốn gate và hai lần con người duyệt, còn các agent làm việc ở làn bên dưới. Trạng thái: đang phát triển; spec của kit mới được triển khai một phần.'
  diagram: 'aidlc-kit'
  decisions:
    - '**Tệp là nguồn sự thật:** Tin nhắn giữa các agent chạy song song có thể bị bỏ lỡ hoặc đến muộn. Vì vậy mỗi task và kết quả là một tệp trong thư mục của run, tin nhắn hcom chỉ báo một tệp đã sẵn sàng, và stop hook nhắc agent nào kết thúc mà thiếu dòng trạng thái. Run nào cũng đọc lại được từ đĩa, và task bị kẹt được báo lại thay vì bị mất.'
    - '**Lead quyết định, Jev cố vấn:** Một bộ định tuyến tự động có thể chọn sai agent mà vẫn nghe rất chắc chắn. Vì vậy lead chọn agent, skill, model và effort, còn Jev, tùy chọn, trả lời các câu hỏi về định tuyến và gate rồi trả quyết định về cho lead khi không chắc. Mỗi quyết định đều có người chịu trách nhiệm và một dòng trong decisions.jsonl.'
    - '**Review với góc nhìn mới:** Báo cáo của chính bên xây dựng là bằng chứng yếu nhất rằng việc đã xong. Vì vậy reviewer bắt đầu với ngữ cảnh mới, không tin báo cáo của bên triển khai, và làm việc từ biên nhận do chính kit viết. Việc duyệt dựa trên bằng chứng.'
    - '**Đặc quyền tối thiểu:** Agent có quyền rộng có thể gây hại rộng. Vì vậy không có cờ bỏ qua quyền và không tự động merge, reviewer dùng hồ sơ audit chỉ đọc, và các mẫu dữ liệu nhạy cảm bị loại bỏ trước khi gửi bất cứ gì cho Jev. Một bước sai vẫn nhỏ, và các lệnh duyệt từ chối chạy bên trong một phiên AI.'
workflow:
  intro: 'Một run từ đầu đến cuối, trên track feature. Mỗi bước chặn một kiểu sai thường gặp của công việc do agent làm. Run đi theo một trong ba track: patch, feature hoặc system.'
  steps:
    - '**Bắt đầu từ một intent:** Yêu cầu mơ hồ dẫn đến công việc mơ hồ. Con người đưa cho lead một intent, kit mở thư mục run, và run được gán một track. Run patch chỉ giữ inception ở mức requirements.'
    - '**Lên kế hoạch trước khi viết mã:** Agent lao vào viết mã ngay sẽ xây sai thứ cần xây. Antigravity nghiên cứu, lead viết requirements và các unit, rồi Antigravity thiết kế kiến trúc. Gate spec_ready hỏi liệu một kỹ sư có thể xây mọi unit mà không cần hỏi thêm không, và con người duyệt trước khi construction bắt đầu.'
    - '**Xây từng unit một:** Thay đổi lớn làm một lúc rất khó kiểm tra. Mỗi unit là một bolt, theo thứ tự phụ thuộc, walking skeleton trước. Codex triển khai theo hướng test trước, gate unit_done chạy lệnh kiểm chứng đã được con người duyệt, và nếu lỗi thì chuyển sang debug.'
    - '**Review phần rủi ro trước:** Review mọi thứ một lượt làm run chậm lại, còn bỏ qua review thì tệ hơn. Gate review_now đưa ngay các unit rủi ro sang review và gom các unit rủi ro thấp để review vào cuối construction.'
    - '**Review, duyệt, merge:** Lời của bên xây dựng không phải bằng chứng. Một Claude reviewer với ngữ cảnh mới kiểm tra từng unit theo định nghĩa hoàn thành và chạy lại các test, còn gate review_risk chạy toàn bộ kiểm chứng, viết biên nhận và chuyển việc rủi ro cao cho con người. Sau khi con người duyệt, lead merge.'
featured: true
---

- **Sử dụng coding agent hằng ngày:** Dùng các coding agent (**Claude Code**, **Codex**, **Gemini**) **hằng ngày** cho thiết kế, triển khai, code review, kiểm thử và viết tài liệu, cả trong công việc lẫn dự án cá nhân.
- **Nhóm agent theo vai trò:** Thiết kế bộ kit **AI-DLC** bằng **Python** (chỉ dùng thư viện chuẩn) với **5 vai trò** (lead, research, architect, build, review): lead **Claude**, **Antigravity** cho nghiên cứu và kiến trúc, **Codex** cho build và debug, cùng một **Claude** reviewer với ngữ cảnh mới, phối hợp qua các pane **tmux** và **hcom**.
- **Vòng đời & quality gate:** Triển khai **3 giai đoạn** (Inception, Construction, Review) trên **3 track** (patch, feature, system) với **4 gate** (**spec_ready**, **unit_done**, **review_now**, **review_risk**), một lệnh kiểm chứng được người duyệt cho mỗi lần chạy, và con người duyệt ở ranh giới inception và review.
- **Cố vấn, dispatch & khôi phục:** Thêm **Jev** làm cố vấn tùy chọn qua lệnh **aidlc dispatch**, lead vẫn giữ quyết định cuối cùng, cùng một stop hook nhắc agent quay lại khi tệp kết quả thiếu dòng trạng thái, để task bị kẹt được báo lại thay vì bị mất.
- **An toàn & kiểm chứng:** Giữ tệp làm nguồn sự thật với mọi quyết định được ghi lại, và áp dụng đặc quyền tối thiểu: không cờ bỏ qua quyền, không tự động merge, hồ sơ audit chỉ đọc cho reviewer, và biên nhận kiểm chứng do chính kit viết.
