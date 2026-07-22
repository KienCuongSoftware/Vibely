import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  IoCheckmarkCircle,
  IoChevronBack,
  IoChevronForward,
  IoClose,
} from 'react-icons/io5'
import { apiClient } from '../../api/client.js'
import { isVideoPublicId, normalizeVideoPublicId } from '../../utils/videoPublicId.js'

const SHOPPING_SUB_REASONS = [
  'Thổi phồng hiệu quả của sản phẩm',
  'Quà tặng gây hiểu lầm',
  'Giá sản phẩm không nhất quán',
  'Tái chuyển hướng lưu lượng truy cập ra bên ngoài nền tảng',
  'Lý do khác',
]

/** Danh mục báo cáo — thứ tự gần TikTok web (VI). */
export const FEED_REPORT_CATEGORIES = [
  {
    label: 'Liên quan đến mua sắm',
    children: SHOPPING_SUB_REASONS,
  },
  {
    label: 'Bán hàng giả',
    children: [
      {
        label: 'Sản phẩm nhái',
        infoTitle: null,
        infoBullets: [
          'Sản xuất, phân phối hoặc bán sản phẩm nhái thương hiệu',
          'Cố tình làm mờ hoặc ẩn tên hoặc logo thương hiệu',
          'Thông điệp bằng văn bản hoặc lời nói, cũng như hành vi gợi ý bán sản phẩm nhái',
        ],
        infoWithDescription: true,
      },
      {
        label: 'Giống sản phẩm của thương hiệu khác',
        infoTitle: null,
        infoBullets: [
          '“Hàng giả” nhái lại nhãn hiệu thương mại, logo, cách phối màu, bao bì, thiết kế sản phẩm tương tự hoặc kiểu dáng tổng thể của hàng hóa thuộc thương hiệu gốc',
          'Sản phẩm bắt chước thiết kế của thương hiệu gốc, dù là có sử dụng logo hoặc nhãn hiệu thương mại tương tự hay không',
        ],
        infoWithDescription: true,
      },
      {
        label: 'Khác',
        infoTitle: null,
        infoBullets: [
          'Sử dụng tài liệu có bản quyền khi chưa được chủ sở hữu quyền cho phép',
          'Sử dụng bằng sáng chế hay thiết kế, hoặc cả hai, khi chưa được chủ sở hữu tài sản trí tuệ cho phép',
          'Hành vi gây hiểu lầm thuộc mọi hình thức nhằm gây nhầm lẫn hoặc lừa đảo người dùng với mục đích chính là bán sản phẩm vi phạm bản quyền',
        ],
        infoWithDescription: true,
      },
    ],
  },
  {
    label: 'Bạo lực, lạm dụng và bóc lột để phạm tội',
    children: [
      'Bóc lột hoặc lạm dụng người dưới 18 tuổi',
      'Bạo lực thể chất và đe dọa bạo lực',
      'Bóc lột và lạm dụng tình dục',
      'Bóc lột con người',
      'Ngược đãi động vật',
      'Hoạt động phạm tội khác',
    ],
  },
  {
    label: 'Thù ghét và quấy rối',
    children: [
      {
        label: 'Ngôn ngữ gây thù ghét và hành vi gây thù ghét',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Cho thấy hoặc cổ xúy bạo lực, phân biệt đối xử và các hành động gây hại khác, bao gồm tuyên bố uy quyền trên cơ sở đặc điểm cá nhân, chẳng hạn như chủng tộc, tôn giáo, giới tính và xu hướng tính dục',
          'Hạ bệ người khác trên cơ sở các đặc điểm cá nhân này, bao gồm việc sử dụng lời vu khống gây thù ghét',
          'Phản đối các sự kiện lịch sử đã được dẫn chứng bằng tư liệu gây hại cho các nhóm được bảo vệ, chẳng hạn như nạn diệt chủng Holocaust',
          'Cổ xúy hoặc ủng hộ các nội dung, cá nhân và tổ chức khuyến khích tư tưởng thù địch',
        ],
      },
      {
        label: 'Quấy rối và bắt nạt',
        children: [
          {
            label: 'Tôi đã từng bị bắt nạt hoặc quấy rối',
            infoIntro: 'Chúng tôi không cho phép',
            infoBullets: [
              'Thể hiện, cổ xúy hoặc đe dọa xúc phạm ai đó, bao gồm cả việc sử dụng lời lẽ tục tĩu hoặc ngôn từ khiếm nhã để hạ nhục họ',
              'Thể hiện, cổ xúy hoặc đe dọa quấy rối hay bắt nạt người khác, dù là về mặt thể chất hay dưới bất kỳ hình thức nào khác, bao gồm cả hành vi quấy rối có tổ chức',
              'Cho thấy, cổ xúy hoặc đe dọa thực hiện những hành vi như thu thập thông tin, tống tiền, tiết lộ hoặc kêu gọi tiết lộ thông tin riêng tư hoặc nhạy cảm',
            ],
          },
          {
            label: 'Tôi biết một người đã từng bị bắt nạt hoặc quấy rối',
            detailLabel: 'Cung cấp tên tài khoản của người đó',
            detailPlaceholder: 'Tìm kiếm tài khoản',
          },
          {
            label: 'Một người nổi tiếng hoặc quan chức chính phủ đã từng bị bắt nạt hoặc quấy rối',
            infoIntro: 'Chúng tôi không cho phép',
            infoBullets: [
              'Thể hiện, cổ xúy hoặc đe dọa xúc phạm ai đó, bao gồm cả việc sử dụng lời lẽ tục tĩu hoặc ngôn từ khiếm nhã để hạ nhục họ',
              'Thể hiện, cổ xúy hoặc đe dọa quấy rối hay bắt nạt người khác, dù là về mặt thể chất hay dưới bất kỳ hình thức nào khác, bao gồm cả hành vi quấy rối có tổ chức',
              'Cho thấy, cổ xúy hoặc đe dọa thực hiện những hành vi như thu thập thông tin, tống tiền, tiết lộ hoặc kêu gọi tiết lộ thông tin riêng tư hoặc nhạy cảm',
            ],
          },
          {
            label: 'Những người khác đã từng bị bắt nạt hoặc quấy rối',
            infoIntro: 'Chúng tôi không cho phép',
            infoBullets: [
              'Thể hiện, cổ xúy hoặc đe dọa xúc phạm ai đó, bao gồm cả việc sử dụng lời lẽ tục tĩu hoặc ngôn từ khiếm nhã để hạ nhục họ',
              'Thể hiện, cổ xúy hoặc đe dọa quấy rối hay bắt nạt người khác, dù là về mặt thể chất hay dưới bất kỳ hình thức nào khác, bao gồm cả hành vi quấy rối có tổ chức',
              'Cho thấy, cổ xúy hoặc đe dọa thực hiện những hành vi như thu thập thông tin, tống tiền, tiết lộ hoặc kêu gọi tiết lộ thông tin riêng tư hoặc nhạy cảm',
            ],
            infoWithDescription: true,
            detailPlaceholder:
              'Cung cấp thêm thông tin chi tiết để giúp chúng tôi hiểu rõ hơn về vấn đề.',
          },
        ],
      },
    ],
  },
  {
    label: 'Tự tử và tự làm hại bản thân',
    infoBullets: [
      'Chúng tôi muốn Vibely trở thành nơi mà các chủ đề phức tạp về mặt cảm xúc có thể được thảo luận một cách cởi mở mà không làm tăng nguy cơ gây hại.',
      'Chúng tôi không cho phép cho thấy, cổ xúy hoặc chia sẻ kế hoạch tự tử hoặc tự hại. Nếu bạn hoặc người quen của bạn đang gặp khó khăn, chúng tôi luôn sẵn sàng hỗ trợ. Hãy liên hệ với đường dây trợ giúp phòng chống tự tử hoặc các dịch vụ khẩn cấp.',
      'Chúng tôi cũng không cho phép đăng nội dung cổ xúy hành vi ăn uống thất thường, hành vi kiểm soát cân nặng nguy hiểm hoặc hành vi mua bán và tiếp thị các sản phẩm cũng như dịch vụ liên quan đến cân nặng có chứa những tuyên bố gây hại. Nếu bạn hoặc người quen của bạn đang lo lắng về hình ảnh cơ thể, thực phẩm hoặc việc tập thể dục, vui lòng liên hệ với đường dây trợ giúp tại địa phương.',
    ],
  },
  {
    label: 'Cách ăn uống không lành mạnh và hình ảnh cơ thể ốm yếu',
    infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
    infoBullets: [
      'Cho thấy hoặc cổ xúy cách ăn uống không lành mạnh, chẳng hạn như chế độ ăn kiêng cực đoan, nhịn ăn, ăn uống vô độ, cố tình nôn mửa, cũng như các hành vi giảm cân nguy hiểm khác, bao gồm tập thể dục quá sức và sử dụng các loại thuốc và thực phẩm chức năng có khả năng gây hại',
      'Cho thấy hoặc cổ xúy xu hướng đo lường cơ thể không lành mạnh',
    ],
  },
  {
    label: 'Hoạt động và thử thách nguy hiểm',
    infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
    infoBullets: [
      'Cho thấy hoặc cổ xúy các hoạt động, game, thách thức, thử thách hoặc pha hành động nguy hiểm vốn gây ra hoặc có thể gây ra tổn hại nghiêm trọng về thể chất hoặc thiệt hại tài sản, chẳng hạn như sử dụng các công cụ nguy hiểm một cách không phù hợp, sử dụng các chất độc hại và hành vi lái xe nguy hiểm',
      'Được phép sử dụng các dụng cụ nghi lễ, chẳng hạn như giáo mác và khiên chắn, trong các lễ hội tôn giáo và buổi trình diễn văn hóa.',
    ],
  },
  {
    label: 'Hình ảnh khỏa thân hoặc nội dung tình dục',
    children: [
      {
        label: 'Hoạt động, gạ gẫm và bóc lột tình dục thanh thiếu niên',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Cho thấy hoặc cổ xúy nội dung lạm dụng tình dục trẻ em (CSAM) hoặc hoạt động tình dục thanh thiếu niên',
          'Cho thấy hoặc cổ xúy hình ảnh khỏa thân thanh thiếu niên',
          'Cổ xúy hoặc bình thường hóa hành vi bóc lột tình dục, lạm dụng tình dục thanh thiếu niên và ái vật tình dục, bao gồm dụ dỗ, tống tiền/tình bằng hình ảnh tình dục và ấu dâm',
          'Cho thấy hoặc cổ xúy hành vi bóc lột tình dục, bao gồm mời người dưới 18 tuổi tham gia hành vi tình dục, hẹn gặp ngoài nền tảng và chia sẻ hình ảnh khiêu dâm, ngay cả khi người khởi xướng cũng dưới 18 tuổi',
          'Vật hóa hoặc tính dục hóa người dưới 18 tuổi qua hình ảnh hoặc các tính năng tương tác trong ứng dụng',
        ],
      },
      {
        label: 'Hành vi khiêu gợi tình dục của thanh thiếu niên',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Để lộ phần lớn cơ thể thanh thiếu niên',
          'Màn trình diễn khiêu gợi của người dưới 18 tuổi',
          'Đề cập hoặc ám chỉ trực tiếp hay gián tiếp đến giới tính và hoạt động tình dục của thanh thiếu niên',
          'Được phép đăng một số nội dung phi tình dục cho thấy quầng vú hoặc đầu nhũ hoa trong ngữ cảnh y tế, vì mục đích giáo dục, hoặc theo thực tiễn được chấp nhận về mặt văn hóa. Được phép đăng một số nội dung để lộ cơ thể trong ngữ cảnh được kỳ vọng về mặt văn hóa, chẳng hạn như vận động viên mặc trang phục thể thao hoặc người mặc đồ bơi ở bãi biển.',
        ],
      },
      {
        label: 'Hoạt động, dịch vụ và gạ gẫm tình dục người lớn',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Mời chào hoặc yêu cầu trở thành bạn tình hoặc tham gia hành vi tình dục',
          'Nội dung tình dục trần trụi, bao gồm nội dung khiêu dâm cho thấy cảnh giao cấu, thủ dâm và mô tả sống động hành vi tình dục',
        ],
      },
      {
        label: 'Hình ảnh khỏa thân người lớn',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Hình ảnh khỏa thân người lớn, bao gồm ảnh chụp và ảnh được tạo bằng kỹ thuật số (chẳng hạn như manga và anime)',
          'Được phép đăng một số nội dung phi tình dục cho thấy quầng vú hoặc đầu nhũ hoa trong ngữ cảnh y tế, vì mục đích giáo dục, theo thực tiễn được chấp nhận về mặt văn hóa, hoặc trong ngữ cảnh được kỳ vọng về mặt văn hóa, chẳng hạn như để lộ quầng vú hoặc đầu nhũ hoa khi cho con bú hoặc trong các lễ hội kỷ niệm (như ngày lễ).',
        ],
      },
      {
        label: 'Ngôn ngữ khiêu dâm',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Tường thuật trần trụi về tình dục, chẳng hạn như mô tả sống động về hành vi tình dục của người lớn hoặc người dưới 18 tuổi',
        ],
      },
    ],
  },
  {
    label: 'Nội dung gây sốc và phản cảm',
    infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
    infoBullets: [
      'Hình ảnh tử vong và tai nạn',
      'Bộ phận cơ thể người hoặc động vật bị cắt xẻ, hủy hoại, đốt, thiêu hoặc bị thương nghiêm trọng',
      'Được phép đăng một số nội dung thể hiện dưới bối cảnh giáo dục, nghệ thuật hoặc chuyên môn, chẳng hạn như chiến đấu chuyên nghiệp.',
    ],
  },
  {
    label: 'Thông tin sai lệch',
    children: [
      {
        label: 'Thông tin sai lệch về bầu cử',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Thông tin sai lệch về cách bình chọn hoặc ứng cử chức vụ',
          'Thông tin sai lệch về kết quả bầu cử cuối cùng',
        ],
      },
      {
        label: 'Thông tin sai lệch gây nguy hiểm',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Thông tin sai lệch gây nguy hiểm cho sự an toàn công cộng hoặc có thể sẽ gây ra hoảng loạn, chẳng hạn như sử dụng cảnh quay cũ của một sự kiện trong quá khứ và nói dối là sự kiện hiện tại, hoặc lan truyền thông tin không chính xác tuyên bố là đồ dùng thiết yếu như thực phẩm hoặc nước không còn nữa',
          'Thông tin y tế gây rủi ro cho sức khỏe cộng đồng, chẳng hạn như những tuyên bố sai lệch về vắc-xin, cũng như tư vấn y tế không chính xác ngăn cản người khác nhận các dịch vụ chăm sóc y tế thích hợp',
          'Thông tin sai lệch về biến đổi khí hậu, trái với sự đồng thuận khoa học đã có từ lâu, chẳng hạn như phản bác sự hiện hữu của biến đổi khí hậu',
          'Thuyết âm mưu nguy hiểm cổ xúy bạo lực, lòng thù hận hoặc nhắm đến cá nhân, chẳng hạn như những lý thuyết tạo thành kiến đối với một nhóm cụ thể hoặc gây hại',
        ],
      },
      {
        label: 'Deepfake, truyền thông nhân tạo và truyền thông thao túng',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Truyền thông nhân tạo hoặc thao túng cho thấy những cảnh thật vốn không được khai báo đầy đủ hoặc gắn nhãn trong video',
          'Truyền thông nhân tạo có chứa chân dung (hình ảnh hoặc âm thanh) của một người thật khi được sử dụng trong lời chứng thực chính trị hoặc thương mại, hoặc nếu vi phạm Nguyên tắc Cộng đồng của chúng tôi',
          'Tài liệu được chỉnh sửa theo cách khiến người khác hiểu lầm về sự kiện thật',
          'Được phép đăng nội dung truyền thông nhân tạo cho thấy một nhân vật công chúng trong ngữ cảnh nghệ thuật hoặc giáo dục, chẳng hạn như một người nổi tiếng thực hiện điệu nhảy nổi tiếng, hoặc một nhân vật lịch sử xuất hiện trong bài học lịch sử.',
        ],
      },
    ],
  },
  {
    label: 'Hành vi lừa đảo và gửi nội dung rác',
    children: [
      {
        label: 'Tương tác ảo',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Cung cấp hướng dẫn hoặc quảng bá các phương pháp hoặc dịch vụ để giúp người dùng tăng tương tác ảo, chẳng hạn như bán follower hoặc lượt thích',
        ],
      },
      {
        label: 'Thư rác',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Các tài khoản được sử dụng hàng loạt hoặc thông qua công cụ tự động trái phép như bot để phát tán lượng lớn nội dung, bao gồm mục đích thương mại',
          'Các mạng lưới tài khoản tuyên bố bản thân là các thực thể tương tự hoặc đăng nội dung tương tự để dẫn dắt người dùng đến những vị trí cụ thể trên Vibely hoặc ngoài nền tảng, chẳng hạn như tài khoản, trang web và doanh nghiệp khác',
        ],
      },
    ],
  },
  {
    label: 'Hàng hóa và hoạt động được kiểm soát',
    children: [
      {
        label: 'Chơi cờ bạc',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Dịch vụ cờ bạc, chẳng hạn như casino, bài poker, máy đánh bạc, cò quay, xổ số, mẹo cá cược, cũng như phần mềm và ứng dụng liên quan đến cờ bạc',
        ],
      },
      {
        label: 'Rượu bia, thuốc lá và ma túy',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Cho thấy người trẻ tuổi sở hữu, sử dụng hoặc giao dịch sản phẩm rượu bia, thuốc lá, ma túy hoặc các chất bị kiểm soát khác',
          'Cho thấy hoặc cổ xúy người lớn sử dụng ma túy hoặc các chất bị kiểm soát khác vì mục đích giải trí',
          'Cho thấy hoặc cổ xúy hành vi lạm dụng đồ gia dụng thông thường hoặc sản phẩm thuốc không kê đơn để được hưng phấn, chẳng hạn như thuốc kháng histamin và hít keo',
          'Cung cấp hướng dẫn về cách pha chế rượu mạnh, sản xuất ma túy hoặc các chất bị kiểm soát khác',
          'Tạo điều kiện giao dịch hoặc mua sản phẩm rượu bia, thuốc lá, ma túy hoặc các chất bị kiểm soát khác',
        ],
      },
      {
        label: 'Súng và vũ khí nguy hiểm',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Cho thấy hoặc quảng bá súng hoặc vũ khí gây nổ không được sử dụng trong bối cảnh an toàn hoặc không thích hợp',
          'Tạo điều kiện giao dịch hoặc cung cấp hướng dẫn về cách sản xuất súng hoặc vũ khí gây nổ',
        ],
      },
      {
        label: 'Giao dịch các loại hàng hóa và dịch vụ được kiểm soát khác',
        infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
        infoBullets: [
          'Giao dịch tiền và tài liệu giả cũng như thông tin bị đánh cắp',
          'Giao dịch động vật hoang dã và bất cứ bộ phận nào của động vật có nguy cơ tuyệt chủng, chẳng hạn như sản phẩm và thuốc được làm từ ngà voi',
        ],
      },
    ],
  },
  {
    label: 'Gian lận và lừa đảo',
    infoTitle: 'Tìm hiểu thêm về lý do này',
    infoBullets: [
      'Vibely là nơi để học hỏi và tương tác với nhiều chủ đề khác nhau, chúng tôi không cho phép bất kỳ ai lợi dụng điều đó.',
      'Chúng tôi không cho phép bất kỳ hành vi nào lừa đảo, đánh lừa hoặc chiếm đoạt tài sản của người khác, bao gồm hỗ trợ các vụ lừa đảo tài chính, mạo danh người nổi tiếng để bán hàng hoặc liên hệ với người dùng, hoặc bất kỳ hình thức gian lận nào khác.',
      'Chúng tôi cũng không cho phép các tài khoản gây hiểu lầm hoặc tìm cách thao túng nền tảng hoặc giao dịch các dịch vụ nhằm tăng tương tác ảo hoặc đánh lừa hệ thống đề xuất.',
    ],
  },
  {
    label: 'Chia sẻ thông tin cá nhân',
    infoIntro: 'Chúng tôi không cho phép đăng nội dung:',
    infoBullets: [
      'Chia sẻ số điện thoại cá nhân và địa chỉ nhà',
      'Chia sẻ thông tin tài chính và thanh toán, chẳng hạn như tài khoản ngân hàng và số thẻ tín dụng',
      'Chia sẻ thông tin đăng nhập, chẳng hạn như tên người dùng và mật khẩu',
      'Chia sẻ giấy tờ tùy thân hoặc số nhận dạng, chẳng hạn như hộ chiếu và số an sinh xã hội',
    ],
  },
  {
    label: 'Sản phẩm nhái và quyền sở hữu trí tuệ',
    children: [
      {
        label: 'Sản phẩm nhái',
        children: [
          'Tôi là người nắm quyền sở hữu',
          'Nghi vấn xâm phạm quyền của người khác',
        ],
      },
      'Hành vi vi phạm quyền sở hữu trí tuệ',
    ],
  },
  { label: 'Khác' },
]

/** @deprecated dùng FEED_REPORT_CATEGORIES */
export const FEED_REPORT_REASONS = FEED_REPORT_CATEGORIES.map((c) => c.label)

const DESC_PLACEHOLDER =
  'Cung cấp thông tin chi tiết để giúp chúng tôi hiểu rõ vấn đề'
const MAX_REASON_LEN = 500

/** @param {string | { label: string, infoIntro?: string, infoBullets?: string[], infoTitle?: string }} child */
function normalizeReportChild(child) {
  if (typeof child === 'string') return { label: child }
  return child
}

function buildReportPayload(categoryLabel, reasonLabel, description) {
  const desc = String(description ?? '').trim()
  const base =
    categoryLabel && categoryLabel !== reasonLabel
      ? `${categoryLabel} — ${reasonLabel}`
      : reasonLabel
  if (!desc) return base.slice(0, MAX_REASON_LEN)
  const joined = `${base}: ${desc}`
  return joined.slice(0, MAX_REASON_LEN)
}

/**
 * Modal báo cáo video kiểu TikTok — mở từ mục «Báo cáo» trong menu ⋯.
 *
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   videoPublicId?: string | number | null
 *   token?: string | null
 *   onRequireAuth?: () => void
 *   onSubmitted?: (reason: string) => void
 * }} props
 */
export function FeedReportModal({
  open,
  onClose,
  videoPublicId,
  token,
  onRequireAuth,
  onSubmitted,
}) {
  /** 'pick' | 'sub' | 'detail' | 'info' | 'submitting' | 'done' */
  const [phase, setPhase] = useState('pick')
  /** Danh mục gốc (cấp 1) — dùng khi gửi payload. */
  const [category, setCategory] = useState(null)
  /** Stack menu con — phần tử cuối là danh sách đang hiện. */
  const [navStack, setNavStack] = useState([])
  /** Trang info đang xem (có thể là danh mục gốc hoặc mục con). */
  const [infoPage, setInfoPage] = useState(null)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [detailMeta, setDetailMeta] = useState(null)
  const [error, setError] = useState('')
  /** 'detail' | 'info' — màn trước khi gửi, để khôi phục khi lỗi. */
  const [submitFrom, setSubmitFrom] = useState('detail')

  const reset = () => {
    setPhase('pick')
    setCategory(null)
    setNavStack([])
    setInfoPage(null)
    setReason('')
    setDescription('')
    setDetailMeta(null)
    setError('')
    setSubmitFrom('detail')
  }

  useEffect(() => {
    if (!open) return
    reset()
  }, [open, videoPublicId])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key !== 'Escape' || phase === 'submitting') return
      if (phase === 'detail' || phase === 'info') {
        if (navStack.length > 0) {
          setPhase('sub')
          setInfoPage(null)
          setDetailMeta(null)
          setReason('')
          setDescription('')
          setError('')
        } else {
          reset()
        }
        return
      }
      if (phase === 'sub') {
        if (navStack.length > 1) {
          setNavStack((prev) => prev.slice(0, -1))
          setError('')
        } else {
          reset()
        }
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, phase, navStack.length])

  useEffect(() => {
    if (!open || phase !== 'done') return undefined
    const timer = window.setTimeout(() => onClose(), 2200)
    return () => window.clearTimeout(timer)
  }, [open, phase, onClose])

  const listItems = useMemo(() => {
    if (phase === 'sub' && navStack.length > 0) {
      const current = navStack[navStack.length - 1]
      return (current.children ?? []).map((raw) => {
        const child = normalizeReportChild(raw)
        return {
          label: child.label,
          hasChildren: Boolean(child.children?.length),
          hasInfo: Boolean(child.infoBullets?.length),
          isDetailOnly: Boolean(
            child.detailLabel || child.detailPlaceholder,
          ) && !child.infoBullets?.length,
          child,
        }
      })
    }
    return FEED_REPORT_CATEGORIES.map((item) => ({
      label: item.label,
      hasChildren: Boolean(item.children?.length),
      hasInfo: Boolean(item.infoBullets?.length),
      category: item,
    }))
  }, [phase, navStack])

  const goBack = () => {
    if (phase === 'submitting') return
    if (phase === 'detail' || phase === 'info') {
      if (navStack.length > 0) {
        setPhase('sub')
        setInfoPage(null)
        setDetailMeta(null)
        setReason('')
        setDescription('')
        setError('')
      } else {
        reset()
      }
      return
    }
    if (phase === 'sub') {
      if (navStack.length > 1) {
        setNavStack((prev) => prev.slice(0, -1))
        setError('')
      } else {
        reset()
      }
    }
  }

  const openDetail = (page, parentCategory = category) => {
    setReason(page.label)
    setDescription('')
    setError('')
    setInfoPage(null)
    setDetailMeta({
      label: page.detailLabel || 'Mô tả báo cáo',
      placeholder: page.detailPlaceholder || DESC_PLACEHOLDER,
    })
    setCategory(parentCategory)
    setSubmitFrom('detail')
    setPhase('detail')
  }

  const openInfoPage = (page, parentCategory = category) => {
    setCategory(parentCategory)
    setInfoPage(page)
    setReason(page.label)
    setDescription('')
    setDetailMeta(null)
    setError('')
    setSubmitFrom('info')
    setPhase('info')
  }

  const onPickItem = (item) => {
    if (phase === 'submitting') return
    if (phase === 'pick' && item.hasChildren) {
      setCategory(item.category)
      setNavStack([item.category])
      setPhase('sub')
      setError('')
      return
    }
    if (phase === 'pick' && item.hasInfo) {
      setNavStack([])
      openInfoPage(item.category, item.category)
      return
    }
    if (phase === 'pick') {
      setNavStack([])
      openDetail(item.category ?? { label: item.label }, item.category ?? { label: item.label })
      return
    }
    if (phase === 'sub') {
      if (item.hasChildren) {
        setNavStack((prev) => [...prev, item.child])
        setError('')
        return
      }
      if (item.hasInfo) {
        openInfoPage(item.child, category)
        return
      }
      openDetail(item.child, category)
    }
  }

  const submitReport = async () => {
    if (phase === 'submitting' || !reason) return
    if (!token) {
      onRequireAuth?.()
      onClose()
      return
    }
    const publicId = normalizeVideoPublicId(videoPublicId)
    if (!isVideoPublicId(publicId)) {
      setError('Không xác định được video để báo cáo.')
      return
    }

    const payload = buildReportPayload(category?.label, reason, description)
    setError('')
    setPhase('submitting')
    try {
      await apiClient.reportVideo(publicId, payload, token)
      setPhase('done')
      onSubmitted?.(payload)
    } catch (err) {
      const message =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message.trim()
          : 'Không gửi được báo cáo. Thử lại sau.'
      setError(message)
      setPhase(submitFrom === 'info' ? 'info' : 'detail')
    }
  }

  if (!open || typeof document === 'undefined') return null

  const showBack = phase === 'sub' || phase === 'detail' || phase === 'info'
  const showPickHint = phase === 'pick' || phase === 'sub'
  const infoSource = infoPage ?? category
  const infoBullets = infoSource?.infoBullets ?? []
  const infoIntro = infoSource?.infoIntro ?? ''
  const infoWithDescription = Boolean(infoSource?.infoWithDescription)
  const infoTitle =
    infoSource && Object.prototype.hasOwnProperty.call(infoSource, 'infoTitle')
      ? infoSource.infoTitle
      : infoIntro
        ? null
        : 'Tìm hiểu thêm về lý do này'
  const detailLabel = detailMeta?.label || 'Mô tả báo cáo'
  const detailPlaceholder = detailMeta?.placeholder || DESC_PLACEHOLDER
  const infoDescPlaceholder =
    infoSource?.detailPlaceholder ||
    'Cung cấp thêm thông tin chi tiết để giúp chúng tôi hiểu rõ hơn về vấn đề.'

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Đóng báo cáo"
        className="absolute inset-0 cursor-default bg-black/55"
        onClick={() => {
          if (phase !== 'submitting') onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Báo cáo"
        className="relative z-10 flex max-h-[min(72vh,560px)] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-[#252525] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.08] px-2 py-2.5">
          {showBack ? (
            <button
              type="button"
              aria-label="Quay lại"
              disabled={phase === 'submitting'}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-50"
              onClick={goBack}
            >
              <IoChevronBack className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden />
          )}
          <h2 className="min-w-0 flex-1 text-[17px] font-bold text-white">
            Báo cáo
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            disabled={phase === 'submitting'}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
            onClick={onClose}
          >
            <IoClose className="text-2xl" aria-hidden />
          </button>
        </div>

        {phase === 'done' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <IoCheckmarkCircle className="h-14 w-14 text-[#00f2ea]" aria-hidden />
            <p className="text-[17px] font-semibold text-white">
              Cảm ơn bạn đã báo cáo
            </p>
            <p className="max-w-sm text-[14px] leading-snug text-white/55">
              Chúng tôi sẽ xem xét video này và thực hiện hành động phù hợp nếu
              vi phạm Nguyên tắc Cộng đồng.
            </p>
          </div>
        ) : phase === 'info' || (phase === 'submitting' && submitFrom === 'info') ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-white/[0.06] px-5 py-3.5">
              <p className="text-[15px] font-medium leading-snug text-white">
                {reason}
              </p>
            </div>
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {infoTitle ? (
                <p className="mb-3 text-[15px] font-semibold text-white">
                  {infoTitle}
                </p>
              ) : null}
              {infoIntro ? (
                <p className="mb-3 text-[14px] leading-relaxed text-white/90">
                  {infoIntro}
                </p>
              ) : null}
              <ul className="list-disc space-y-3 pl-5 text-[14px] leading-relaxed text-white/90">
                {infoBullets.map((bullet) => (
                  <li key={bullet.slice(0, 48)}>{bullet}</li>
                ))}
              </ul>
              {infoWithDescription ? (
                <div className="mt-5">
                  <label
                    htmlFor="vibely-report-info-description"
                    className="mb-2 block text-[15px] font-medium text-white"
                  >
                    Mô tả báo cáo
                  </label>
                  <textarea
                    id="vibely-report-info-description"
                    value={description}
                    disabled={phase === 'submitting'}
                    onChange={(e) => setDescription(e.target.value.slice(0, 400))}
                    placeholder={infoDescPlaceholder}
                    rows={4}
                    className="scrollbar-none min-h-[100px] w-full resize-none rounded-md border-0 bg-[#1a1a1a] px-3 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/35 outline-none ring-0 focus:ring-1 focus:ring-white/15 disabled:opacity-60"
                  />
                </div>
              ) : null}
              {error ? (
                <p className="mt-3 text-[13px] text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 justify-end border-t border-white/[0.08] px-5 py-3.5">
              <button
                type="button"
                disabled={phase === 'submitting'}
                className="cursor-pointer rounded-md bg-[#fe2c55] px-5 py-2 text-[14px] font-bold tracking-wide text-white uppercase transition hover:bg-[#ef2b50] disabled:cursor-wait disabled:opacity-70"
                onClick={() => void submitReport()}
              >
                {phase === 'submitting' ? 'Đang gửi…' : 'Gửi'}
              </button>
            </div>
          </div>
        ) : phase === 'detail' || phase === 'submitting' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 bg-[#2f2f2f] px-5 py-3.5">
              <p className="text-[15px] leading-snug text-white">{reason}</p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-4">
              <label
                htmlFor="vibely-report-description"
                className="mb-2 text-[15px] font-medium text-white"
              >
                {detailLabel}
              </label>
              <textarea
                id="vibely-report-description"
                value={description}
                disabled={phase === 'submitting'}
                onChange={(e) => setDescription(e.target.value.slice(0, 400))}
                placeholder={detailPlaceholder}
                rows={6}
                className="scrollbar-none min-h-[140px] w-full flex-1 resize-none rounded-md border-0 bg-[#1a1a1a] px-3 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/35 outline-none ring-0 focus:ring-1 focus:ring-white/15 disabled:opacity-60"
              />
              {error ? (
                <p className="mt-2 text-[13px] text-rose-300" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={phase === 'submitting'}
                  className="cursor-pointer rounded-md bg-[#fe2c55] px-5 py-2 text-[14px] font-bold tracking-wide text-white uppercase transition hover:bg-[#ef2b50] disabled:cursor-wait disabled:opacity-70"
                  onClick={() => void submitReport()}
                >
                  {phase === 'submitting' ? 'Đang gửi…' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {showPickHint ? (
              <p className="shrink-0 px-5 pb-1 pt-3 text-[13px] text-white/45">
                Vui lòng chọn tình huống
              </p>
            ) : null}
            {error ? (
              <p className="shrink-0 px-5 pb-2 text-[13px] text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
              <ul className="divide-y divide-white/[0.06]">
                {listItems.map((item) => (
                  <li key={item.label}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.09]"
                      onClick={() => onPickItem(item)}
                    >
                      <span className="min-w-0 flex-1 text-[15px] leading-snug text-white">
                        {item.label}
                      </span>
                      <IoChevronForward
                        className="h-4 w-4 shrink-0 text-white/35"
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
