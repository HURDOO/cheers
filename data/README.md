# 응원가 데이터 관리

앱이 사용하는 정본(canonical) 데이터는 이 폴더의 JSON 세 파일입니다.

- `teams.json`: 구단·학교 이름, 유형, 지역, 대표 색상
- `original-songs.json`: 원곡 정보
- `cheer-songs.json`: 응원가와 팀·원곡의 연결, 가사 미리보기, 출처, 오디오

현재 항목은 Figma 시안에서 옮긴 예시이며 사실 검증을 거치지 않았습니다. 모두 `status: "draft"`로 두었고, 실제 서비스에 공개할 데이터는 신뢰할 수 있는 `sources`를 추가한 뒤 `verified`로 바꿔야 합니다.

## 새 응원가 추가 순서

1. 팀이 없으면 `teams.json`에 먼저 추가합니다.
2. 원곡이 없으면 `original-songs.json`에 추가합니다.
3. `cheer-songs.json`에 `teamId`와 `originalSongId`를 연결해 추가합니다.
4. `npm run data:validate`로 중복 ID, 필수값, 연결 관계, URL을 검사합니다.
5. `npm run build`로 화면 빌드를 확인합니다.

ID는 `lotte-giants`처럼 영문 소문자·숫자·하이픈만 사용합니다. `lyrics`의 첫 두 줄이 카드와 상세 화면에 표시됩니다. `durationSeconds`는 초 단위 정수입니다.

```json
{
  "id": "cheer-song-id",
  "title": "응원가 제목",
  "teamId": "team-id",
  "originalSongId": "original-song-id",
  "year": 2026,
  "durationSeconds": 120,
  "lyrics": ["첫 번째 미리보기", "두 번째 미리보기"],
  "description": "확인된 설명",
  "status": "draft",
  "sources": [
    { "label": "공식 소개", "url": "https://example.com/source" }
  ],
  "audio": {
    "url": "/audio/example.mp3",
    "credit": "권리자 또는 제공자",
    "licenseUrl": "https://example.com/license"
  }
}
```

`audio`는 선택 사항입니다. 로컬 파일은 `public/audio/`에 두고 `/audio/파일명.mp3`로 지정할 수 있습니다. 저작권자에게 사용 허가를 받은 오디오만 저장하거나 연결하세요.

