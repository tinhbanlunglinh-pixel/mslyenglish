// ============================================================
// 📚 Kho bài nói mẫu chuẩn — 5 bài / trình độ
// Bám khung Cambridge English Young Learners (Starters, Movers, Flyers)
// và CEFR (A1, A2, B1, B2): chủ đề lấy theo danh mục chủ đề của Cambridge
// YLE / A2 Key / B1 Preliminary; độ dài và ngữ pháp theo đúng quy định
// đang dùng khi AI soạn bài (geminiService.ts).
// Bài do Ms Lý English tự soạn (không chép đề thi có bản quyền).
// ============================================================
import type { VocabItem } from '../services/classroom';

export interface LibraryLesson {
  topic: string;
  level: string;
  readingText: string;
  translation: string;
  vocabulary: VocabItem[];
  /** Chủ đề theo khung chuẩn (hiển thị nhỏ) */
  theme?: string;
}

export const LEVEL_INFO: Record<string, { label: string; desc: string }> = {
  Starters: { label: 'Starters (Pre-A1)', desc: '15–25 từ · am/is/are, have got, can · câu đơn' },
  Movers: { label: 'Movers (A1)', desc: '25–45 từ · hiện tại tiếp diễn, giới từ vị trí, must' },
  Flyers: { label: 'Flyers (A2)', desc: '45–65 từ · quá khứ đơn, going to, so sánh hơn' },
  A1: { label: 'A1', desc: '40–60 từ · giới thiệu bản thân, đời sống hằng ngày' },
  A2: { label: 'A2 (Key)', desc: '60–80 từ · hiện tại hoàn thành, quá khứ tiếp diễn, who/which' },
  B1: { label: 'B1 (Preliminary)', desc: '100–150 từ · nêu ý kiến, kế hoạch, bị động, quá khứ hoàn thành' },
  B2: { label: 'B2 (First)', desc: '150–200 từ · câu điều kiện 1-2-3, lập luận hai mặt' },
};

const v = (word: string, ipa: string, meaning: string, emoji = ''): VocabItem => ({ word, ipa, meaning, emoji });

export const SAMPLE_LESSONS: Record<string, LibraryLesson> = {
  // ---------------- STARTERS (Pre-A1) ----------------
  's_starters_1': {
    level: 'Starters', topic: 'My Family', theme: 'Family & friends',
    readingText: 'This is my family. My dad is tall. My mum is kind. I have got a baby brother. I love my family.',
    translation: 'Đây là gia đình của tớ. Bố tớ cao. Mẹ tớ hiền. Tớ có một em trai nhỏ. Tớ yêu gia đình của tớ.',
    vocabulary: [v('family', '/ˈfæməli/', 'gia đình', '👨‍👩‍👦'), v('tall', '/tɔːl/', 'cao', '📏'), v('kind', '/kaɪnd/', 'tốt bụng, hiền', '💗'), v('brother', '/ˈbrʌðə/', 'anh/em trai', '👦')],
  },
  's_starters_2': {
    level: 'Starters', topic: 'My Pet Cat', theme: 'Animals',
    readingText: "I have got a cat. Her name is Kitty. She is small and white. She can jump. She can't swim. I love Kitty!",
    translation: 'Tớ có một con mèo. Tên nó là Kitty. Nó nhỏ và trắng. Nó biết nhảy. Nó không biết bơi. Tớ yêu Kitty!',
    vocabulary: [v('cat', '/kæt/', 'con mèo', '🐱'), v('small', '/smɔːl/', 'nhỏ', '🤏'), v('white', '/waɪt/', 'màu trắng', '⚪'), v('jump', '/dʒʌmp/', 'nhảy', '🦘'), v('swim', '/swɪm/', 'bơi', '🏊')],
  },
  's_starters_3': {
    level: 'Starters', topic: 'My School Bag', theme: 'School',
    readingText: 'Look at my school bag. It is blue. There is a book in my bag. There are two pencils. I have got a red ruler.',
    translation: 'Hãy nhìn cặp sách của tớ. Nó màu xanh dương. Có một quyển sách trong cặp. Có hai cái bút chì. Tớ có một cái thước kẻ màu đỏ.',
    vocabulary: [v('bag', '/bæɡ/', 'cái cặp', '🎒'), v('book', '/bʊk/', 'quyển sách', '📘'), v('pencil', '/ˈpensəl/', 'bút chì', '✏️'), v('ruler', '/ˈruːlə/', 'thước kẻ', '📏')],
  },
  's_starters_4': {
    level: 'Starters', topic: 'At the Zoo', theme: 'Animals',
    readingText: 'I can see a big elephant. It is grey. Look at the monkey! It can climb trees. The lion is yellow. It is very big.',
    translation: 'Tớ nhìn thấy một con voi to. Nó màu xám. Nhìn con khỉ kìa! Nó biết trèo cây. Con sư tử màu vàng. Nó rất to.',
    vocabulary: [v('elephant', '/ˈelɪfənt/', 'con voi', '🐘'), v('grey', '/ɡreɪ/', 'màu xám', '🩶'), v('monkey', '/ˈmʌŋki/', 'con khỉ', '🐒'), v('climb', '/klaɪm/', 'trèo', '🧗'), v('lion', '/ˈlaɪən/', 'sư tử', '🦁')],
  },
  's_starters_5': {
    level: 'Starters', topic: 'Food I Like', theme: 'Food & drink',
    readingText: "I like apples. They are red. I like milk too. I don't like fish. My favourite food is chicken. Yum!",
    translation: 'Tớ thích táo. Chúng màu đỏ. Tớ cũng thích sữa. Tớ không thích cá. Món ăn yêu thích của tớ là thịt gà. Ngon quá!',
    vocabulary: [v('apple', '/ˈæpəl/', 'quả táo', '🍎'), v('milk', '/mɪlk/', 'sữa', '🥛'), v('fish', '/fɪʃ/', 'cá', '🐟'), v('chicken', '/ˈtʃɪkɪn/', 'thịt gà', '🍗'), v('favourite', '/ˈfeɪvərɪt/', 'yêu thích', '⭐')],
  },

  // ---------------- MOVERS (A1) ----------------
  's_movers_1': {
    level: 'Movers', topic: 'In My Bedroom', theme: 'The home',
    readingText: 'This is my bedroom. My bed is next to the window. There is a lamp on the table. My teddy bear is under the bed. Right now, my sister is reading a comic in my room.',
    translation: 'Đây là phòng ngủ của tớ. Giường của tớ ở cạnh cửa sổ. Có một cái đèn ở trên bàn. Gấu bông của tớ ở dưới gầm giường. Ngay lúc này, chị tớ đang đọc truyện tranh trong phòng tớ.',
    vocabulary: [v('bedroom', '/ˈbedruːm/', 'phòng ngủ', '🛏️'), v('next to', '/nekst tuː/', 'bên cạnh', '↔️'), v('lamp', '/læmp/', 'đèn bàn', '💡'), v('under', '/ˈʌndə/', 'ở dưới', '⬇️'), v('comic', '/ˈkɒmɪk/', 'truyện tranh', '📖')],
  },
  's_movers_2': {
    level: 'Movers', topic: 'A Windy Day', theme: 'Weather',
    readingText: "Today it is windy and cloudy. The sun isn't shining. My friends and I are flying kites in the park. I am wearing a jacket because it is cold. I like windy days!",
    translation: 'Hôm nay trời có gió và nhiều mây. Mặt trời không chiếu sáng. Tớ và các bạn đang thả diều trong công viên. Tớ đang mặc áo khoác vì trời lạnh. Tớ thích những ngày có gió!',
    vocabulary: [v('windy', '/ˈwɪndi/', 'có gió', '🌬️'), v('cloudy', '/ˈklaʊdi/', 'nhiều mây', '☁️'), v('kite', '/kaɪt/', 'con diều', '🪁'), v('jacket', '/ˈdʒækɪt/', 'áo khoác', '🧥'), v('cold', '/kəʊld/', 'lạnh', '🥶')],
  },
  's_movers_3': {
    level: 'Movers', topic: 'My Daily Routine', theme: 'Daily life & time',
    readingText: "I get up at six o'clock every morning. I brush my teeth and have breakfast. I go to school by bus. After school, I do my homework. I go to bed at nine o'clock.",
    translation: 'Tớ thức dậy lúc 6 giờ mỗi sáng. Tớ đánh răng và ăn sáng. Tớ đi học bằng xe buýt. Sau giờ học, tớ làm bài tập về nhà. Tớ đi ngủ lúc 9 giờ.',
    vocabulary: [v('get up', '/ɡet ʌp/', 'thức dậy', '⏰'), v('brush my teeth', '/brʌʃ maɪ tiːθ/', 'đánh răng', '🪥'), v('breakfast', '/ˈbrekfəst/', 'bữa sáng', '🍳'), v('homework', '/ˈhəʊmwɜːk/', 'bài tập về nhà', '📝')],
  },
  's_movers_4': {
    level: 'Movers', topic: 'Sunday at the Park', theme: 'Sports & leisure',
    readingText: 'It is Sunday. We are at the park. My dad is riding a bike. My mum is sitting under a tree. My brother is playing football. I am eating an ice cream. We are happy!',
    translation: 'Hôm nay là Chủ nhật. Chúng tớ đang ở công viên. Bố tớ đang đạp xe. Mẹ tớ đang ngồi dưới gốc cây. Em trai tớ đang chơi bóng đá. Tớ đang ăn kem. Chúng tớ rất vui!',
    vocabulary: [v('park', '/pɑːk/', 'công viên', '🌳'), v('ride a bike', '/raɪd ə baɪk/', 'đạp xe', '🚲'), v('sit', '/sɪt/', 'ngồi', '🪑'), v('football', '/ˈfʊtbɔːl/', 'bóng đá', '⚽'), v('ice cream', '/ˌaɪs ˈkriːm/', 'kem', '🍦')],
  },
  's_movers_5': {
    level: 'Movers', topic: 'My Best Friend', theme: 'Family & friends',
    readingText: 'My best friend is Anna. She is nine years old. She has got long, black hair and brown eyes. She is very funny. We sit next to each other at school. We must not talk in class!',
    translation: 'Bạn thân nhất của tớ là Anna. Bạn ấy 9 tuổi. Bạn ấy có mái tóc dài màu đen và đôi mắt nâu. Bạn ấy rất vui tính. Chúng tớ ngồi cạnh nhau ở trường. Chúng tớ không được nói chuyện trong giờ học!',
    vocabulary: [v('best friend', '/best frend/', 'bạn thân nhất', '🤝'), v('hair', '/heə/', 'tóc', '💇'), v('eyes', '/aɪz/', 'đôi mắt', '👀'), v('funny', '/ˈfʌni/', 'vui tính, hài hước', '😄'), v('must not', '/mʌst nɒt/', 'không được', '🚫')],
  },

  // ---------------- FLYERS (A2) ----------------
  's_flyers_1': {
    level: 'Flyers', topic: 'My Summer Holiday', theme: 'Holidays & travel',
    readingText: 'Last summer, my family went to Nha Trang. We stayed in a hotel near the beach. Every morning, I swam in the sea and built sandcastles with my brother. The weather was hotter than in Hanoi, but I loved it. Next summer, we are going to visit Da Lat because it is cooler there.',
    translation: 'Hè năm ngoái, gia đình tớ đi Nha Trang. Chúng tớ ở một khách sạn gần bãi biển. Mỗi sáng, tớ bơi ở biển và xây lâu đài cát với em trai. Thời tiết nóng hơn ở Hà Nội nhưng tớ rất thích. Hè năm sau, gia đình tớ sẽ đi Đà Lạt vì ở đó mát hơn.',
    vocabulary: [v('hotel', '/həʊˈtel/', 'khách sạn', '🏨'), v('beach', '/biːtʃ/', 'bãi biển', '🏖️'), v('swam', '/swæm/', 'đã bơi (quá khứ của swim)', '🏊'), v('sandcastle', '/ˈsændkɑːsəl/', 'lâu đài cát', '🏰'), v('cooler', '/ˈkuːlə/', 'mát hơn', '🌲')],
  },
  's_flyers_2': {
    level: 'Flyers', topic: 'A Visit to the Doctor', theme: 'Health',
    readingText: "Yesterday, I had a terrible headache and a high temperature. My mum took me to the doctor. The doctor looked at my throat and said, \"You have got a cold. You must stay in bed and drink lots of water.\" I slept all afternoon. Today, I feel much better than yesterday.",
    translation: 'Hôm qua, tớ bị đau đầu kinh khủng và sốt cao. Mẹ đưa tớ đi khám bác sĩ. Bác sĩ khám họng cho tớ và nói: "Cháu bị cảm rồi. Cháu phải nằm nghỉ trên giường và uống thật nhiều nước." Tớ ngủ cả buổi chiều. Hôm nay, tớ thấy khoẻ hơn hôm qua nhiều.',
    vocabulary: [v('headache', '/ˈhedeɪk/', 'đau đầu', '🤕'), v('temperature', '/ˈtemprətʃə/', 'nhiệt độ, cơn sốt', '🌡️'), v('throat', '/θrəʊt/', 'cổ họng', '🗣️'), v('cold', '/kəʊld/', 'bệnh cảm lạnh', '🤧'), v('better', '/ˈbetə/', 'tốt hơn, khoẻ hơn', '💪')],
  },
  's_flyers_3': {
    level: 'Flyers', topic: 'When I Grow Up', theme: 'Work & jobs',
    readingText: "When I grow up, I am going to be a pilot. I want to fly planes to different countries. Last month, I visited the airport with my uncle. He is a mechanic there. The planes were bigger than I thought! A pilot's job is difficult, but it is exciting too.",
    translation: 'Khi lớn lên, tớ sẽ trở thành phi công. Tớ muốn lái máy bay đến nhiều nước khác nhau. Tháng trước, tớ đã đến thăm sân bay cùng chú tớ. Chú là thợ máy ở đó. Những chiếc máy bay to hơn tớ tưởng! Nghề phi công khó nhưng cũng rất thú vị.',
    vocabulary: [v('grow up', '/ɡrəʊ ʌp/', 'lớn lên', '🌱'), v('pilot', '/ˈpaɪlət/', 'phi công', '👨‍✈️'), v('airport', '/ˈeəpɔːt/', 'sân bay', '🛫'), v('mechanic', '/məˈkænɪk/', 'thợ máy', '🔧'), v('exciting', '/ɪkˈsaɪtɪŋ/', 'thú vị, hào hứng', '🤩')],
  },
  's_flyers_4': {
    level: 'Flyers', topic: 'Our School Trip', theme: 'School & places',
    readingText: 'Last Friday, our class went on a trip to the museum. We travelled by coach. We saw old coins, dinosaur bones and a very old boat. My favourite thing was the dinosaur because it was taller than our classroom! After lunch, we bought postcards. It was the best day of the term.',
    translation: 'Thứ Sáu tuần trước, lớp tớ đi tham quan bảo tàng. Chúng tớ đi bằng xe khách. Chúng tớ được xem những đồng xu cổ, xương khủng long và một chiếc thuyền rất cổ. Thứ tớ thích nhất là con khủng long vì nó cao hơn cả lớp học của tớ! Sau bữa trưa, chúng tớ mua bưu thiếp. Đó là ngày tuyệt nhất trong học kỳ.',
    vocabulary: [v('museum', '/mjuːˈziːəm/', 'bảo tàng', '🏛️'), v('coach', '/kəʊtʃ/', 'xe khách', '🚌'), v('dinosaur', '/ˈdaɪnəsɔː/', 'khủng long', '🦖'), v('postcard', '/ˈpəʊstkɑːd/', 'bưu thiếp', '💌'), v('term', '/tɜːm/', 'học kỳ', '📅')],
  },
  's_flyers_5': {
    level: 'Flyers', topic: 'Help Our Planet', theme: 'The world around us',
    readingText: 'Our planet needs help. Yesterday, my class picked up rubbish in the park. We found plastic bottles, paper and old bags. Plastic is more dangerous for animals than paper. From now on, I am going to use a metal bottle and turn off the lights when I leave a room.',
    translation: 'Hành tinh của chúng ta cần được giúp đỡ. Hôm qua, lớp tớ nhặt rác ở công viên. Chúng tớ tìm thấy chai nhựa, giấy và túi cũ. Nhựa nguy hiểm cho động vật hơn giấy. Từ bây giờ, tớ sẽ dùng bình nước bằng kim loại và tắt đèn khi ra khỏi phòng.',
    vocabulary: [v('planet', '/ˈplænɪt/', 'hành tinh', '🌍'), v('rubbish', '/ˈrʌbɪʃ/', 'rác', '🗑️'), v('plastic', '/ˈplæstɪk/', 'nhựa', '🧴'), v('dangerous', '/ˈdeɪndʒərəs/', 'nguy hiểm', '⚠️'), v('turn off', '/tɜːn ɒf/', 'tắt', '💡')],
  },

  // ---------------- A1 ----------------
  's_a1_1': {
    level: 'A1', topic: 'Introducing Myself', theme: 'Personal information',
    readingText: 'Hello! My name is Minh. I am eleven years old and I live in Hanoi with my parents. I am in grade six at Le Loi School. My favourite subject is English because it is fun. In my free time, I play badminton with my friends. Next year, I will join the school English club.',
    translation: 'Xin chào! Tên tớ là Minh. Tớ 11 tuổi và sống ở Hà Nội cùng bố mẹ. Tớ học lớp 6 trường Lê Lợi. Môn học yêu thích của tớ là tiếng Anh vì nó vui. Lúc rảnh, tớ chơi cầu lông với các bạn. Năm sau, tớ sẽ tham gia câu lạc bộ tiếng Anh của trường.',
    vocabulary: [v('parents', '/ˈpeərənts/', 'bố mẹ', '👪'), v('subject', '/ˈsʌbdʒɪkt/', 'môn học', '📚'), v('free time', '/friː taɪm/', 'thời gian rảnh', '🕒'), v('badminton', '/ˈbædmɪntən/', 'cầu lông', '🏸'), v('join', '/dʒɔɪn/', 'tham gia', '🙋')],
  },
  's_a1_2': {
    level: 'A1', topic: 'My Hometown', theme: 'Places & town',
    readingText: 'I live in a small town near the sea. There is a big market, a hospital and two schools. People here are very friendly. Last weekend, I went to the market with my grandmother. We bought fresh fish and vegetables. I think my hometown is a great place to live.',
    translation: 'Tớ sống ở một thị trấn nhỏ gần biển. Ở đây có một khu chợ lớn, một bệnh viện và hai trường học. Người dân ở đây rất thân thiện. Cuối tuần trước, tớ đi chợ với bà. Chúng tớ mua cá tươi và rau. Tớ nghĩ quê tớ là một nơi tuyệt vời để sống.',
    vocabulary: [v('town', '/taʊn/', 'thị trấn', '🏘️'), v('market', '/ˈmɑːkɪt/', 'chợ', '🧺'), v('friendly', '/ˈfrendli/', 'thân thiện', '😊'), v('fresh', '/freʃ/', 'tươi', '🥬'), v('hometown', '/ˈhəʊmtaʊn/', 'quê hương', '🏡')],
  },
  's_a1_3': {
    level: 'A1', topic: 'Shopping for Shoes', theme: 'Shopping & clothes',
    readingText: 'On Saturday, I went shopping with my mum. I needed new shoes for school. The black shoes were nice, but they were too small. I tried a bigger size and it was perfect. They cost three hundred thousand dong. Tomorrow, I will wear them to school.',
    translation: 'Thứ Bảy, tớ đi mua sắm cùng mẹ. Tớ cần giày mới để đi học. Đôi giày đen rất đẹp nhưng chúng quá nhỏ. Tớ thử cỡ lớn hơn và nó vừa khít. Đôi giày giá ba trăm nghìn đồng. Ngày mai, tớ sẽ đi đôi giày đó đến trường.',
    vocabulary: [v('go shopping', '/ɡəʊ ˈʃɒpɪŋ/', 'đi mua sắm', '🛍️'), v('shoes', '/ʃuːz/', 'đôi giày', '👟'), v('size', '/saɪz/', 'cỡ, kích thước', '📐'), v('perfect', '/ˈpɜːfɪkt/', 'hoàn hảo, vừa khít', '👌'), v('cost', '/kɒst/', 'có giá', '💵')],
  },
  's_a1_4': {
    level: 'A1', topic: 'My Weekend', theme: 'Daily life & free time',
    readingText: 'On weekends, I usually get up late. On Saturday morning, I help my mum clean the house. In the afternoon, I watch TV or read books. On Sunday, my family often visits my grandparents. We have a big lunch together. This weekend, we will go to the cinema.',
    translation: 'Vào cuối tuần, tớ thường dậy muộn. Sáng thứ Bảy, tớ giúp mẹ dọn nhà. Buổi chiều, tớ xem ti vi hoặc đọc sách. Chủ nhật, gia đình tớ thường về thăm ông bà. Cả nhà cùng ăn một bữa trưa thịnh soạn. Cuối tuần này, chúng tớ sẽ đi xem phim.',
    vocabulary: [v('usually', '/ˈjuːʒuəli/', 'thường thường', '🔁'), v('clean', '/kliːn/', 'dọn dẹp', '🧹'), v('grandparents', '/ˈɡrænpeərənts/', 'ông bà', '👵'), v('together', '/təˈɡeðə/', 'cùng nhau', '🤗'), v('cinema', '/ˈsɪnəmə/', 'rạp chiếu phim', '🎬')],
  },
  's_a1_5': {
    level: 'A1', topic: 'Healthy Habits', theme: 'Health & body',
    readingText: "I want to be healthy and strong. Every day, I eat fruit and vegetables and drink a lot of water. I don't eat much fast food. I go to bed early and sleep for nine hours. Yesterday, I walked to school with my friend. Tomorrow, I will play football in the park.",
    translation: 'Tớ muốn khoẻ mạnh và cường tráng. Mỗi ngày, tớ ăn trái cây, rau và uống nhiều nước. Tớ không ăn nhiều đồ ăn nhanh. Tớ đi ngủ sớm và ngủ đủ chín tiếng. Hôm qua, tớ đi bộ đến trường cùng bạn. Ngày mai, tớ sẽ chơi bóng đá ở công viên.',
    vocabulary: [v('healthy', '/ˈhelθi/', 'khoẻ mạnh', '💚'), v('strong', '/strɒŋ/', 'khoẻ, mạnh mẽ', '💪'), v('vegetables', '/ˈvedʒtəbəlz/', 'rau củ', '🥦'), v('fast food', '/ˌfɑːst ˈfuːd/', 'đồ ăn nhanh', '🍔'), v('early', '/ˈɜːli/', 'sớm', '🌅')],
  },

  // ---------------- A2 (Key) ----------------
  's_a2_1': {
    level: 'A2', topic: 'A Trip to Ha Long Bay', theme: 'Travel & holidays',
    readingText: 'Have you ever been to Ha Long Bay? I went there with my family last year, and it was the best trip I have ever had. While we were sailing on a boat, the sun was going down and the sky turned orange. We also visited a cave which had amazing rocks inside. I took a lot of photos. If you have time, you should go there in summer when the sea is calm.',
    translation: 'Bạn đã bao giờ đến vịnh Hạ Long chưa? Năm ngoái tớ đến đó cùng gia đình và đó là chuyến đi tuyệt nhất tớ từng có. Khi chúng tớ đang đi thuyền thì mặt trời lặn dần và bầu trời chuyển sang màu cam. Chúng tớ còn tham quan một hang động có những khối đá tuyệt đẹp bên trong. Tớ chụp rất nhiều ảnh. Nếu có thời gian, bạn nên đến đó vào mùa hè khi biển êm.',
    vocabulary: [v('have you ever', '/hæv juː ˈevə/', 'bạn đã từng … chưa', '❓'), v('sail', '/seɪl/', 'đi thuyền', '⛵'), v('cave', '/keɪv/', 'hang động', '🕳️'), v('amazing', '/əˈmeɪzɪŋ/', 'tuyệt vời, kinh ngạc', '🤩'), v('calm', '/kɑːm/', 'êm, lặng', '🌊')],
  },
  's_a2_2': {
    level: 'A2', topic: 'My Favourite Hobby', theme: 'Hobbies & leisure',
    readingText: 'My favourite hobby is drawing. I have loved it since I was six years old. I usually draw animals and people who I see in the park. Last month, I entered a drawing competition at school and won second prize. My teacher, who is a real artist, said my pictures were creative. In the future, I could become a designer. I think everyone should have a hobby that makes them happy.',
    translation: 'Sở thích yêu thích nhất của tớ là vẽ. Tớ yêu vẽ từ khi lên sáu tuổi. Tớ thường vẽ động vật và những người tớ gặp ở công viên. Tháng trước, tớ tham gia cuộc thi vẽ ở trường và đạt giải nhì. Cô giáo tớ, một hoạ sĩ thực thụ, nói tranh của tớ rất sáng tạo. Sau này, tớ có thể trở thành nhà thiết kế. Tớ nghĩ ai cũng nên có một sở thích khiến mình vui.',
    vocabulary: [v('hobby', '/ˈhɒbi/', 'sở thích', '🎨'), v('competition', '/ˌkɒmpəˈtɪʃən/', 'cuộc thi', '🏆'), v('prize', '/praɪz/', 'giải thưởng', '🥈'), v('creative', '/kriˈeɪtɪv/', 'sáng tạo', '💡'), v('designer', '/dɪˈzaɪnə/', 'nhà thiết kế', '✏️')],
  },
  's_a2_3': {
    level: 'A2', topic: 'Screens and Me', theme: 'Technology',
    readingText: "I use my tablet every day. I have learned many English words with it, and I often watch videos that teach science. However, my parents say I should not use it for too long. Last night, I was playing a game when my mum called me for dinner. I didn't hear her! Now I have a rule: no screens after eight o'clock. I could read a book or talk with my family instead.",
    translation: 'Tớ dùng máy tính bảng mỗi ngày. Tớ đã học được nhiều từ tiếng Anh nhờ nó và tớ hay xem những video dạy khoa học. Tuy nhiên, bố mẹ bảo tớ không nên dùng quá lâu. Tối qua, tớ đang chơi điện tử thì mẹ gọi ăn cơm. Tớ không nghe thấy mẹ! Giờ tớ có một quy tắc: không dùng màn hình sau 8 giờ tối. Thay vào đó, tớ có thể đọc sách hoặc trò chuyện với gia đình.',
    vocabulary: [v('tablet', '/ˈtæblət/', 'máy tính bảng', '📱'), v('however', '/haʊˈevə/', 'tuy nhiên', '↩️'), v('should not', '/ʃʊd nɒt/', 'không nên', '🙅'), v('rule', '/ruːl/', 'quy tắc', '📏'), v('instead', '/ɪnˈsted/', 'thay vào đó', '🔄')],
  },
  's_a2_4': {
    level: 'A2', topic: 'A Person I Admire', theme: 'People & family',
    readingText: 'The person who I admire most is my grandmother. She has worked as a teacher for thirty years. When I was little, she was always telling me stories while I was falling asleep. She is patient and kind, and she has taught me to love books. Every Sunday, we cook together. She says I should always be honest and work hard. I hope I can be like her one day.',
    translation: 'Người tớ ngưỡng mộ nhất là bà tớ. Bà đã làm giáo viên ba mươi năm. Hồi tớ còn nhỏ, bà luôn kể chuyện cho tớ nghe khi tớ đang chìm vào giấc ngủ. Bà kiên nhẫn, hiền hậu và bà đã dạy tớ biết yêu sách. Chủ nhật nào hai bà cháu cũng nấu ăn cùng nhau. Bà bảo tớ nên luôn trung thực và chăm chỉ. Tớ mong một ngày nào đó tớ sẽ được như bà.',
    vocabulary: [v('admire', '/ədˈmaɪə/', 'ngưỡng mộ', '🌟'), v('fall asleep', '/fɔːl əˈsliːp/', 'chìm vào giấc ngủ', '😴'), v('patient', '/ˈpeɪʃənt/', 'kiên nhẫn', '🧘'), v('honest', '/ˈɒnɪst/', 'trung thực', '🤞'), v('work hard', '/wɜːk hɑːd/', 'chăm chỉ', '💼')],
  },
  's_a2_5': {
    level: 'A2', topic: 'Tet Holiday', theme: 'Festivals & culture',
    readingText: "Tet is the most important festival in Viet Nam. Before Tet, my family cleans the house and buys flowers which are called peach blossoms. On New Year's Eve, we were watching fireworks when it started to rain, but it was still fun! Children receive lucky money in red envelopes. I have saved my lucky money for two years because I want to buy a bicycle. You should visit Viet Nam during Tet.",
    translation: 'Tết là lễ hội quan trọng nhất ở Việt Nam. Trước Tết, gia đình tớ dọn nhà và mua hoa đào. Đêm giao thừa, cả nhà đang xem pháo hoa thì trời đổ mưa, nhưng vẫn rất vui! Trẻ em được nhận tiền lì xì trong phong bao đỏ. Tớ đã để dành tiền lì xì suốt hai năm vì tớ muốn mua một chiếc xe đạp. Bạn nên đến Việt Nam vào dịp Tết.',
    vocabulary: [v('festival', '/ˈfestɪvəl/', 'lễ hội', '🎉'), v('peach blossom', '/piːtʃ ˈblɒsəm/', 'hoa đào', '🌸'), v("New Year's Eve", '/ˌnjuː jɪəz ˈiːv/', 'đêm giao thừa', '🎆'), v('lucky money', '/ˈlʌki ˈmʌni/', 'tiền lì xì', '🧧'), v('save', '/seɪv/', 'để dành, tiết kiệm', '🐷')],
  },

  // ---------------- B1 (Preliminary) ----------------
  's_b1_1': {
    level: 'B1', topic: 'Learning English Online', theme: 'Education',
    readingText: 'These days, many students learn English online, and I am one of them. Before I started, I had thought that online lessons would be boring. However, I was wrong. My lessons are taught by a teacher who uses games, songs and short videos, so the time passes very quickly. In my opinion, the biggest advantage is that I can practise speaking at home whenever I want. I record my voice, listen to it and try to correct my mistakes. On the other hand, it is sometimes difficult to concentrate because my phone is next to me. That is why I always turn off notifications before class. Next year, I am planning to take the Cambridge B1 Preliminary exam, and I believe online practice will help me pass it.',
    translation: 'Ngày nay, nhiều học sinh học tiếng Anh trực tuyến và tớ là một trong số đó. Trước khi bắt đầu, tớ đã nghĩ học trực tuyến sẽ rất chán. Nhưng tớ đã nhầm. Các buổi học của tớ do một cô giáo dạy, cô dùng trò chơi, bài hát và video ngắn nên thời gian trôi rất nhanh. Theo tớ, lợi ích lớn nhất là tớ có thể luyện nói ở nhà bất cứ khi nào tớ muốn. Tớ ghi âm giọng mình, nghe lại và cố sửa lỗi. Mặt khác, đôi khi rất khó tập trung vì điện thoại để ngay bên cạnh. Vì vậy tớ luôn tắt thông báo trước giờ học. Năm sau, tớ dự định thi Cambridge B1 Preliminary và tớ tin việc luyện tập trực tuyến sẽ giúp tớ thi đỗ.',
    vocabulary: [v('advantage', '/ədˈvɑːntɪdʒ/', 'lợi ích, ưu điểm', '➕'), v('practise', '/ˈpræktɪs/', 'luyện tập', '🔁'), v('concentrate', '/ˈkɒnsəntreɪt/', 'tập trung', '🎯'), v('notification', '/ˌnəʊtɪfɪˈkeɪʃən/', 'thông báo', '🔔'), v('on the other hand', '/ɒn ði ˈʌðə hænd/', 'mặt khác', '⚖️')],
  },
  's_b1_2': {
    level: 'B1', topic: 'Describing a Photo: A Picnic', theme: 'Describing pictures (Speaking Part 2)',
    readingText: 'In this photo, I can see a family having a picnic in a park. It looks like a warm, sunny day because everyone is wearing light clothes. On the left, there is a man who is probably the father. He is cutting some fruit, while a little girl is watching him. On the right, a woman is pouring drinks into plastic cups. In the background, there are some tall trees and a small lake. I think they have just arrived, because the food has not been eaten yet. They seem relaxed and happy. Personally, I love picnics like this, as they are a great way to spend time with people you love.',
    translation: 'Trong bức ảnh này, tớ thấy một gia đình đang đi dã ngoại trong công viên. Có vẻ là một ngày nắng ấm vì mọi người đều mặc quần áo mỏng. Bên trái có một người đàn ông, có lẽ là người bố. Ông đang cắt hoa quả, còn một bé gái đang đứng nhìn. Bên phải, một người phụ nữ đang rót đồ uống vào cốc nhựa. Phía sau có vài cây cao và một hồ nước nhỏ. Tớ nghĩ họ vừa mới đến vì đồ ăn vẫn chưa ai động tới. Trông họ thoải mái và vui vẻ. Riêng tớ, tớ rất thích những buổi dã ngoại như thế này vì đó là cách tuyệt vời để ở bên những người mình yêu thương.',
    vocabulary: [v('picnic', '/ˈpɪknɪk/', 'buổi dã ngoại', '🧺'), v('probably', '/ˈprɒbəbli/', 'có lẽ', '🤔'), v('pour', '/pɔː/', 'rót', '🫗'), v('in the background', '/ɪn ðə ˈbækɡraʊnd/', 'ở phía sau (hậu cảnh)', '🖼️'), v('relaxed', '/rɪˈlækst/', 'thư giãn, thoải mái', '😌')],
  },
  's_b1_3': {
    level: 'B1', topic: 'My Plans for the Future', theme: 'Work & future plans',
    readingText: 'After I finish secondary school, I hope to study at a high school which is famous for science. My dream is to become a doctor, because I want to help people who are sick. My aunt, who works at a hospital in Hue, has told me that the job is stressful, but it is also very rewarding. To prepare, I have been studying biology and English more seriously this year. I am also going to volunteer at a local health centre next summer, where I will help the nurses with simple tasks. Of course, I know my plans might change. But whatever I decide to do, I will try my best and never give up.',
    translation: 'Sau khi học xong THCS, tớ mong được học ở một trường THPT nổi tiếng về các môn khoa học. Ước mơ của tớ là trở thành bác sĩ vì tớ muốn giúp đỡ người bệnh. Dì tớ, người làm việc ở một bệnh viện tại Huế, kể rằng công việc này nhiều áp lực nhưng cũng rất ý nghĩa. Để chuẩn bị, năm nay tớ học Sinh học và tiếng Anh nghiêm túc hơn. Hè tới, tớ cũng sẽ làm tình nguyện ở trạm y tế địa phương, nơi tớ sẽ giúp các cô y tá những việc đơn giản. Tất nhiên, tớ biết kế hoạch có thể thay đổi. Nhưng dù quyết định làm gì, tớ cũng sẽ cố gắng hết sức và không bao giờ bỏ cuộc.',
    vocabulary: [v('secondary school', '/ˈsekəndri skuːl/', 'trường THCS', '🏫'), v('stressful', '/ˈstresfəl/', 'căng thẳng, áp lực', '😓'), v('rewarding', '/rɪˈwɔːdɪŋ/', 'xứng đáng, ý nghĩa', '🎁'), v('volunteer', '/ˌvɒlənˈtɪə/', 'làm tình nguyện', '🙌'), v('give up', '/ɡɪv ʌp/', 'bỏ cuộc', '🏳️')],
  },
  's_b1_4': {
    level: 'B1', topic: 'Traffic in My City', theme: 'Town & environment',
    readingText: 'I live in Ho Chi Minh City, which is one of the busiest cities in Viet Nam. One problem that worries me is traffic. Every morning, the roads are crowded with motorbikes, and the air is polluted by smoke. Last week, I was late for school because a road had been closed for repairs. In my opinion, the city should build more bus lanes and metro lines. People could also be encouraged to cycle or walk for short trips. Recently, the first metro line was opened, and many of my friends have already tried it. I believe that if everyone makes small changes, our city will become cleaner and safer.',
    translation: 'Tớ sống ở Thành phố Hồ Chí Minh, một trong những thành phố đông đúc nhất Việt Nam. Một vấn đề khiến tớ lo lắng là giao thông. Sáng nào đường phố cũng chật kín xe máy và không khí bị ô nhiễm bởi khói xe. Tuần trước, tớ bị muộn học vì một con đường đã bị chặn để sửa chữa. Theo tớ, thành phố nên xây thêm làn đường dành cho xe buýt và các tuyến tàu điện. Người dân cũng có thể được khuyến khích đạp xe hoặc đi bộ cho những quãng đường ngắn. Gần đây, tuyến metro đầu tiên đã được đưa vào hoạt động và nhiều bạn của tớ đã đi thử. Tớ tin rằng nếu mỗi người thay đổi một chút, thành phố của chúng ta sẽ sạch hơn và an toàn hơn.',
    vocabulary: [v('crowded', '/ˈkraʊdɪd/', 'đông đúc', '🚦'), v('polluted', '/pəˈluːtɪd/', 'bị ô nhiễm', '🏭'), v('repair', '/rɪˈpeə/', 'sửa chữa', '🚧'), v('encourage', '/ɪnˈkʌrɪdʒ/', 'khuyến khích', '👏'), v('metro line', '/ˈmetrəʊ laɪn/', 'tuyến tàu điện', '🚇')],
  },
  's_b1_5': {
    level: 'B1', topic: 'The Best Book I Have Read', theme: 'Books & entertainment',
    readingText: "The best book I have ever read is 'Diary of a Cricket' by To Hoai. It was written in 1941, and it is still loved by Vietnamese children today. The story is about a young cricket who leaves home to explore the world. At first, he is proud and careless, and one of his mistakes causes the death of a friend. After that, he realises he had been wrong and decides to change. What I like most is that the cricket learns from his experiences and becomes a kind leader. The book taught me that we should be humble and help others. I would recommend it to anyone who enjoys adventure stories.",
    translation: 'Cuốn sách hay nhất tớ từng đọc là "Dế Mèn phiêu lưu ký" của nhà văn Tô Hoài. Sách được viết năm 1941 và đến nay vẫn được trẻ em Việt Nam yêu thích. Câu chuyện kể về chú dế trẻ rời nhà đi khám phá thế giới. Lúc đầu, Dế Mèn kiêu căng và cẩu thả, và một lỗi lầm của cậu đã gây ra cái chết của một người bạn. Sau đó, cậu nhận ra mình đã sai và quyết tâm thay đổi. Điều tớ thích nhất là Dế Mèn học hỏi từ những trải nghiệm và trở thành một người thủ lĩnh tốt bụng. Cuốn sách dạy tớ rằng chúng ta nên khiêm tốn và giúp đỡ người khác. Tớ muốn giới thiệu cuốn sách này cho bất kỳ ai thích truyện phiêu lưu.',
    vocabulary: [v('cricket', '/ˈkrɪkɪt/', 'con dế', '🦗'), v('explore', '/ɪkˈsplɔː/', 'khám phá', '🧭'), v('careless', '/ˈkeələs/', 'cẩu thả, bất cẩn', '🙈'), v('humble', '/ˈhʌmbəl/', 'khiêm tốn', '🙇'), v('recommend', '/ˌrekəˈmend/', 'giới thiệu, đề xuất', '👍')],
  },

  // ---------------- B2 (First) ----------------
  's_b2_1': {
    level: 'B2', topic: 'Social Media and Teenagers', theme: 'Opinion: technology & society',
    readingText: "Social media has become an essential part of teenagers' lives, but its effects are often debated. On the positive side, platforms such as YouTube allow young people to learn new skills, from cooking to coding, and to stay connected with friends who live far away. If it is used wisely, social media can even help students find study groups and share useful resources.\n\nHowever, there are also serious drawbacks. Many teenagers spend several hours a day scrolling, which can lead to poor sleep and lower concentration at school. What is more, posts are often edited to look perfect, so users may start comparing themselves with others and feel unhappy about their own lives. Had I known this earlier, I would have spent less time online when I was younger.\n\nIn my view, the solution is not to ban social media, but to teach young people how to use it responsibly. Schools could run workshops on digital safety, and parents should set clear limits at home. If we all took these steps, social media would be a tool that helps us rather than harms us.",
    translation: 'Mạng xã hội đã trở thành một phần thiết yếu trong cuộc sống của thanh thiếu niên, nhưng tác động của nó thường gây tranh cãi. Về mặt tích cực, các nền tảng như YouTube giúp người trẻ học kỹ năng mới, từ nấu ăn đến lập trình, và giữ liên lạc với bạn bè ở xa. Nếu được dùng một cách khôn ngoan, mạng xã hội thậm chí có thể giúp học sinh tìm nhóm học và chia sẻ tài liệu hữu ích.\n\nTuy nhiên, nó cũng có những mặt trái nghiêm trọng. Nhiều bạn trẻ dành vài tiếng mỗi ngày để lướt mạng, dẫn đến ngủ kém và giảm khả năng tập trung ở trường. Hơn nữa, các bài đăng thường được chỉnh sửa để trông hoàn hảo, nên người dùng có thể bắt đầu so sánh bản thân với người khác và cảm thấy không hài lòng với cuộc sống của mình. Giá như tớ biết điều này sớm hơn, tớ đã dành ít thời gian lên mạng hơn khi còn nhỏ.\n\nTheo tớ, giải pháp không phải là cấm mạng xã hội mà là dạy người trẻ cách sử dụng có trách nhiệm. Nhà trường có thể tổ chức các buổi tập huấn về an toàn số, còn cha mẹ nên đặt ra giới hạn rõ ràng ở nhà. Nếu tất cả chúng ta cùng làm những bước này, mạng xã hội sẽ là công cụ giúp ích thay vì gây hại cho chúng ta.',
    vocabulary: [v('essential', '/ɪˈsenʃəl/', 'thiết yếu', '🔑'), v('drawback', '/ˈdrɔːbæk/', 'mặt trái, nhược điểm', '➖'), v('scroll', '/skrəʊl/', 'lướt (màn hình)', '📲'), v('responsibly', '/rɪˈspɒnsəbli/', 'một cách có trách nhiệm', '✅'), v('rather than', '/ˈrɑːðə ðæn/', 'thay vì', '🔀')],
  },
  's_b2_2': {
    level: 'B2', topic: 'City or Countryside?', theme: 'Opinion: places to live',
    readingText: "Many people wonder whether it is better to live in a big city or in the countryside. Both options have clear advantages, and the right choice usually depends on a person's priorities.\n\nCities offer a wide range of opportunities. Jobs are easier to find, public services are well developed, and there is always something to do, whether it is visiting a museum or trying a new restaurant. If I lived in the countryside, I would probably miss this variety. On the other hand, city life can be stressful. Traffic jams, noise and air pollution are problems that have been getting worse for years.\n\nThe countryside, by contrast, is peaceful and close to nature. Housing is cheaper, the air is cleaner, and neighbours tend to know and support each other. The main disadvantage is that good schools and hospitals may be far away.\n\nPersonally, I would choose to grow up in the countryside but study and work in a city. If I had the chance, I would eventually move back to a quiet village, where life moves at a slower pace.",
    translation: 'Nhiều người băn khoăn không biết sống ở thành phố lớn hay ở nông thôn thì tốt hơn. Cả hai lựa chọn đều có ưu điểm rõ ràng và lựa chọn đúng thường phụ thuộc vào điều mỗi người coi trọng.\n\nThành phố mang lại rất nhiều cơ hội. Việc làm dễ tìm hơn, dịch vụ công phát triển và lúc nào cũng có việc để làm, dù là đi thăm bảo tàng hay thử một nhà hàng mới. Nếu sống ở nông thôn, có lẽ tớ sẽ nhớ sự đa dạng này. Mặt khác, cuộc sống thành phố có thể rất áp lực. Tắc đường, tiếng ồn và ô nhiễm không khí là những vấn đề ngày càng tệ hơn trong nhiều năm qua.\n\nNgược lại, nông thôn yên bình và gần gũi với thiên nhiên. Nhà ở rẻ hơn, không khí trong lành hơn và hàng xóm thường quen biết, giúp đỡ nhau. Nhược điểm chính là trường học và bệnh viện tốt có thể ở xa.\n\nRiêng tớ, tớ sẽ chọn lớn lên ở nông thôn nhưng học tập và làm việc ở thành phố. Nếu có cơ hội, cuối cùng tớ sẽ chuyển về một ngôi làng yên tĩnh, nơi nhịp sống chậm rãi hơn.',
    vocabulary: [v('priority', '/praɪˈɒrəti/', 'điều ưu tiên', '🥇'), v('opportunity', '/ˌɒpəˈtjuːnəti/', 'cơ hội', '🚪'), v('variety', '/vəˈraɪəti/', 'sự đa dạng', '🌈'), v('by contrast', '/baɪ ˈkɒntrɑːst/', 'ngược lại', '↔️'), v('pace', '/peɪs/', 'nhịp độ', '🐢')],
  },
  's_b2_3': {
    level: 'B2', topic: 'A Challenge I Overcame', theme: 'Personal experience',
    readingText: "One of the biggest challenges I have ever faced was speaking English in public. Two years ago, I was chosen to give a short presentation at a school event, and I was terrified. Although I had learned English for several years, I had rarely spoken it in front of other people.\n\nAt first, I considered refusing the offer. However, my teacher encouraged me, saying that if I never tried, I would never improve. So I decided to accept the challenge. For three weeks, I practised every evening. I recorded myself, listened carefully to my pronunciation and asked my older cousin to give me feedback.\n\nOn the day of the event, my hands were shaking as I walked onto the stage. But once I had started speaking, I felt more confident. When I finished, the audience applauded, and I felt incredibly proud.\n\nLooking back, I realise that if I had refused, I would have missed a valuable lesson. Fear is natural, but it should not stop us from growing.",
    translation: 'Một trong những thử thách lớn nhất tớ từng đối mặt là nói tiếng Anh trước đám đông. Hai năm trước, tớ được chọn thuyết trình ngắn trong một sự kiện của trường và tớ đã vô cùng sợ hãi. Dù đã học tiếng Anh vài năm, tớ hiếm khi nói trước mặt người khác.\n\nLúc đầu, tớ đã tính từ chối. Nhưng cô giáo động viên tớ, cô nói nếu không bao giờ thử thì tớ sẽ không bao giờ tiến bộ. Thế là tớ quyết định nhận thử thách. Suốt ba tuần, tối nào tớ cũng luyện tập. Tớ tự ghi âm, nghe kỹ phát âm của mình và nhờ anh họ góp ý.\n\nĐến ngày diễn ra sự kiện, tay tớ run lẩy bẩy khi bước lên sân khấu. Nhưng khi đã bắt đầu nói, tớ thấy tự tin hơn. Lúc tớ kết thúc, khán giả vỗ tay và tớ cảm thấy vô cùng tự hào.\n\nNhìn lại, tớ nhận ra nếu ngày ấy từ chối, tớ đã bỏ lỡ một bài học quý giá. Sợ hãi là điều tự nhiên, nhưng nó không nên ngăn cản chúng ta trưởng thành.',
    vocabulary: [v('challenge', '/ˈtʃælɪndʒ/', 'thử thách', '🧗'), v('terrified', '/ˈterɪfaɪd/', 'vô cùng sợ hãi', '😱'), v('refuse', '/rɪˈfjuːz/', 'từ chối', '✋'), v('feedback', '/ˈfiːdbæk/', 'lời góp ý', '💬'), v('applaud', '/əˈplɔːd/', 'vỗ tay', '👏')],
  },
  's_b2_4': {
    level: 'B2', topic: 'Climate Change and Viet Nam', theme: 'Environment',
    readingText: "Climate change is one of the most serious problems the world is facing today. Over the past century, global temperatures have risen significantly, mainly because of the burning of fossil fuels. As a result, extreme weather events, such as floods, droughts and powerful storms, are becoming more common.\n\nViet Nam is considered one of the countries most vulnerable to climate change. In the Mekong Delta, for example, rising sea levels are causing salt water to enter rice fields, which threatens the livelihoods of millions of farmers. If no action is taken, many coastal areas could be underwater by the end of this century.\n\nAlthough governments must play the leading role, individuals can also make a difference. We could reduce our energy use, choose public transport and avoid single-use plastics. If every household planted a tree, the air in our cities would be noticeably cleaner.\n\nIn my opinion, protecting the environment is not just a choice but a responsibility. If we act now, future generations will thank us.",
    translation: 'Biến đổi khí hậu là một trong những vấn đề nghiêm trọng nhất thế giới đang đối mặt hiện nay. Trong thế kỷ qua, nhiệt độ toàn cầu đã tăng đáng kể, chủ yếu do việc đốt nhiên liệu hoá thạch. Hậu quả là các hiện tượng thời tiết cực đoan như lũ lụt, hạn hán và bão mạnh ngày càng phổ biến.\n\nViệt Nam được xem là một trong những quốc gia dễ bị tổn thương nhất trước biến đổi khí hậu. Chẳng hạn, ở Đồng bằng sông Cửu Long, nước biển dâng khiến nước mặn xâm nhập vào ruộng lúa, đe doạ sinh kế của hàng triệu nông dân. Nếu không hành động, nhiều vùng ven biển có thể bị nhấn chìm vào cuối thế kỷ này.\n\nDù chính phủ phải đóng vai trò chủ chốt, mỗi cá nhân cũng có thể tạo nên sự khác biệt. Chúng ta có thể giảm dùng năng lượng, chọn phương tiện công cộng và tránh đồ nhựa dùng một lần. Nếu mỗi hộ gia đình trồng một cây xanh, không khí ở các thành phố sẽ trong lành hơn rõ rệt.\n\nTheo tớ, bảo vệ môi trường không chỉ là một lựa chọn mà là trách nhiệm. Nếu chúng ta hành động ngay bây giờ, các thế hệ sau sẽ biết ơn chúng ta.',
    vocabulary: [v('significantly', '/sɪɡˈnɪfɪkəntli/', 'đáng kể', '📈'), v('fossil fuels', '/ˈfɒsəl ˈfjuːəlz/', 'nhiên liệu hoá thạch', '⛽'), v('vulnerable', '/ˈvʌlnərəbəl/', 'dễ bị tổn thương', '🆘'), v('livelihood', '/ˈlaɪvlihʊd/', 'sinh kế', '🌾'), v('single-use', '/ˌsɪŋɡəl ˈjuːs/', 'dùng một lần', '🥤')],
  },
  's_b2_5': {
    level: 'B2', topic: 'AI in the Classroom', theme: 'Opinion: education & technology',
    readingText: "Artificial intelligence is changing the way students learn. Today, AI tools can explain difficult concepts, correct pronunciation and create personalised exercises in seconds. For learners who cannot afford private lessons, this support can be extremely valuable.\n\nNevertheless, AI should be used with caution. If students rely on it to do their homework, they will not develop the skills they need, such as critical thinking and problem solving. Moreover, the information produced by AI is not always accurate, so it must be checked carefully.\n\nI believe that AI works best when it is combined with the guidance of a good teacher. A computer can tell you that a sentence is wrong, but a teacher understands why you made the mistake and how you feel about it. Had my teacher not encouraged me when I was struggling, I might have given up learning English altogether.\n\nIn the future, classrooms will probably be equipped with even more advanced technology. However, if we want education to remain meaningful, human connection must always remain at its heart.",
    translation: 'Trí tuệ nhân tạo đang thay đổi cách học sinh học tập. Ngày nay, các công cụ AI có thể giải thích khái niệm khó, sửa phát âm và tạo bài tập riêng cho từng người chỉ trong vài giây. Với những bạn không có điều kiện học thêm, sự hỗ trợ này vô cùng quý giá.\n\nTuy vậy, cần thận trọng khi dùng AI. Nếu học sinh dựa vào AI để làm bài tập về nhà, các em sẽ không phát triển được những kỹ năng cần thiết như tư duy phản biện và giải quyết vấn đề. Hơn nữa, thông tin do AI tạo ra không phải lúc nào cũng chính xác nên cần được kiểm tra kỹ.\n\nTớ tin rằng AI phát huy tốt nhất khi kết hợp với sự hướng dẫn của một người thầy giỏi. Máy tính có thể cho bạn biết một câu bị sai, nhưng thầy cô hiểu vì sao bạn mắc lỗi và bạn cảm thấy thế nào. Nếu ngày ấy cô giáo không động viên khi tớ gặp khó khăn, có lẽ tớ đã bỏ học tiếng Anh hẳn rồi.\n\nTrong tương lai, lớp học có lẽ sẽ được trang bị công nghệ còn hiện đại hơn. Tuy nhiên, nếu muốn giáo dục giữ được ý nghĩa, sự kết nối giữa con người với con người phải luôn là cốt lõi.',
    vocabulary: [v('artificial intelligence', '/ˌɑːtɪfɪʃəl ɪnˈtelɪdʒəns/', 'trí tuệ nhân tạo', '🤖'), v('personalised', '/ˈpɜːsənəlaɪzd/', 'cá nhân hoá', '🎯'), v('afford', '/əˈfɔːd/', 'có đủ điều kiện (chi trả)', '💰'), v('critical thinking', '/ˈkrɪtɪkəl ˈθɪŋkɪŋ/', 'tư duy phản biện', '🧠'), v('accurate', '/ˈækjərət/', 'chính xác', '✔️')],
  },
};
