# 응원가 아카이브

대학과 야구 응원가를 원곡별, 구단·학교별, 연도별로 탐색하는 React + Vite 사이트입니다.

현재 정본에는 사용자가 검수한 응원가 23곡만 포함되어 있습니다. 앞으로도 사용자가 최종 검수·승인한 항목만 사이트에 추가합니다.

응원가 목록, 반복형 AI 수집·작성, 사용자 검수, 영상 선별과 최종 승인에 관한 운영 방향은 [콘텐츠 수집·편집·배포 운영 규칙](docs/CONTENT_WORKFLOW.md)에 정리되어 있습니다. 현재는 목록 관리, 자유 작업 라벨, AI 수집·작성 요청·회수까지 구현되어 있고 최종 배포 데이터 생성은 다음 단계입니다.

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

Admin은 토스형 데이터 관리 콘솔로 구성되어 있습니다. 대학·구단과 응원가를 각각 검색·필터링하고 새 행 추가, 전체 필드 수정과 삭제를 할 수 있습니다. 구단 삭제 시 연결된 응원가가 있으면 명시적으로 일괄 삭제를 확인합니다. 응원가에는 조사 범위, 자유 작업 라벨, 설명 본문과 `[* 주석 또는 URL]`, 가사, 간단 정보 3개, 원곡 관계와 사용자 선별 영상 5개를 저장할 수 있습니다. 작업 라벨과 최신 AI 작업 상태로 목록을 필터링할 수 있으며 권리 확인 기록은 저장하지 않습니다. 목록에서 여러 곡을 체크하면 AI 수집·작성 요청, 작업 라벨 변경과 조사 범위 변경을 한 번에 실행할 수 있습니다. 우측 편집 패널의 확장 버튼을 누르면 같은 입력 내용을 중앙의 큰 팝업으로 전환합니다.

Admin에서 AI 수집·작성을 요청하면 Naru/Codex가 같은 저장소에서 현재 본문을 포함한 작업을 가져옵니다. AI는 흥미로운 소재 약 10개를 목표로 조사·작성·자체 검토를 반복하고, 보강한 공개 본문과 작업 기록을 JSON으로 돌려줍니다.

```bash
node scripts/content-workflow-cli.mjs next
node scripts/content-workflow-cli.mjs submit <job-id> <result-json-file>
node scripts/content-workflow-cli.mjs status
```

사용자 편집본과 AI 작업 기록은 `content/editorial/songs/<song-id>/`에 버전 관리되고, 로컬 작업 큐는 Git에 포함되지 않는 `.local/`에 저장됩니다. AI는 사용자가 요청한 작업에서만 새 본문 revision을 만들고 `수집 완료` 라벨까지만 붙입니다. 사용자는 결과를 고치거나 다시 작업 목록에 올리고, 충분하면 직접 승인합니다.

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
- `content/production/reels/`: 릴스·쇼츠 기획 데이터
- `admin/`: 로컬 콘텐츠 편집 화면

현재 필드와 입력 순서는 [data/README.md](data/README.md)를 참고하세요. 차기 편집 데이터와 배포 흐름은 [콘텐츠 수집·편집·배포 운영 규칙](docs/CONTENT_WORKFLOW.md)을 따릅니다.

## 주요 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run data:validate` | 데이터 무결성 검사 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run build` | 프로덕션 빌드 |
| `npm run check` | 위 세 검사를 한 번에 실행 |
| `npm run reels:render -- <reel-id>` | 저장된 릴스 프로젝트를 MP4로 렌더 |

원본 Figma 파일: <https://www.figma.com/design/tBEvz22FWSKS0OngtoO2Um/%EC%A0%9C%EB%AA%A9-%EC%97%86%EC%9D%8C>
