# 응원가 아카이브

Figma Make 시안을 바탕으로 이어서 개발할 수 있게 정리한 React + Vite 프로젝트입니다. 응원가를 원곡별, 구단별, 연도별로 탐색할 수 있습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

전체 데이터·타입·프로덕션 빌드 검사는 다음 명령으로 실행합니다.

```bash
npm run check
```

## 데이터 추가

화면 데이터는 컴포넌트와 분리되어 있습니다.

- `data/teams.json`: 구단과 학교
- `data/original-songs.json`: 원곡
- `data/cheer-songs.json`: 응원가
- `src/data/catalog.ts`: 세 데이터를 연결해 UI용 데이터로 변환
- `scripts/validate-data.mjs`: 필수값, 중복 ID, 외래 ID, 출처와 오디오 URL 검사

구체적인 필드와 입력 순서는 [data/README.md](data/README.md)를 참고하세요.

> 현재 17곡은 Figma 시안에서 옮긴 검증 전 예시 데이터입니다. 실제 공개 전 반드시 사실 관계와 저작권을 확인하세요.

## 주요 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run data:validate` | 데이터 무결성 검사 |
| `npm run typecheck` | TypeScript 검사 |
| `npm run build` | 프로덕션 빌드 |
| `npm run check` | 위 세 검사를 한 번에 실행 |

원본 Figma 파일: <https://www.figma.com/design/tBEvz22FWSKS0OngtoO2Um/%EC%A0%9C%EB%AA%A9-%EC%97%86%EC%9D%8C>

