import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'

const sections = [
  {
    id: 'thu-thap-thong-tin',
    title: 'Chúng tôi thu thập thông tin gì',
    paragraphs: [
      'Chúng tôi có thể thu thập một số loại thông tin để vận hành dịch vụ ổn định, cải thiện trải nghiệm người dùng và bảo vệ an toàn cho cộng đồng.',
    ],
    subsections: [
      {
        title: 'Thông tin bạn cung cấp',
        bullets: [
          'Thông tin tài khoản: tên người dùng, mật khẩu, ngày sinh (nếu áp dụng), email, số điện thoại, thông tin hồ sơ và ảnh đại diện.',
          'Nội dung người dùng: hình ảnh, âm thanh, video, bình luận, hashtag, phản hồi, livestream và siêu dữ liệu liên quan như thời gian, địa điểm, người tạo.',
          'Tin nhắn: nội dung tin nhắn, thời điểm gửi/nhận/đọc và dữ liệu liên quan tới cuộc hội thoại theo quy định pháp luật.',
          'Nội dung trong bộ nhớ đệm thiết bị (khi có cấp quyền) để hỗ trợ thao tác dán/chia sẻ nội dung theo yêu cầu người dùng.',
          'Thông tin giao dịch: dữ liệu thanh toán, hóa đơn, giao hàng, thông tin liên hệ và lịch sử mua hàng trên nền tảng.',
          'Danh bạ điện thoại hoặc mạng xã hội (khi bạn chọn đồng bộ) để hỗ trợ tìm bạn bè và gợi ý kết nối.',
          'Bằng chứng danh tính hoặc độ tuổi khi cần xác minh để mở một số tính năng nâng cao.',
          'Thông tin bạn gửi cho bộ phận hỗ trợ, phản hồi khảo sát, cuộc thi, chiến dịch cộng đồng hoặc nghiên cứu.',
        ],
      },
      {
        title: 'Thông tin được thu thập tự động',
        bullets: [
          'Thông tin sử dụng: cách bạn xem nội dung, tìm kiếm, tương tác với bài đăng, quảng cáo và tài khoản khác.',
          'Thông tin suy luận: sở thích, nhóm nội dung quan tâm và mức độ tương tác để cá nhân hóa đề xuất.',
          'Thông tin kỹ thuật: địa chỉ IP, loại thiết bị, hệ điều hành, trình duyệt, nhà mạng, múi giờ, độ phân giải và mã định danh thiết bị.',
          'Thông tin vị trí: vị trí gần đúng theo IP/SIM và vị trí chính xác khi bạn cấp quyền truy cập GPS.',
          'Thông tin hình ảnh và âm thanh trong nội dung để kiểm duyệt, đề xuất nội dung và nâng cao chất lượng tính năng.',
          'Cookie và công nghệ tương tự để duy trì phiên đăng nhập, đo lường hiệu suất và tối ưu trải nghiệm.',
        ],
      },
      {
        title: 'Thông tin từ nguồn khác',
        bullets: [
          'Thông tin từ dịch vụ đăng nhập bên thứ ba (ví dụ: Apple, Google, Facebook) khi bạn chọn liên kết tài khoản.',
          'Thông tin từ đối tác quảng cáo, đo lường và phát hành để đánh giá hiệu quả nội dung và quảng cáo.',
          'Thông tin từ đơn vị liên kết trong cùng hệ sinh thái để tăng cường an toàn và đồng bộ dịch vụ.',
          'Thông tin từ người dùng khác hoặc nguồn công khai khi bạn được nhắc đến trong nội dung, khiếu nại hoặc phản hồi.',
          'Thông tin từ bên thanh toán, vận chuyển hoặc hoàn tất giao dịch khi bạn mua sản phẩm/dịch vụ trên nền tảng.',
        ],
      },
    ],
  },
  {
    id: 'su-dung-thong-tin',
    title: 'Cách chúng tôi sử dụng thông tin của bạn',
    bullets: [
      'Cung cấp, duy trì và cải thiện tính năng cốt lõi của nền tảng.',
      'Cá nhân hóa bảng tin, đề xuất nội dung và trải nghiệm quảng cáo.',
      'Hỗ trợ giao dịch mua hàng, thanh toán và xử lý đơn hàng.',
      'Bảo vệ an toàn hệ thống, phát hiện gian lận, spam, hành vi lạm dụng và vi phạm chính sách.',
      'Đo lường hiệu quả nội dung, chiến dịch và mức độ tương tác.',
      'Liên lạc với bạn về cập nhật dịch vụ, thông báo bảo mật hoặc thay đổi chính sách.',
      'Xác minh danh tính/độ tuổi khi cần để kích hoạt tính năng nhất định.',
      'Đáp ứng nghĩa vụ pháp lý và bảo vệ quyền lợi hợp pháp của Vibely và cộng đồng.',
    ],
  },
  {
    id: 'chia-se-thong-tin',
    title: 'Cách chúng tôi chia sẻ thông tin của bạn',
    paragraphs: ['Chúng tôi chỉ chia sẻ dữ liệu trong phạm vi cần thiết và có kiểm soát với các nhóm sau:'],
    subsections: [
      {
        title: 'Đối tác kinh doanh',
        bullets: [
          'Đối tác đăng nhập để xác thực tài khoản khi bạn sử dụng hình thức đăng nhập bên thứ ba.',
          'Đối tác bán hàng hoặc thương mại để xử lý đơn hàng và dịch vụ hậu mãi.',
        ],
      },
      {
        title: 'Nhà cung cấp dịch vụ',
        bullets: [
          'Hạ tầng đám mây, lưu trữ, bảo mật, chống gian lận và kiểm duyệt nội dung.',
          'Nhà cung cấp thanh toán, vận chuyển và phân tích dữ liệu.',
        ],
      },
      {
        title: 'Đối tác quảng cáo và đo lường',
        bullets: [
          'Dữ liệu tổng hợp hoặc dữ liệu cần thiết để đo lường hiệu quả quảng cáo và nội dung.',
        ],
      },
      {
        title: 'Lý do pháp lý và an toàn',
        bullets: [
          'Cơ quan có thẩm quyền khi có yêu cầu hợp pháp.',
          'Bên liên quan để bảo vệ quyền, tài sản, an toàn của người dùng và cộng đồng.',
        ],
      },
      {
        title: 'Giao dịch doanh nghiệp',
        bullets: [
          'Dữ liệu có thể được chuyển giao trong trường hợp sáp nhập, mua bán hoặc tái cấu trúc doanh nghiệp theo pháp luật.',
        ],
      },
    ],
  },
  {
    id: 'luu-tru-o-dau',
    title: 'Chúng tôi lưu trữ thông tin của bạn ở đâu',
    paragraphs: [
      'Thông tin có thể được lưu trữ và xử lý tại nhiều khu vực để đảm bảo hiệu năng, tính sẵn sàng và khả năng dự phòng của dịch vụ trên quy mô toàn cầu.',
      'Chúng tôi áp dụng các biện pháp bảo vệ kỹ thuật và hợp đồng phù hợp cho việc chuyển dữ liệu xuyên biên giới.',
    ],
  },
  {
    id: 'quyen-lua-chon',
    title: 'Quyền và lựa chọn của bạn',
    bullets: [
      'Truy cập, chỉnh sửa, cập nhật hoặc xóa thông tin tài khoản.',
      'Quản lý quyền riêng tư, quyền hiển thị nội dung và quyền liên hệ.',
      'Tắt hoặc giới hạn cookie trong trình duyệt/thiết bị.',
      'Yêu cầu xuất dữ liệu hoặc giới hạn xử lý dữ liệu trong phạm vi pháp luật cho phép.',
      'Gửi khiếu nại hoặc yêu cầu hỗ trợ về quyền dữ liệu qua kênh liên hệ chính thức của Vibely.',
    ],
  },
  {
    id: 'bao-mat-thong-tin',
    title: 'Bảo mật thông tin của bạn',
    paragraphs: [
      'Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp như mã hóa, kiểm soát truy cập, ghi nhận nhật ký và giám sát hệ thống để bảo vệ dữ liệu cá nhân.',
      'Dù vậy, không có phương thức truyền tải nào qua Internet an toàn tuyệt đối; bạn cũng nên chủ động bảo vệ thông tin đăng nhập của mình.',
    ],
  },
  {
    id: 'thoi-gian-luu-giu',
    title: 'Chúng tôi lưu giữ thông tin của bạn trong bao lâu',
    paragraphs: [
      'Thời gian lưu giữ phụ thuộc vào loại dữ liệu, mục đích xử lý và nghĩa vụ pháp lý tương ứng.',
      'Khi tài khoản bị xóa hoặc không còn cần thiết cho mục đích đã nêu, dữ liệu sẽ được xóa, ẩn danh hoặc lưu trữ giới hạn theo yêu cầu tuân thủ.',
    ],
  },
  {
    id: 'tre-em-thieu-nien',
    title: 'Thông tin liên quan đến trẻ em và thiếu niên',
    paragraphs: [
      'Dịch vụ không dành cho người dùng dưới độ tuổi tối thiểu theo quy định pháp luật hiện hành tại từng khu vực.',
      'Cha mẹ/người giám hộ có thể liên hệ với chúng tôi để được hỗ trợ về tài khoản của người dùng chưa thành niên khi cần.',
    ],
  },
  {
    id: 'cap-nhat-chinh-sach',
    title: 'Cập Nhật Chính Sách Quyền Riêng Tư',
    paragraphs: [
      'Chúng tôi có thể cập nhật chính sách này theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên nền tảng hoặc qua kênh phù hợp.',
      'Việc bạn tiếp tục sử dụng dịch vụ sau thời điểm hiệu lực đồng nghĩa với việc bạn chấp nhận bản cập nhật.',
    ],
  },
  {
    id: 'lien-he',
    title: 'Liên hệ',
    paragraphs: [
      'Mọi câu hỏi, phản hồi hoặc yêu cầu liên quan đến quyền riêng tư, vui lòng liên hệ đội ngũ hỗ trợ Vibely qua email: privacy@vibely.app.',
      'Chúng tôi sẽ nỗ lực phản hồi trong thời gian sớm nhất theo quy trình vận hành nội bộ.',
    ],
  },
  {
    id: 'dieu-khoan-bo-sung',
    title: 'Điều Khoản Bổ Sung – Khu Vực Pháp Lý Cụ Thể',
    paragraphs: [
      'Trong trường hợp có mâu thuẫn giữa quy định chung và quy định áp dụng theo khu vực pháp lý của bạn, điều khoản khu vực sẽ được ưu tiên áp dụng.',
      'Tại Việt Nam, người dùng có đầy đủ quyền theo luật dữ liệu cá nhân hiện hành: quyền được biết, truy cập, chỉnh sửa, xóa dữ liệu, hạn chế xử lý, phản đối xử lý, và khiếu nại theo quy định.',
    ],
  },
]

export function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Chính sách bảo mật | Vibely'
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
          <h2 className="text-4xl font-bold">Chính Sách Quyền Riêng Tư</h2>
          <p className="text-sm italic text-zinc-400">Hiệu lực kể từ ngày 2/6/2025</p>
          <p className="text-zinc-300">
            Chào mừng bạn đến với Vibely. Chính Sách Quyền Riêng Tư này áp dụng cho các ứng dụng, trang web, phần mềm
            và dịch vụ liên quan của Vibely (gọi chung là “Nền Tảng”).
          </p>
          <p className="text-zinc-300">
            Chúng tôi cam kết bảo vệ và tôn trọng quyền riêng tư của bạn. Chính sách này giải thích cách chúng tôi thu
            thập, sử dụng, chia sẻ và xử lý thông tin cá nhân. Nếu bạn không đồng ý với chính sách này, vui lòng ngừng
            sử dụng Nền Tảng.
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
