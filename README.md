# 응원가 아카이브

대학과 야구 응원가를 원곡별, 구단·학교별, 연도별로 탐색하는 React + Vite 사이트입니다.

최초 공개 릴리스에는 사용자가 검수한 응원가 23곡이 포함되어 있습니다. 이후에도 사용자가 최종 검수·공개한 항목만 사이트에 추가합니다.

응원가 목록, 반복형 AI 수집·작성, 사용자 검수, 영상 선별과 최종 승인에 관한 운영 방향은 [콘텐츠 수집·편집·배포 운영 규칙](docs/CONTENT_WORKFLOW.md)에 정리되어 있습니다. 현재는 목록 관리, 자유 작업 라벨, AI 수집·작성 요청·회수와 로컬 공개 릴리스 생성까지 구현되어 있습니다. 운영 서버 배포는 로컬 공개와 분리하며, 후속 배포 작업의 조건은 [배포 연결 시 확인할 사항](docs/DEPLOYMENT_NOTES.md)에 정리했습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

전체 데이터·타입·프로덕션 빌드 검사는 다음 명령으로 실행합니다.

```bash
npm run check
```

## 콘텐츠 Admin과 AI 수집·작성

Admin은 다음 명령으로 실행합니다.

```bash
node scripts/content-admin-server.mjs
```

이 Mac에서는 <http://127.0.0.1:4175>로 접속합니다. 같은 내부망의 다른 장치에서는 실행 로그에 표시되는 LAN 주소로 접속할 수 있습니다. 기본적으로 모든 인터페이스에서 요청을 받지만 루프백과 사설망 주소만 허용합니다. 특정 인터페이스에만 바인딩하려면 `CONTENT_ADMIN_HOST` 환경 변수를 사용합니다.

Admin은 토스형 데이터 관리 콘솔로 구성되어 있습니다. `작업 순서`에서는 고연전 필수 암기·라이벌전·추억곡·원곡 계보·야구장 연결 순으로 작업을 정렬하고, 곡마다 ChatGPT 작업과 사용자 확인 작업을 나눠 보여 줍니다. `ChatGPT 요청 복사`로 현재 상태와 빈 항목이 포함된 한 곡 단위 요청문을 복사할 수 있고, 이벤트 큐에 있지만 아직 Admin에 없는 곡도 빠뜨리지 않고 표시합니다. 대학·구단과 응원가는 각각 검색·필터링하고 새 행 추가, 전체 필드 수정과 삭제를 할 수 있습니다. 구단 삭제 시 연결된 응원가가 있으면 명시적으로 일괄 삭제를 확인합니다. 응원가에는 조사 범위, 자유 작업 라벨, 설명 본문과 `[* 주석 또는 URL]`, 가사, 간단 정보 3개, 원곡 관계와 사용자 선별 영상 5개를 저장할 수 있습니다. 작업 라벨과 최신 AI 작업 상태로 목록을 필터링할 수 있으며 권리 확인 기록은 저장하지 않습니다. 목록에서 여러 곡을 체크하면 AI 수집·작성 요청, 작업 라벨 변경과 조사 범위 변경을 한 번에 실행할 수 있습니다. 우측 편집 패널의 확장 버튼을 누르면 같은 입력 내용을 중앙의 큰 팝업으로 전환합니다.

응원가 편집은 `설명 / 가사 / 영상 / 기본·관리` 탭으로 나뉩니다. 외부에서 다듬은 설명과 직접 확보한 가사를 붙여 넣고 문단·주석·가사 접기를 미리 볼 수 있습니다. 영상은 대표 영상 하나를 기본으로 추가 영상 네 개까지 선택해서 등록합니다. YouTube URL을 붙여 넣으면 제목·채널명과 썸네일을 불러오고, 직접 재생해 확인할 수 있습니다. 정보 조회가 실패해도 URL과 수동 입력으로 저장할 수 있습니다.

`저장하고 계속`은 현재 곡과 탭을 유지하며, `저장 후 다음 곡`은 현재 필터 목록의 다음 곡을 엽니다. 미저장 입력은 같은 브라우저에 임시 보관되어 다시 열 때 복원할 수 있습니다. 다른 곳에서 곡이 수정된 경우 이전 임시본은 읽고 복사할 수 있지만 최신 저장본을 자동으로 덮어쓰지 않습니다. 브라우저 임시 보관은 Admin 저장·사이트 공개와 별개입니다.

Admin에서 AI 수집·작성을 요청하면 Naru/Codex가 같은 저장소에서 현재 본문을 포함한 작업을 가져옵니다. AI는 흥미로운 소재 약 10개를 목표로 조사·작성·자체 검토를 반복하고, 보강한 공개 본문과 작업 기록을 JSON으로 돌려줍니다.

```bash
node scripts/content-workflow-cli.mjs next
node scripts/content-workflow-cli.mjs submit <job-id> <result-json-file>
node scripts/content-workflow-cli.mjs status
```

사용자 편집본과 AI 작업 기록은 `content/editorial/songs/<song-id>/`에 버전 관리되고, 로컬 작업 큐는 Git에 포함되지 않는 `.local/`에 저장됩니다. AI는 사용자가 요청한 작업에서만 새 본문 revision을 만들고 `수집 완료` 라벨까지만 붙입니다. 사용자는 결과를 고치거나 다시 작업 목록에 올리고, 충분하면 직접 승인합니다.

Admin에서 작업 라벨을 `공개`로 바꾸거나 편집 화면의 `사이트에 공개`를 누르면 현재 revision으로 `content/releases/`의 불변 스냅샷을 만들고 `src/data/generated/catalog.json`을 갱신합니다. 로컬 Vite 테스트 서버의 아카이브와 고연전 이벤트 페이지는 이 생성 카탈로그만 읽습니다. 공개 후 다시 편집한 내용은 자동 노출하지 않고 `재공개 필요`로 표시합니다. 이 동작은 운영 배포를 실행하지 않습니다.

```bash
npm run content:release
npm run content:publish -- <song-id> [song-id...]
npm run content:unpublish -- <song-id> [song-id...]
npm run content:validate
```

## 릴스·쇼츠 제작

Admin의 `릴스 제작`에서는 영상 URL과 원본 기준 시작·종료 구간을 클립 순서대로 입력할 수 있습니다. 각 클립에는 연결 응원가, 장면 제목, 재생 내내 보일 출처 문구, 한 줄씩 전환될 응원가 가사와 세로 크롭 중심을 저장합니다. 저장 후 `세로 영상 만들기`를 누르면 URL의 지정 구간만 받아 1080×1920 H.264/AAC MP4로 합성합니다.

렌더에는 `ffmpeg`와 `yt-dlp`가 필요합니다. 현재 개발 Mac에는 설치되어 있습니다. CLI로 직접 렌더하려면 다음 명령을 사용합니다.

```bash
npm run reels:render -- <reel-id>
```

기획 데이터는 `content/production/reels/`에 버전 관리되고, 다운로드 캐시와 결과 MP4는 Git에서 제외되는 `.local/`에 저장됩니다. 자세한 제작 규칙은 [릴스·쇼츠 제작 도구](docs/REELS_WORKFLOW.md)를 참고하세요.

## 데이터 구조

- `data/teams.json`: 구단과 학교
- `data/original-songs.json`: 원곡
- `data/cheer-songs.json`: 응원가
- `data/media.json`: 응원가에 연결된 YouTube 영상
- `src/data/catalog.ts`: 정본 데이터를 연결해 UI용 데이터로 변환
- `scripts/validate-data.mjs`: 필수값, 중복 ID, 연결 관계와 출처 검사
- `content/editorial/songs/`: 사용자 편집본과 AI 작업 기록
- `content/releases/`: 사용자가 로컬 사이트에 공개한 불변 릴리스
- `src/data/generated/catalog.json`: 현재 로컬 사이트가 읽는 공개 카탈로그
- `src/events/korea-yonsei-games-2026/eventCuration.json`: 고연전 이벤트 큐와 Admin 작업 우선순위 기준
- `content/production/reels/`: 릴스·쇼츠 기획 데이터
- `admin/`: 로컬 콘텐츠 편집 화면

현재 필드와 입력 순서는 [data/README.md](data/README.md)를 참고하세요. 차기 편집 데이터와 배포 흐름은 [콘텐츠 수집·편집·배포 운영 규칙](docs/CONTENT_WORKFLOW.md)을 따릅니다.

## 주요 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run data:validate` | 데이터 무결성 검사 |
| `npm run content:validate` | 현재 공개 릴리스와 생성 카탈로그 검사 |
| `npm run content:publish -- <song-id>` | 현재 revision을 새 로컬 공개 릴리스에 반영 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run build` | 프로덕션 빌드 |
| `npm run check` | 위 세 검사를 한 번에 실행 |
| `npm run reels:render -- <reel-id>` | 저장된 릴스 프로젝트를 MP4로 렌더 |

원본 Figma 파일: <https://www.figma.com/design/tBEvz22FWSKS0OngtoO2Um/%EC%A0%9C%EB%AA%A9-%EC%97%86%EC%9D%8C>
