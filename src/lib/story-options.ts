export const worlds = [
  { id: "dinosaur", name: "공룡·바다 친구들", description: "공룡과 바다 친구들의 상상 이야기" },
  { id: "vehicle", name: "자동차 마을", description: "서로 다른 일을 하는 자동차 친구들" },
] as const;
export type World = (typeof worlds)[number]["id"];
export const characterCategories = [
  { id: "herbivore", world: "dinosaur", name: "초식", description: "풀과 나뭇잎을 먹던 공룡 친구들이에요." },
  { id: "carnivore", world: "dinosaur", name: "육식", description: "고기를 먹던 공룡들도 동화에서는 다정한 친구가 돼요." },
  { id: "marine", world: "dinosaur", name: "바다", description: "공룡과 함께 살던 바다 파충류예요. 공룡과는 다른 동물이에요." },
  { id: "everyday", world: "vehicle", name: "일상", description: "마을을 오가며 하루를 함께하는 자동차 친구들이에요." },
  { id: "construction", world: "vehicle", name: "중장비", description: "땅을 고르고 물건을 옮기며 힘을 모으는 친구들이에요." },
  { id: "helpers", world: "vehicle", name: "도움", description: "안전하고 깨끗한 마을을 위해 도와주는 친구들이에요." },
] as const;
export type CharacterCategory = (typeof characterCategories)[number]["id"];
// Categories are a browsing aid: land dinosaurs by diet, marine reptiles together.
// The cast mixes periods for imaginary stories; it is not a Jurassic-only fauna.
export const characters = [
  { id: "stegosaurus", world: "dinosaur", category: "herbivore", name: "스테고사우루스", storyName: "스테고", description: "신중하고 다정하며, 주변을 잘 살펴봐요" },
  { id: "triceratops", world: "dinosaur", category: "herbivore", name: "트리케라톱스", storyName: "트리", description: "약속을 소중히 여기고 친구를 기다려줘요" },
  { id: "brachiosaurus", world: "dinosaur", category: "herbivore", name: "브라키오사우루스", storyName: "브라키", description: "높은 곳을 살펴보며 차분하게 도와요" },
  { id: "ankylosaurus", world: "dinosaur", category: "herbivore", name: "안킬로사우루스", storyName: "안키", description: "끈기 있게 작은 일을 끝까지 해내요" },
  { id: "diplodocus", world: "dinosaur", category: "herbivore", name: "디플로도쿠스", storyName: "디플로", description: "느긋하게 걸으며 친구의 이야기를 잘 들어요" },
  { id: "apatosaurus", world: "dinosaur", category: "herbivore", name: "아파토사우루스", storyName: "아파토", description: "큰 몸으로 작은 친구에게 그늘을 만들어줘요" },
  { id: "parasaurolophus", world: "dinosaur", category: "herbivore", name: "파라사우롤로푸스", storyName: "파라", description: "흥얼흥얼 노래하며 친구의 기운을 북돋아요" },
  { id: "iguanodon", world: "dinosaur", category: "herbivore", name: "이구아노돈", storyName: "이구", description: "새로운 길을 찾아보는 것을 좋아해요" },
  { id: "brontosaurus", world: "dinosaur", category: "herbivore", name: "브론토사우루스", storyName: "브론토", description: "큰 걸음도 친구와 함께라면 천천히 걸어요" },
  { id: "argentinosaurus", world: "dinosaur", category: "herbivore", name: "아르헨티노사우루스", storyName: "아르젠", description: "높은 곳에서 먼 길을 살피며 친구를 안내해요" },
  { id: "camarasaurus", world: "dinosaur", category: "herbivore", name: "카마라사우루스", storyName: "카마라", description: "친구가 편히 쉴 곳을 꼼꼼히 찾아줘요" },
  { id: "mamenchisaurus", world: "dinosaur", category: "herbivore", name: "마멘치사우루스", storyName: "마멘", description: "긴 목을 기울여 작은 친구의 말을 들어요" },
  { id: "saltasaurus", world: "dinosaur", category: "herbivore", name: "살타사우루스", storyName: "살타", description: "수줍은 친구에게 먼저 자리를 내어줘요" },
  { id: "shunosaurus", world: "dinosaur", category: "herbivore", name: "슈노사우루스", storyName: "슈노", description: "서두르지 않고 차근차근 계획을 세워요" },
  { id: "kentrosaurus", world: "dinosaur", category: "herbivore", name: "켄트로사우루스", storyName: "켄트로", description: "친구와 부딪히지 않도록 조심해서 움직여요" },
  { id: "huayangosaurus", world: "dinosaur", category: "herbivore", name: "후아양고사우루스", storyName: "후아", description: "작은 변화도 금세 알아채고 알려줘요" },
  { id: "euoplocephalus", world: "dinosaur", category: "herbivore", name: "유오플로케팔루스", storyName: "유오", description: "친구 곁에서 든든하게 기다려줘요" },
  { id: "nodosaurus", world: "dinosaur", category: "herbivore", name: "노도사우루스", storyName: "노도", description: "작은 돌들을 모아 예쁜 길을 만들어요" },
  { id: "polacanthus", world: "dinosaur", category: "herbivore", name: "폴라칸투스", storyName: "폴라", description: "약속한 일은 잊지 않고 끝까지 해내요" },
  { id: "pachycephalosaurus", world: "dinosaur", category: "herbivore", name: "파키케팔로사우루스", storyName: "파키", description: "새로운 놀이의 규칙을 함께 생각해요" },
  { id: "dryosaurus", world: "dinosaur", category: "herbivore", name: "드리오사우루스", storyName: "드리오", description: "속상한 마음도 말로 차분하게 전해요" },
  { id: "styracosaurus", world: "dinosaur", category: "herbivore", name: "스티라코사우루스", storyName: "스티라", description: "친구의 작은 성공에도 기쁘게 응원해요" },
  { id: "centrosaurus", world: "dinosaur", category: "herbivore", name: "센트로사우루스", storyName: "센트로", description: "모두의 의견을 듣고 함께 정하는 걸 좋아해요" },
  { id: "protoceratops", world: "dinosaur", category: "herbivore", name: "프로토케라톱스", storyName: "프로토", description: "낯선 친구에게도 다정하게 인사해요" },
  { id: "psittacosaurus", world: "dinosaur", category: "herbivore", name: "프시타코사우루스", storyName: "프시타", description: "조그만 씨앗과 나뭇잎을 살펴보길 좋아해요" },
  { id: "edmontosaurus", world: "dinosaur", category: "herbivore", name: "에드몬토사우루스", storyName: "에드몬", description: "함께 걷는 친구가 뒤처지면 기다려줘요" },
  { id: "corythosaurus", world: "dinosaur", category: "herbivore", name: "코리토사우루스", storyName: "코리", description: "즐거운 인사로 하루를 시작해요" },
  { id: "lambeosaurus", world: "dinosaur", category: "herbivore", name: "람베오사우루스", storyName: "람베", description: "친구의 이야기를 재미있게 이어가요" },
  { id: "maiasaura", world: "dinosaur", category: "herbivore", name: "마이아사우라", storyName: "마이아", description: "작은 친구를 살뜰히 보살펴줘요" },
  { id: "ouranosaurus", world: "dinosaur", category: "herbivore", name: "오우라노사우루스", storyName: "오우라", description: "햇볕 좋은 날 친구들과 산책하기를 좋아해요" },
  { id: "tyrannosaurus", world: "dinosaur", category: "carnivore", name: "티라노사우루스", storyName: "티노", description: "몸집은 크지만 세심하고 마음이 여려요" },
  { id: "allosaurus", world: "dinosaur", category: "carnivore", name: "알로사우루스", storyName: "알로", description: "먼저 용기 내어 친구에게 말을 걸어요" },
  { id: "velociraptor", world: "dinosaur", category: "carnivore", name: "벨로키랍토르", storyName: "벨로", description: "재빠르게 움직이며 작은 단서를 잘 찾아요" },
  { id: "spinosaurus", world: "dinosaur", category: "carnivore", name: "스피노사우루스", storyName: "스피노", description: "물가를 좋아하고 새로운 놀이를 잘 떠올려요" },
  { id: "carnotaurus", world: "dinosaur", category: "carnivore", name: "카르노타우루스", storyName: "카르노", description: "수줍지만 친구가 필요할 때 곁을 지켜요" },
  { id: "dilophosaurus", world: "dinosaur", category: "carnivore", name: "딜로포사우루스", storyName: "딜로", description: "호기심이 많고 재미있는 생각을 나눠요" },
  { id: "ceratosaurus", world: "dinosaur", category: "carnivore", name: "케라토사우루스", storyName: "케라토", description: "궁금한 점을 묻고 새로운 것을 배워요" },
  { id: "giganotosaurus", world: "dinosaur", category: "carnivore", name: "기가노토사우루스", storyName: "기가노", description: "큰 몸을 낮추고 작은 친구와 눈을 맞춰요" },
  { id: "carcharodontosaurus", world: "dinosaur", category: "carnivore", name: "카르카로돈토사우루스", storyName: "카르카", description: "친구가 어려워하는 일에 힘을 보태요" },
  { id: "acrocanthosaurus", world: "dinosaur", category: "carnivore", name: "아크로칸토사우루스", storyName: "아크로", description: "바른 자세로 천천히 걷는 것을 좋아해요" },
  { id: "albertosaurus", world: "dinosaur", category: "carnivore", name: "알베르토사우루스", storyName: "알베르", description: "친구와 번갈아 놀이를 이끌어요" },
  { id: "tarbosaurus", world: "dinosaur", category: "carnivore", name: "타르보사우루스", storyName: "타르보", description: "처음 하는 일도 친구와 함께 도전해요" },
  { id: "daspletosaurus", world: "dinosaur", category: "carnivore", name: "다스플레토사우루스", storyName: "다스", description: "답답할 때는 잠깐 쉬며 마음을 가라앉혀요" },
  { id: "gorgosaurus", world: "dinosaur", category: "carnivore", name: "고르고사우루스", storyName: "고르고", description: "실수한 친구에게 다시 해보자고 말해요" },
  { id: "baryonyx", world: "dinosaur", category: "carnivore", name: "바리오닉스", storyName: "바리", description: "물가의 반짝이는 돌을 구경하기 좋아해요" },
  { id: "suchomimus", world: "dinosaur", category: "carnivore", name: "수코미무스", storyName: "수코", description: "물결을 바라보며 차분한 생각을 나눠요" },
  { id: "deinonychus", world: "dinosaur", category: "carnivore", name: "데이노니쿠스", storyName: "데이노", description: "작은 일을 나누어 함께 해결해요" },
  { id: "utahraptor", world: "dinosaur", category: "carnivore", name: "유타랍토르", storyName: "유타", description: "친구가 준비될 때까지 출발을 기다려요" },
  { id: "microraptor", world: "dinosaur", category: "carnivore", name: "미크로랍토르", storyName: "미크로", description: "작은 몸으로 숲의 새 소식을 전해요" },
  { id: "compsognathus", world: "dinosaur", category: "carnivore", name: "콤프소그나투스", storyName: "콤피", description: "작은 물건을 잘 찾아 친구에게 돌려줘요" },
  { id: "coelophysis", world: "dinosaur", category: "carnivore", name: "코엘로피시스", storyName: "코엘", description: "가벼운 발걸음으로 친구를 찾아가요" },
  { id: "herrerasaurus", world: "dinosaur", category: "carnivore", name: "헤레라사우루스", storyName: "헤레라", description: "처음 만난 친구와도 금세 가까워져요" },
  { id: "megalosaurus", world: "dinosaur", category: "carnivore", name: "메갈로사우루스", storyName: "메갈로", description: "오래된 이야기를 들려주기를 좋아해요" },
  { id: "mapusaurus", world: "dinosaur", category: "carnivore", name: "마푸사우루스", storyName: "마푸", description: "힘을 모으면 할 수 있다고 친구를 응원해요" },
  { id: "mosasaurus", world: "dinosaur", category: "marine", name: "모사사우루스", storyName: "모사", description: "물속 길을 잘 아는, 호기심 많은 친구예요" },
  { id: "plesiosaurus", world: "dinosaur", category: "marine", name: "플레시오사우루스", storyName: "플레시", description: "물 위로 고개를 내밀고 다정하게 인사해요" },
  { id: "ichthyosaurus", world: "dinosaur", category: "marine", name: "이크티오사우루스", storyName: "이크티", description: "헤엄치기를 좋아하며 친구의 속도를 맞춰줘요" },
  { id: "elasmosaurus", world: "dinosaur", category: "marine", name: "엘라스모사우루스", storyName: "엘라", description: "잔잔한 물가에서 친구의 마음을 살펴요" },
  { id: "liopleurodon", world: "dinosaur", category: "marine", name: "리오플레우로돈", storyName: "리오", description: "물속에서도 친구와의 약속을 소중히 여겨요" },
  { id: "tylosaurus", world: "dinosaur", category: "marine", name: "틸로사우루스", storyName: "틸로", description: "파도 소리를 들으며 편안하게 쉬어요" },
  { id: "bus", world: "vehicle", category: "everyday", name: "버스", storyName: "부비", description: "친구를 잘 챙기며 함께 가는 것을 좋아해요" },
  { id: "taxi", world: "vehicle", category: "everyday", name: "택시", storyName: "택이", description: "친구가 가고 싶은 곳을 다정하게 물어봐요" },
  { id: "school-bus", world: "vehicle", category: "everyday", name: "스쿨버스", storyName: "버니", description: "모두 준비됐는지 확인하고 천천히 출발해요" },
  { id: "double-decker-bus", world: "vehicle", category: "everyday", name: "이층버스", storyName: "두리", description: "높은 창으로 보이는 풍경을 친구와 나눠요" },
  { id: "car", world: "vehicle", category: "everyday", name: "승용차", storyName: "아리", description: "차례를 지키며 느긋하게 나들이해요" },
  { id: "delivery-truck", world: "vehicle", category: "everyday", name: "택배차", storyName: "꾸리", description: "작은 선물도 소중하게 챙겨 전해줘요" },
  { id: "camper-van", world: "vehicle", category: "everyday", name: "캠핑카", storyName: "캠피", description: "편히 쉴 자리를 찾으며 여행을 즐겨요" },
  { id: "excavator", world: "vehicle", category: "construction", name: "굴착기", storyName: "굴리", description: "천천히 꼼꼼하게 문제를 해결해요" },
  { id: "bulldozer", world: "vehicle", category: "construction", name: "불도저", storyName: "도저", description: "울퉁불퉁한 길을 차근차근 고르게 만들어요" },
  { id: "dump-truck", world: "vehicle", category: "construction", name: "덤프트럭", storyName: "덤이", description: "무거운 짐도 친구들과 함께 나눠요" },
  { id: "concrete-mixer", world: "vehicle", category: "construction", name: "레미콘", storyName: "빙글", description: "서두르지 않고 알맞게 섞는 걸 좋아해요" },
  { id: "crane-truck", world: "vehicle", category: "construction", name: "크레인차", storyName: "크니", description: "주변을 살핀 뒤 조심스럽게 물건을 들어요" },
  { id: "road-roller", world: "vehicle", category: "construction", name: "로드롤러", storyName: "꾹이", description: "한 걸음씩 나아가며 길을 단단하게 다져요" },
  { id: "wheel-loader", world: "vehicle", category: "construction", name: "휠로더", storyName: "로더", description: "흩어진 모래를 모아 친구의 일을 도와요" },
  { id: "forklift", world: "vehicle", category: "construction", name: "지게차", storyName: "지기", description: "상자를 낮게 들고 천천히 자리에 놓아요" },
  { id: "backhoe-loader", world: "vehicle", category: "construction", name: "백호로더", storyName: "호야", description: "앞뒤 도구를 번갈아 쓰며 꼼꼼히 도와요" },
  { id: "asphalt-paver", world: "vehicle", category: "construction", name: "아스팔트 피니셔", storyName: "펴리", description: "친구들이 다닐 길을 고르게 펼쳐요" },
  { id: "fire-engine", world: "vehicle", category: "helpers", name: "소방차", storyName: "불이", description: "도움이 필요한 친구를 차분하게 도와요" },
  { id: "ambulance", world: "vehicle", category: "helpers", name: "구급차", storyName: "도담", description: "다른 친구의 기분을 먼저 살펴요" },
  { id: "police-car", world: "vehicle", category: "helpers", name: "경찰차", storyName: "지킴", description: "친구들이 차례를 지키도록 다정하게 안내해요" },
  { id: "garbage-truck", world: "vehicle", category: "helpers", name: "청소차", storyName: "깨미", description: "깨끗하고 편안한 마을을 만드는 걸 좋아해요" },
  { id: "tow-truck", world: "vehicle", category: "helpers", name: "견인차", storyName: "이음", description: "도움이 필요한 친구에게 먼저 물어보고 도와요" },
] as const;
export const themes = [
  { id: "family", name: "가족", description: "서로 아끼는 마음을 전해요", direction: "다양한 가족·돌봄 관계를 따뜻하게 표현" },
  { id: "friendship", name: "우정", description: "다른 친구를 이해해요", direction: "차이를 인정하고 함께 해결" },
  { id: "kindness", name: "배려", description: "나누고 기다려줘요", direction: "서로의 입장을 생각하고 돕기" },
  { id: "courage", name: "용기", description: "처음 하는 일에 도전해요", direction: "도움을 요청하며 작은 시도를 해보기" },
  { id: "habits", name: "생활습관", description: "놀고 난 자리를 정리해요", direction: "즐겁게 정리하고 약속 지키기" },
] as const;
export type Selection = {
  world: World;
  characterIds: string[];
  theme: (typeof themes)[number]["id"];
  targetSeconds: 60 | 120;
};
export function defaultSelection(): Selection {
  return { world: "dinosaur", characterIds: [], theme: "friendship", targetSeconds: 60 };
}
export function characterById(id: string) {
  return characters.find((character) => character.id === id);
}
export function charactersForWorld(world: World) {
  return characters.filter((character) => character.world === world);
}
export const characterSearchAliases: Readonly<Record<string, readonly string[]>> = {
  bus: ["시내버스"], taxi: ["택시차"], "school-bus": ["통학버스", "유치원버스"],
  "double-decker-bus": ["2층버스"], "delivery-truck": ["배달차", "배송차"],
  excavator: ["굴삭기", "포크레인"], "concrete-mixer": ["믹서트럭", "콘크리트믹서"],
  "crane-truck": ["기중기", "크레인"], "road-roller": ["롤러"], "wheel-loader": ["로더"],
  "asphalt-paver": ["포장기", "아스팔트포장기"], "fire-engine": ["소방자동차"],
  ambulance: ["앰뷸런스", "응급차"], "police-car": ["순찰차"], "garbage-truck": ["쓰레기차"],
  "tow-truck": ["렉카", "레커차"],
};
