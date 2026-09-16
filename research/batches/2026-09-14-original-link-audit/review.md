# 원곡 ID 연결 전수 점검

점검일: 2026-09-14

## 범위와 결론

Admin이 합쳐 읽는 정본+편집본 활성 응원가 84곡, 원곡 정본 16건, 현재 공개 카탈로그 25곡을 점검했다.
설명·간단 정보·곡별 조사 메모와 관계 데이터를 대조한 **로컬 데이터 감사**다. 모든 외부 출처를 다시 열어 음악적 차용을 재검증한 조사는 아니다.
‘원곡 명시’는 기존 조사 원고에 그렇게 적혀 있다는 뜻이며, 17곡의 연결 확정 전 해당 근거와 판본을 최종 확인해야 한다.
이 보고서만 생성했으며 곡 본문·관계·상태·원곡 정본·공개 릴리스는 수정하지 않았다.

- 대표 원곡 연결 있음: 26곡. 연결된 원곡 ID는 모두 원곡 목록에 존재한다.
- 대표 원곡 연결 없음: 58곡.
- 원곡명을 적고도 등록·연결이 빠진 것으로 분류: 17곡.
- 복수 원곡 또는 원작·커버 판본을 구분해 등록·연결할 곡: 8곡.
- 자체 창작곡 분류를 구조화할 곡: 5곡.
- 원곡 후보·판본·계보가 미확정 또는 상충: 6곡.
- 조사했으나 원곡·자체 창작 여부 미상: 8곡.
- Admin 본문과 조사 메모가 없는 신규 레코드: 14곡. 이전 연구 폴더·이벤트 목업에 단서가 있을 수 있으므로 ‘세상에 정보가 없음’은 아님.
- 존재하지 않는 원곡 ID 참조: 0건. 이 결과는 기존 연결의 음악적 정답 여부까지 보증하지 않는다.
- 공개 카탈로그에서 원곡 미연결: 고려 ‘승리의 함성’ 1곡. 원고상 자체 창작 계열이지만 현재 화면 변환은 ‘원곡 정보 준비 중 / 미등록’으로 처리한다.
- ‘파란’은 편집본에 Over the Rainbow가 적혀 있으나 관계가 비어 있고 원곡 목록에도 없다. 점검 시 현재 공개 카탈로그에는 아직 없다.

## 반복 발생 원인

1. [AI 작업 지침](../../../scripts/content-job-store.mjs:101)은 관계 데이터를 수정하지 않고 descriptionText·researchText만 제출하도록 명시한다. [결과 반영](../../../scripts/content-job-store.mjs:148)도 본문·상태와 메모만 갱신한다.
2. [Admin](../../../admin/app.js:1075)의 대표·보조 원곡은 사람이 ID를 직접 입력하는 필드다. 본문의 원곡명이 원곡 정본 레코드나 관계로 바뀌는 단계가 없다.
3. 기존 정본에 있던 originalSongId는 편집 데이터로 변환되지만, 새 조사곡은 relationships가 빈 채로 추가된다. 원고 보강과 관계 등록의 책임이 분리된 채 마무리 점검이 빠진다.
4. [편집 검증](../../../scripts/content-editorial-store.mjs:464)과 [공개 검증](../../../scripts/content-release-store.mjs:324)은 관계 형식 등을 확인하지만, ‘본문에 원곡이 있는데 미연결’ 상태를 검토 대상으로 잡지 않는다. 공개 검증은 원곡 targetId의 실제 존재도 확인하지 않는다.
5. [화면 변환](../../../src/data/catalog.ts:107)은 미연결과 잘못된 ID를 임시 원곡으로 처리한다. 미조사·원곡 후보·외부 원곡 없는 창작곡이 화면에서 같은 미등록 상태로 보인다.

따라서 사용자 입력 실수로만 볼 문제가 아니다. 조사 결과를 원곡 정본·대표/보조 관계까지 정리하는 작업 단계와 상태 표현이 빠진 구조적 누락이다.
기존 정본은 자체 창작곡을 kind=commissioned 레코드로 표현하는 사례(두산 야야야 두산)가 있다. 새 창작곡도 같은 관례를 쓸지 별도 상태를 만들지 정해야 하며, 미상곡을 창작곡으로 임의 분류해서는 안 된다.

## 곡별 결과

### 원곡 명시 / 등록·연결 누락 — 17곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [고려 고연가 - 고대를 사랑하라](../../../content/editorial/songs/korea-university-godaereul-saranghara/song.json) | 이루마 `Kiss the Rain` |
| [고려 꿇어라 연세](../../../content/editorial/songs/korea-university-kkureora-yonsei/song.json) | Taio Cruz feat. Flo Rida `Hangover` |
| [고려 무인도](../../../content/editorial/songs/korea-university-muindo/song.json) | 김추자 ‘무인도’(1974), 이종택 작사·이봉조 작곡 |
| [고려 석탑](../../../content/editorial/songs/korea-university-seoktap/song.json) | 장애향 ‘석탑’(1979) |
| [고려 엘리제를 위하여](../../../content/editorial/songs/korea-university-elise-reul-wihayeo/song.json) | 정미조 ‘정열의 꽃’(1972) |
| [고려 연세치킨](../../../content/editorial/songs/korea-university-yonsei-chicken/song.json) | Eruption ‘One Way Ticket’ |
| [고려 출사표](../../../content/editorial/songs/korea-university-chulsapyo/song.json) | Klaus Badelt ‘He's a Pirate’, 영화 ‘Pirates of the Caribbean: The Curse of the Black Pearl’ 사운드트랙(2003) |
| [고려 하늘이여](../../../content/editorial/songs/korea-university-haneuriyeo/song.json) | Duo Orientango `슬픈 열정 (Pasion Triste)` |
| [고려 Go! 100](../../../content/editorial/songs/korea-university-go-100/song.json) | 요한 파헬벨 ‘Canon and Gigue in D major, P.37’ 중 Canon 선율(통칭 캐논 변주곡) |
| [고려 Yeah Yeah Yeah](../../../content/editorial/songs/korea-university-yeah-yeah-yeah/song.json) | 노브레인 `Rock It Rocket` |
| [성균관 출정](../../../content/editorial/songs/sungkyunkwan-university-chuljeong/song.json) | Bellini · Samba de Janeiro |
| [연세 아파트](../../../content/editorial/songs/yonsei-university-apartment/song.json) | 윤수일 `아파트`, 윤수일 작사·작곡, 1982년 발표 |
| [연세 영원한 함성](../../../content/editorial/songs/yonsei-university-yeongwonhan-hamseong/song.json) | 히사이시 조 `海の見える街` / `A Town with an Ocean View`, 영화 `마녀 배달부 키키` OST(1989) |
| [연세 오늘 밤새](../../../content/editorial/songs/yonsei-university-oneul-bamsae/song.json) | PSY ‘오늘밤새’ — 앨범 ‘Psyfive’(2010) |
| [연세 온누리에](../../../content/editorial/songs/yonsei-university-onnurie/song.json) | Alan Walker, Sabrina Carpenter & Farruko ‘On My Way’(2019) |
| [연세 파란](../../../content/editorial/songs/yonsei-university-paran/song.json) | Judy Garland — Over the Rainbow. 원곡 목록에 해당 항목 자체가 없음. |
| [연세 One Night Only](../../../content/editorial/songs/yonsei-university-one-night-only/song.json) | ‘Dreamgirls’의 ‘One Night Only (Disco Version)’ — Beyoncé Knowles, Sharon Leal, Anika Noni Rose; Henry Krieger·Tom Eyen … |

### 복수 원곡·판본 구분 후 연결 — 8곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [고려 고연가 - 고대를 노래하라](../../../content/editorial/songs/korea-university-godaereul-noraehara/song.json) | Sarah Brightman·Andrea Bocelli `Time to Say Goodbye` 계열 |
| [고려 샹젤리제](../../../content/editorial/songs/korea-university-champs-elysees/song.json) | Joe Dassin — Les Champs-Élysées(1969); 상위 계보는 Jason Crest의 Waterloo Road(1968) |
| [고려 우리는 고대](../../../content/editorial/songs/korea-university-urineun-korea/song.json) | 슈퍼키드 — Rock Star; Glen Check — 60's Cardin |
| [고려 지.야의 함성](../../../content/editorial/songs/korea-university-jiya-ui-hamseong/song.json) | Matvey Blanter 작곡·Mikhail Isakovsky 작사 ‘Katyusha’(1938); 고려대 공식 설명은 Leningrad Cowboys ‘Katjusha’와 ‘Granada’ 요소를 함께 표기 |
| [고려 화려, 피어난 함성](../../../content/editorial/songs/korea-university-hwaryeo-pieonan-hamseong/song.json) | 레오·김세정 `우리는 하나 (We, the Reds)`와 Coldplay `Viva La Vida`를 결합한 편곡 |
| [고려 Young Tigers](../../../content/editorial/songs/korea-university-young-tigers/song.json) | PSY `We Are Young`과 N.EX.T `Laura` |
| [연세 서곡](../../../content/editorial/songs/yonsei-university-seogok/song.json) | Village People ‘Go West’(1979) |
| [연세 GO 연세](../../../content/editorial/songs/yonsei-university-go-yonsei/song.json) | 노브레인 ‘진군가’, 붉은악마 2002 공식 앨범 수록·2002-07-24 발매 |

### 자체 창작곡 분류 필요 — 5곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [고려 승리의 함성](../../../content/editorial/songs/korea-university-seungni-ui-hamseong/song.json) | 공모전 창작곡 계열로 서술됨. 불멸의 함성→승리의 함성 제목 변경은 정황으로 남겨야 함. |
| [고려 싱글벙글](../../../content/editorial/songs/korea-university-singgeulbeonggeul/song.json) | 엘리제 작사·작곡 자체 창작으로 서술됨. |
| [성균관 그대 나의 성균](../../../content/editorial/songs/sungkyunkwan-university-geudae-naui-seonggyun/song.json) | 공식 자작곡 표기, 제작팀 세부 정보는 보류. |
| [성균관 성균가](../../../content/editorial/songs/sungkyunkwan-university-seonggyunga/song.json) | 공모전 창작곡; 서우석 작곡, 서우석·이태인·유시현 작사로 서술됨. |
| [성균관 우리가 누구](../../../content/editorial/songs/sungkyunkwan-university-uriga-nugu/song.json) | 조지훈·윤소영 작사·작곡으로 서술됨. |

### 계보·판본 미확정 / 상충 — 6곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [고려 청춘예찬](../../../content/editorial/songs/korea-university-cheongchun-yechan/song.json) | 캐논 변주곡 vs A Lover’s Concerto 상충. 일괄 연결 금지. |
| [성균관 민족의 외침](../../../content/editorial/songs/sungkyunkwan-university-minjogui-oechim/song.json) | 삼성 라이온즈 허가 2차 창작이라고 서술하나 어느 곡인지 미확인. |
| [연세 고.밟.꿈](../../../content/editorial/songs/yonsei-university-go-balp-kkum/song.json) | Jesus Is the Rock 제목은 있으나 동명곡·작자·녹음판 미확정. |
| [연세 승전가](../../../content/editorial/songs/yonsei-university-seungjeonga/song.json) | 나루토 The Rising Fighting Spirit 후보. 기초 조사 메모에 공식 차용 근거 미확보 명시. |
| [연세 청춘물결](../../../content/editorial/songs/yonsei-university-cheongchun-mulgyeol/song.json) | You Raise Me Up 후보. Westlife 참고 버전과 Secret Garden 최초 녹음 구분; 공식 차용 근거 미확보. |
| [연세 하늘 아래](../../../content/editorial/songs/yonsei-university-haneul-arae/song.json) | 대구FC 그 겨울 계열로 서술; 직접 제작 경로 미확인. 선행 응원가와 원작 구분 필요. |

### 조사했으나 원곡·창작 여부 미상 — 8곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [성균관 결의](../../../content/editorial/songs/sungkyunkwan-university-gyeolui/song.json) | 공개 자료 미확인 |
| [성균관 성균을 고하리라](../../../content/editorial/songs/sungkyunkwan-university-seonggyuneul-goharira/song.json) | 현재 본문에서 원곡·자체 창작을 특정하지 못함. |
| [성균관 성대를 사랑해](../../../content/editorial/songs/sungkyunkwan-university-seongdaereul-saranghae/song.json) | 공개 자료 미확인 |
| [성균관 성대를 좋아해](../../../content/editorial/songs/sungkyunkwan-university-seongdaereul-joahae/song.json) | 공개 자료 미확인 |
| [성균관 여명](../../../content/editorial/songs/sungkyunkwan-university-yeomyeong/song.json) | 공개 자료 미확인 |
| [성균관 찬란](../../../content/editorial/songs/sungkyunkwan-university-chanran/song.json) | 현재 본문에서 원곡·자체 창작을 특정하지 못함. |
| [성균관 킹고인의 함성](../../../content/editorial/songs/sungkyunkwan-university-kinggoin-ui-hamseong/song.json) | 현재 본문에서 원곡·자체 창작을 특정하지 못함. |
| [성균관 함성](../../../content/editorial/songs/sungkyunkwan-university-hamseong/song.json) | 공개 자료 미확인 |

### 레코드만 등록 / 미조사 — 14곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [KIA 라인업송](../../../content/editorial/songs/kia-tigers-lineup-song/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [고려 고래사냥](../../../content/editorial/songs/korea-university-goraesanyang/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [KT 승리를 위하여](../../../content/editorial/songs/kt-wiz-seungnireul-wihayeo/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [KT 아파트](../../../content/editorial/songs/kt-wiz-apartment/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [KT Winning KT](../../../content/editorial/songs/kt-wiz-winning-kt/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [롯데 바다새](../../../content/editorial/songs/lotte-giants-badasae/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [SSG 투혼의 랜더스](../../../content/editorial/songs/ssg-landers-tuhon-ui-landers/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [SSG J에게](../../../content/editorial/songs/ssg-landers-j-ege/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [연세 고.대](../../../content/editorial/songs/yonsei-university-ko-dae/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [연세 고양이 소리](../../../content/editorial/songs/yonsei-university-goyangi-sound/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [연세 바다새](../../../content/editorial/songs/yonsei-university-badasae/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [연세 J에게](../../../content/editorial/songs/yonsei-university-j-ege/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [연세 Oh My Friend](../../../content/editorial/songs/yonsei-university-oh-my-friend/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |
| [연세 Woo](../../../content/editorial/songs/yonsei-university-woo/song.json) | 빈 조사 대상 레코드. 먼저 기초 조사 필요. |

### 기존 연결 (참조 무결성 정상) — 26곡

| 곡 | 현재 기록 / 판정 |
| --- | --- |
| [두산 뱃노래](../../../content/editorial/songs/doosan-bears-baennorae/song.json) | original-song: korean-traditional-baennorae; source-cheer-song: korea-university-baennorae |
| [두산 승리를 위하여](../../../content/editorial/songs/doosan-bears-seungnireul-wihayeo/song.json) | original-song: rhapsody-emerald-sword |
| [두산 야야야 두산](../../../content/editorial/songs/doosan-bears-yayaya-doosan/song.json) | original-song: doosan-yayaya-doosan-original |
| [두산 해야](../../../content/editorial/songs/doosan-bears-haeya/song.json) | original-song: magma-haeya |
| [두산 해야 해야](../../../content/editorial/songs/doosan-bears-haeya-haeya/song.json) | original-song: kim-hak-rae-haeya-haeya |
| [한화 사랑한다 이글스](../../../content/editorial/songs/hanwha-eagles-saranghanda-eagles/song.json) | original-song: han-sung-min-saranghamyeon-halssurok |
| [한양 한양을 위하여](../../../content/editorial/songs/hanyang-university-hanyangeul-wihayeo/song.json) | original-song: rhapsody-emerald-sword; source-cheer-song: doosan-bears-seungnireul-wihayeo |
| [KIA 기아를 응원하라](../../../content/editorial/songs/kia-tigers-kiareul-eungwonhara/song.json) | original-song: andrea-bocelli-con-te-partiro |
| [키움 승리의 함성](../../../content/editorial/songs/kiwoom-heroes-seungni-ui-hamseong/song.json) | original-song: andrea-bocelli-melodramma; source-cheer-song: korea-university-minjogui-aria |
| [고려 012 : 영원히](../../../content/editorial/songs/korea-university-yeongwonhi/song.json) | original-song: sog-012-yeongwonhi |
| [고려 들어라 보아라 그리고 기억하라](../../../content/editorial/songs/korea-university-deureora-boara-geurigo-gieokhara/song.json) | original-song: kimi-wo-nosete |
| [고려 민족의 아리아](../../../content/editorial/songs/korea-university-minjogui-aria/song.json) | original-song: andrea-bocelli-melodramma |
| [고려 뱃노래](../../../content/editorial/songs/korea-university-baennorae/song.json) | original-song: korean-traditional-baennorae |
| [고려 영원하라](../../../content/editorial/songs/korea-university-yeongwonhara/song.json) | original-song: vanessa-mae-contradanza |
| [고려 Forever](../../../content/editorial/songs/korea-university-forever/song.json) | original-song: stratovarius-forever |
| [LG 사랑한다 LG](../../../content/editorial/songs/lg-twins-saranghanda-lg/song.json) | original-song: carlos-gardel-por-una-cabeza; secondary-original-song: kim-seon-gyeong-majimag-seontaeg; source-cheer-song: yonsei-university-yonseiyeo-saranghanda |
| [LG 서울의 아리아](../../../content/editorial/songs/lg-twins-seoul-ui-aria/song.json) | original-song: andrea-bocelli-melodramma; source-cheer-song: korea-university-minjogui-aria |
| [LG 승리의 노래](../../../content/editorial/songs/lg-twins-seungni-ui-norae/song.json) | original-song: stratovarius-forever; source-cheer-song: korea-university-forever |
| [롯데 뱃노래](../../../content/editorial/songs/lotte-giants-baennorae/song.json) | original-song: korean-traditional-baennorae; source-cheer-song: korea-university-baennorae |
| [롯데 소리높여 외쳐보자](../../../content/editorial/songs/lotte-giants-sori-nop-yeo-oechyeoboja/song.json) | original-song: vanessa-mae-contradanza; source-cheer-song: korea-university-yeongwonhara |
| [성균관 승리를 위하여](../../../content/editorial/songs/sungkyunkwan-university-seungnireul-wihayeo/song.json) | original-song: rhapsody-emerald-sword; source-cheer-song: doosan-bears-seungnireul-wihayeo |
| [연세 서시](../../../content/editorial/songs/yonsei-university-seosi/song.json) | original-song: banya-beethoven-virus |
| [연세 연세여 사랑한다](../../../content/editorial/songs/yonsei-university-yonseiyeo-saranghanda/song.json) | original-song: carlos-gardel-por-una-cabeza; secondary-original-song: kim-seon-gyeong-majimag-seontaeg |
| [연세 원시림](../../../content/editorial/songs/yonsei-university-wonsirim/song.json) | original-song: styx-music-time |
| [연세 하늘 끝까지](../../../content/editorial/songs/yonsei-university-haneul-kkeutkkaji/song.json) | original-song: han-sung-min-saranghamyeon-halssurok |
| [연세 해야](../../../content/editorial/songs/yonsei-university-haeya/song.json) | original-song: magma-haeya |

## 후속 처리 권고 (이번에는 미실행)

1. 파란을 포함한 17곡은 기존 본문의 출처·아티스트·판본을 확인하고 원곡 정본 생성과 관계 연결을 한 번에 처리.
2. 8곡은 대표/보조 원곡과 원작/커버 판본 구분을 먼저 결정. 기존 ‘고대를 노래하라’ 관련 Con te partirò 레코드는 있으므로 무조건 새 원곡을 중복 생성하지 않기.
3. 창작곡 5곡은 ‘외부 원곡 없음’과 ‘미조사’를 구분해 표현. 제작자 미확정 부분은 유지.
4. 미확정 6곡·원곡 미상 8곡·레코드만 있는 14곡은 이름 유사성만으로 자동 연결하지 않기.
5. AI 결과에 관계 변경을 무조건 허용하기보다는, 원곡 연결 제안과 검토·저장 단계를 추가. 원곡 제목 검색/선택 및 미등록 원곡 생성 기능으로 수동 ID 입력 부담을 줄이기.
6. 공개 전 검사에서 ‘원곡 미연결(후보 있음)’, ‘창작곡’, ‘원곡 미상’, ‘잘못된 ID’를 구분. 공개 자체를 일괄 차단하기보다 상태·필요 작업을 명시.
