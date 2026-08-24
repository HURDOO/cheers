# 응원가 아카이브

대학과 야구 응원가를 원곡별, 구단·학교별, 연도별로 탐색하는 React + Vite 사이트입니다.

현재 정본에는 사용자가 검수한 응원가 23곡만 포함되어 있습니다. 앞으로도 사용자가 최종 검수·승인한 항목만 사이트에 추가합니다.

응원가 목록, AI 조사, 사용자 작성, 영상 선별과 최종 승인에 관한 운영 방향은 [콘텐츠 수집·편집·배포 운영 규칙](docs/CONTENT_WORKFLOW.md)에 정리되어 있습니다. 현재는 목록 관리, 사용자 편집, AI 조사 요청·회수까지 구현되어 있고 최종 배포 데이터 생성은 다음 단계입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

전체 데이터·타입·프로덕션 빌드 검사는 다음 명령으로 실행합니다.

```bash
npm run check
```

## 콘텐츠 Admin과 AI 조사

Admin은 다음 명령으로 실행합니다.

```bash
node scripts/content-admin-server.mjs
```

이 Mac에서는 <http://127.0.0.1:4175>로 접속합니다. 같은 내부망의 다른 장치에서는 실행 로그에 표시되는 LAN 주소로 접속할 수 있습니다. 기본적으로 모든 인터페이스에서 요청을 받지만 루프백과 사설망 주소만 허용합니다. 특정 인터페이스에만 바인딩하려면 `CONTENT_ADMIN_HOST` 환경 변수를 사용합니다.

Admin에서는 대학·구단별 목록을 조사 대상, 사용자 보류, AI 추가 발견으로 나누고, 설명 본문과 `[* 주석 또는 URL]`, 가사, 간단 정보 3개, 사용자 선별 영상 5개를 편집할 수 있습니다. 권리 확인 기록은 저장하지 않습니다.

Admin에서 AI 조사를 요청하면 Naru/Codex가 같은 저장소에서 아래 명령으로 작업을 가져와 결과를 돌려줍니다.

```bash
node scripts/content-workflow-cli.mjs next
node scripts/content-workflow-cli.mjs submit <job-id> <markdown-file>
node scripts/content-workflow-cli.mjs status
```

사용자 편집본과 AI 조사 결과는 `content/editorial/songs/<song-id>/`에 버전 관리되고, 로컬 작업 큐는 Git에 포함되지 않는 `.local/`에 저장됩니다. AI 조사 결과는 사용자 본문을 자동으로 덮어쓰지 않습니다.

## 데이터 구조

- `data/teams.json`: 구단과 학교
- `data/original-songs.json`: 원곡
- `data/cheer-songs.json`: 응원가
- `data/media.json`: 응원가에 연결된 YouTube 영상
- `src/data/catalog.ts`: 정본 데이터를 연결해 UI용 데이터로 변환
- `scripts/validate-data.mjs`: 필수값, 중복 ID, 연결 관계와 출처 검사
- `content/editorial/songs/`: 사용자 편집본과 AI 조사 결과
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

원본 Figma 파일: <https://www.figma.com/design/tBEvz22FWSKS0OngtoO2Um/%EC%A0%9C%EB%AA%A9-%EC%97%86%EC%9D%8C>
