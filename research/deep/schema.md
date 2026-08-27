# 심층 배치 스키마

각 파일은 하나의 조직에서 최대 5곡을 다룬다.

- `items[].claims`: 원곡·도입 연도·사용 맥락·제작자·별칭처럼 사실 판정이 필요한 주장이다. 같은 필드의 상충값은 서로 다른 claim으로 보존한다.
- `items[].trivia`: 일화·여담을 요약하고 증거 ID와 성격을 연결한다.
- 각 곡은 제목·별칭 배열·현행 상태·요약 외에 최소 2개의 `claims`, 1개 이상의 `usageContexts`, 1개 이상의 `trivia`, `unresolved` 배열을 가져야 한다. 확인할 만한 여담이 없으면 없다는 조사 결과와 검색 범위를 증거에 연결해 기록한다.
- `items[].lyrics`: 전문을 저장하지 않고 출처, 권리 상태, 가사 구조·주제 요약만 남긴다.
- `evidence`: 공식 자료, 나무위키, 언론·인터뷰, 음원, YouTube를 하나의 출처 배열로 관리한다.
- `youtubeSamples`: 곡당 최소 5개다. 설명과 공개 댓글은 필요한 내용만 요약하며 댓글 작성자 개인정보는 저장하지 않는다. 직접 곡 영상이 공개돼 있지 않아 조직·발매·행사 자료를 보충할 때는 `supports`에 `contextOnly`를 넣고 설명에서도 직접 표본이 아님을 밝힌다.
- `coverage`: 자동 검증 가능한 표본 수와 미해결 필드를 기록한다.

댓글 상태는 `available`(공개 댓글을 직접 읽고 요약), `available-empty`(공개 댓글 0개), `unavailable`(댓글 비활성·접근 실패) 중 하나를 쓴다.

신뢰도는 `high`, `medium`, `low`, 판정은 `verified`, `reported`, `anecdotal`, `contested`, `inferred`를 사용한다.
