# 응원가 정본 데이터

이 폴더에는 사용자가 최종 승인해 앱에 공개할 수 있는 정본(canonical) 데이터만 둡니다. 현재는 사용자가 검수한 응원가 23곡만 포함합니다.

> 이 문서는 현재 운영 중인 `schemaVersion: 1`을 설명합니다. 확정된 차기 운영 방향은 [콘텐츠 수집·편집·배포 운영 규칙](../docs/CONTENT_WORKFLOW.md)을 참고하세요. 차기 스키마에서는 TMI 출처를 선택적인 `[* ...]` 본문 주석으로 다루지만, 구현 전까지는 현행 검증기가 `verified` 레코드의 `sources`를 요구합니다.

- `teams.json`: 구단·학교 이름, 유형, 지역, 대표 색상
- `original-songs.json`: 원곡 정보
- `cheer-songs.json`: 응원가와 팀·원곡 계보, 도입 시점, 별칭, 사용 맥락과 출처
- `media.json`: 응원가에 연결할 YouTube 영상

## 응원가

`year`는 확정된 도입 연도만 저장합니다. 정확한 도입 연도가 불명확하면 `null`로 두고, 정렬용 `timelineYear`, 상태를 나타내는 `yearStatus`, 사용자에게 보여 줄 `yearLabel`을 함께 기록합니다.

`lyrics`는 카드용 문구가 아니라 게시 권리가 확인된 전체 가사를 줄 단위로 저장합니다. 아직 공개할 수 없는 경우 빈 배열을 사용하며, 연 사이를 띄우려면 빈 문자열을 넣을 수 있습니다.

카드 상단에 사용할 두 줄짜리 문구는 전체 가사와 분리해 `symbolicLines`에 저장합니다. 화면에 하드코딩하지 않고 반드시 정본 데이터에서 읽습니다.

```json
{
  "id": "cheer-song-id",
  "title": "응원가 제목",
  "aliases": ["통용 별칭"],
  "symbolicLines": ["첫 번째 상징문구", "두 번째 상징문구"],
  "teamId": "team-id",
  "originalSongId": "original-song-id",
  "secondaryOriginalSongIds": [],
  "sourceCheerSongId": "직접-차용한-응원가-id",
  "originType": "adaptation",
  "originNote": "직접 차용 응원가와 기반 원곡의 관계",
  "year": null,
  "timelineYear": 2020,
  "yearStatus": "earliest-documented",
  "yearLabel": "최초 확인 2020 · 공식 도입 연도 불명확",
  "chronologyNote": "연도 판단 근거와 불확실성",
  "lyrics": [],
  "description": "출처로 확인한 설명",
  "usageContext": "언제, 어떤 상황에서 쓰이는지",
  "status": "verified",
  "sources": [
    {
      "label": "공식 소개",
      "url": "https://example.com/source",
      "scope": "chronology"
    }
  ]
}
```

`yearStatus`는 `confirmed`, `earliest-documented`, `reported` 중 하나이고, `originType`은 `adaptation`, `arrangement`, `combined-adaptation`, `commissioned-original` 중 하나입니다. `sourceCheerSongId`와 `secondaryOriginalSongIds`는 해당 관계가 있을 때만 작성합니다. `sources[].scope`는 `title`, `origin`, `chronology`, `usage` 중 하나입니다.

전체 가사를 공개하기 전에는 정확한 출처뿐 아니라 게시 권한도 별도로 확인합니다. 권리가 불분명한 후보 가사는 정본에 저장하지 않습니다.

## YouTube 미디어

직접 음원 URL과 로컬 오디오 파일은 지원하지 않습니다. YouTube 영상 ID와 원본 URL을 `media.json`에 등록합니다. 공식 권리자·구단·학교 채널을 우선하고, 한 응원가에 여러 영상을 연결할 때 대표 영상 하나만 `preferred: true`로 지정합니다.

```json
{
  "id": "youtube-cheer-song-id",
  "cheerSongId": "cheer-song-id",
  "videoId": "YOUTUBE_ID",
  "title": "YouTube에 표시된 영상 제목",
  "channelName": "채널명",
  "channelType": "team-official",
  "role": "official-performance",
  "sourceUrl": "https://www.youtube.com/watch?v=YOUTUBE_ID",
  "preferred": true,
  "availability": "playable",
  "startSeconds": 0,
  "durationSeconds": 120,
  "checkedAt": "2026-08-07"
}
```

`role`은 `official-audio`, `official-performance`, `stadium-recording`, `reference` 중 하나이고, `channelType`은 `rights-holder`, `team-official`, `school-official`, `fan` 중 하나입니다.

## 반영 전 검사

1. `npm run data:validate`
2. `npm run typecheck`
3. `npm run build`

ID는 영문 소문자·숫자·하이픈만 사용합니다.
