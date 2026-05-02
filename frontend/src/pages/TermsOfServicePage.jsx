import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const sections = [
  {
    id: 'moi-quan-he',
    title: '1. Mối Quan Hệ Của Bạn Với Chúng Tôi',
    paragraphs: [
      'Chào mừng bạn đến với Vibely. Các Điều Khoản này điều chỉnh mối quan hệ giữa bạn và Vibely khi bạn truy cập, sử dụng ứng dụng, website và các dịch vụ liên quan của nền tảng.',
      'Dịch vụ được cung cấp cho mục đích sử dụng cá nhân và phi thương mại, trừ khi Vibely có chấp thuận khác bằng văn bản.',
    ],
  },
  {
    id: 'chap-thuan',
    title: '2. Chấp Thuận Điều Khoản',
    paragraphs: [
      'Khi truy cập hoặc sử dụng dịch vụ, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ Điều Khoản Dịch Vụ cùng Chính Sách Quyền Riêng Tư.',
      'Nếu bạn sử dụng dịch vụ thay mặt cho tổ chức, bạn cam kết có thẩm quyền pháp lý để ràng buộc tổ chức đó với các điều khoản này.',
    ],
  },
  {
    id: 'thay-doi',
    title: '3. Thay Đổi Điều Khoản',
    paragraphs: [
      'Vibely có thể cập nhật Điều Khoản theo từng thời điểm để phản ánh thay đổi về sản phẩm, vận hành hoặc yêu cầu pháp lý.',
      'Chúng tôi sẽ hiển thị ngày cập nhật mới nhất. Việc bạn tiếp tục sử dụng dịch vụ sau khi điều khoản mới có hiệu lực được xem là sự chấp thuận.',
    ],
  },
  {
    id: 'tai-khoan',
    title: '4. Tài Khoản Của Bạn Với Chúng Tôi',
    bullets: [
      'Bạn phải cung cấp thông tin chính xác, đầy đủ và cập nhật khi đăng ký tài khoản.',
      'Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình.',
      'Nếu nghi ngờ tài khoản bị truy cập trái phép, bạn phải thông báo ngay cho Vibely.',
      'Vibely có quyền tạm khóa hoặc chấm dứt tài khoản nếu phát hiện vi phạm điều khoản hoặc rủi ro an toàn.',
      'Bạn có thể yêu cầu xóa tài khoản qua kênh hỗ trợ chính thức.',
    ],
  },
  {
    id: 'truy-cap-su-dung',
    title: '5. Truy Cập và Sử Dụng Dịch Vụ Của Chúng Tôi',
    bullets: [
      'Không được sử dụng dịch vụ cho mục đích trái pháp luật hoặc trái với chính sách cộng đồng.',
      'Không được sao chép, sửa đổi, đảo ngược mã nguồn hoặc khai thác dịch vụ trái phép.',
      'Không được mạo danh, quấy rối, phát tán nội dung độc hại, gian lận hoặc thư rác.',
      'Không được truy cập hệ thống bằng phương thức tự động gây ảnh hưởng đến vận hành bình thường.',
      'Vibely có quyền gỡ bỏ nội dung hoặc giới hạn truy cập khi phát hiện vi phạm.',
    ],
  },
  {
    id: 'so-huu-tri-tue',
    title: '6. Quyền Sở Hữu Trí Tuệ',
    paragraphs: [
      'Vibely tôn trọng quyền sở hữu trí tuệ và yêu cầu người dùng tuân thủ tương tự.',
      'Nội dung, thương hiệu, giao diện và thành phần nền tảng thuộc quyền sở hữu hoặc cấp phép hợp pháp cho Vibely, trừ nội dung do chính người dùng sở hữu.',
    ],
  },
  {
    id: 'noi-dung',
    title: '7. Nội Dung',
    subsections: [
      {
        title: 'A. Nội dung nền tảng',
        paragraphs: [
          'Nội dung hệ thống, giao diện và tài sản số của Vibely chỉ được sử dụng theo phạm vi cho phép trong điều khoản này.',
        ],
      },
      {
        title: 'B. Nội dung do người dùng tạo',
        bullets: [
          'Bạn chịu trách nhiệm đối với nội dung đăng tải và cam kết có đủ quyền hợp pháp đối với nội dung đó.',
          'Bạn cấp cho Vibely quyền sử dụng, lưu trữ, hiển thị và phân phối nội dung trong phạm vi vận hành dịch vụ.',
          'Vibely có quyền kiểm duyệt, giới hạn hiển thị hoặc gỡ nội dung vi phạm chính sách hoặc pháp luật.',
        ],
      },
    ],
  },
  {
    id: 'boi-thuong',
    title: '8. Bảo Đảm Bồi Thường Thiệt Hại',
    paragraphs: [
      'Bạn đồng ý bồi thường và giữ cho Vibely không bị thiệt hại trước các khiếu nại, trách nhiệm hoặc chi phí phát sinh từ hành vi vi phạm điều khoản, pháp luật hoặc quyền của bên thứ ba.',
    ],
  },
  {
    id: 'loai-tru-dam-bao',
    title: '9. LOẠI TRỪ ĐẢM BẢO',
    paragraphs: [
      'Dịch vụ được cung cấp trên cơ sở “nguyên trạng” và “sẵn có”. Vibely không cam kết tuyệt đối rằng dịch vụ sẽ luôn không gián đoạn hoặc không có lỗi.',
      'Trong phạm vi pháp luật cho phép, Vibely loại trừ các bảo đảm ngụ ý không được nêu rõ trong điều khoản này.',
    ],
  },
  {
    id: 'gioi-han-trach-nhiem',
    title: '10. GIỚI HẠN TRÁCH NHIỆM',
    paragraphs: [
      'Trong phạm vi tối đa pháp luật cho phép, Vibely không chịu trách nhiệm với tổn thất gián tiếp, mất lợi nhuận hoặc mất cơ hội kinh doanh phát sinh từ việc sử dụng dịch vụ.',
      'Không điều khoản nào loại trừ trách nhiệm của Vibely trong các trường hợp pháp luật bắt buộc không được loại trừ.',
    ],
  },
  {
    id: 'dieu-khoan-khac',
    title: '11. Điều Khoản Khác',
    bullets: [
      'Luật áp dụng và cơ chế giải quyết tranh chấp được xác định theo điều khoản khu vực tương ứng.',
      'Nếu một phần điều khoản bị tuyên vô hiệu, các phần còn lại vẫn giữ nguyên hiệu lực.',
      'Việc Vibely không thực thi ngay một quyền không đồng nghĩa với việc từ bỏ quyền đó.',
      'Bạn có thể liên hệ hỗ trợ qua email legal@vibely.app cho các vấn đề pháp lý.',
    ],
  },
]

export function TermsOfServicePage() {
  useEffect(() => {
    document.title = 'Điều khoản dịch vụ | Vibely'
  }, [])

  return (
    <section className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-3xl font-bold">Vibely</h1>
          <Link to="/login" className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700">
            Quay lại đăng nhập
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[280px_1fr]">
        <aside className="sticky top-4 h-fit rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Mục lục</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            {sections.map((section) => (
              <li key={section.id}>
                <a className="hover:text-white" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <article className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-4xl font-bold">Điều Khoản Dịch Vụ</h2>
          <p className="text-sm italic text-zinc-400">Cập nhật mới nhất: 1 tháng 12 năm 2025</p>
          <p className="text-zinc-300">Điều Khoản Chung – Cho Tất Cả Người Dùng</p>
          <p className="text-zinc-300">
            Tài liệu này mô tả các quy định pháp lý áp dụng khi bạn truy cập hoặc sử dụng bất kỳ sản phẩm/dịch vụ nào
            trong hệ sinh thái Vibely.
          </p>

          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20 space-y-3">
              <h3 className="text-2xl font-semibold">{section.title}</h3>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-zinc-300">
                  {paragraph}
                </p>
              ))}
              {section.bullets?.length ? (
                <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.subsections?.map((subsection) => (
                <div key={subsection.title} className="space-y-2">
                  <h4 className="text-lg font-semibold text-zinc-200">{subsection.title}</h4>
                  {subsection.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="text-zinc-300">
                      {paragraph}
                    </p>
                  ))}
                  {subsection.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-6 text-zinc-300">
                      {subsection.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </article>
      </div>
    </section>
  )
}
