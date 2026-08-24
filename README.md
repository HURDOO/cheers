# 응원가 아카이브

대학과 야구 응원가를 원곡별, 구단·학교별, 연도별로 탐색하는 React + Vite 사이트입니다.

현재 정본에는 사용자가 검수한 응원가 23곡만 포함되어 있습니다. 앞으로도 사용자가 최종 검수·승인한 항목만 사이트에 추가합니다.

응원가 목록, AI 조사, 사용자 작성, 영상 선별과 최종 승인에 관한 다음 운영 방향은 [콘텐츠 수집·편집·배포 운영 규칙](docs/CONTENT_WORKFLOW.md)에 정리되어 있습니다. 이 문서는 확정된 차기 방향이며, 현행 데이터 스키마와 Admin에는 아직 구현되지 않았습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

전체 데이터·타입·프로덕션 빌드 검사는 다음 명령으로 실행합니다.

```bash
npm run check
```

## 데이터 구조

- `data/teams.json`: 구단과 학교
- `data/original-songs.json`: 원곡
- `data/cheer-songs.json`: 응원가
- `data/media.json`: 응원가에 연결된 YouTube 영상
- `src/data/catalog.ts`: 정본 데이터를 연결해 UI용 데이터로 변환
- `scripts/validate-data.mjs`: 필수값, 중복 ID, 연결 관계와 출처 검사

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
