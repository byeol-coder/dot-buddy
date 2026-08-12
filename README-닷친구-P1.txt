[닷친구 · DOT BUDDY — P1 DTMS 플레이어]  2026-08-12
음성 백엔드: TW_TTS (슈퍼닷 연동 전 단계)

■ 이번 P1 범위
  DTMS 파일을 읽어 27페이지를 그대로 재생하는 플레이어.
  상호작용(정답 판정)·보상은 P2/P3 범위이며 이번에는 없습니다.
  · DTMS 파싱 (items[] → page/graphic/text/audio)
  · 그래픽 600hex → displayGraphicData 그대로 전달 (인코딩 불변식 유지)
  · 한 줄 점자 칸 20셀 단위 페이지 분할 → displayTextData
  · text.plain → 음성 재생 (Voice 어댑터 경유)
  · 60×40 핀 미리보기 (부모/교사용 화면)
  · 닷패드 키 연동

■ 파일 구성 (dotbuddy/)
  index.html
  content/01_intro.dtms          체험단 어린이 대상 닷패드 소개 (27페이지)
  dotpad-sdk/DotPadSDK-3.0.0.js
  tts-local.js                   TW_TTS 로컬 사본 (호스트에 /tts.js 없을 때 폴백)
  README-닷친구-P1.txt

  ※ dot-games-host 에 얹으면 루트의 /tts.js 가 먼저 로드되고 tts-local.js 는
    이미 window.TW_TTS 가 있으면 스스로 return 하므로 중복 문제 없습니다.

■ 조작
  키보드 : → / Space / Enter 다음 · ← 이전 · ↓ ↑ 점자 줄 넘김
           R 다시 듣기 · H 도움말 · N 처음부터
  닷패드 : 네 번째 길쭉한 동그라미 버튼(F4) 다음   ← 원본 13페이지가 가르치는 그대로
           첫 번째 동그라미 버튼(F1) 이전
           양쪽 끝 세모 버튼(패닝 좌/우) 한 줄 점자 칸 줄 넘김  ← 원본 16~17페이지 그대로
           패닝 동시누름 도움말 · F1 롱프레스 처음부터

  ★ 키 매핑을 콘텐츠가 가르치는 규약과 일치시켰습니다.
    아이가 13페이지에서 배운 동작이 플레이어 전체에서 그대로 통합니다.

■ 음성 어댑터 (슈퍼닷 연동 지점)
  index.html 안의 Voice 객체가 유일한 음성 진입점입니다.
  상위 코드는 Voice.speak(text, {role, onEnd}) 만 호출합니다.

    Voice.speak(text, {role:'dotpad'|'system', onEnd})
    Voice.stop() / setEnabled(on) / setRate(r) / preload()

  슈퍼닷 연동 시 할 일:
    1) Voice.speak 안의 TW_TTS 호출부를 슈퍼닷 호출로 교체
    2) role 별 pitch 프리셋 적용 → 아래 '알려진 제약' 1번 해소
    3) 사전 합성 도입 시 pages[].audioFile 을 우선 재생하도록 분기 추가
       (DTMS audio.fileName 필드를 이미 파싱해 두었습니다. 현재는 전부 빈 값)

■ 알려진 제약 (설계상 의도된 것)
  1) 역할별 음색 구분 불가
     TW_TTS 서버 음성(구글)에는 pitch/rate 파라미터가 없습니다.
     그래서 system 채널은 짧은 이어콘을 먼저 울려 화자 전환을 알립니다.
     슈퍼닷 연동 시 pitch 프리셋으로 대체하세요.
  2) 점자 줄 넘김 시 해당 구간 평문 낭독 없음
     현재는 "2번째 줄이야, 모두 5줄 중에서" 처럼 줄 번호만 안내합니다.
     한글 점자 ↔ 평문 구간 매핑이 필요해 P2 과제로 넘겼습니다.
     원본 15페이지가 "지금 하는 말도 여기에 점자로 나오고 있어" 라고 하므로
     이 기능은 점자 학습 관점에서 반드시 채워야 합니다.
  3) 상호작용 없음
     20~23페이지가 "세모는 어디에 있을까?" 라고 묻지만 답을 받지 않습니다.
     interaction 필드 스펙은 설계서 v0.2 §2 참조. P2 범위입니다.

■ 검증 완료 사항
  · 27페이지 전부 graphic.data 길이 정확히 600hex — 패딩 보정 로직은 방어용
  · 한 줄 점자 칸 최대 12줄(240셀)까지 나옴 → 페이지 넘김 필수 확인
  · 점자 비트 순서 bit0=1점 … bit5=6점 으로 유니코드 변환 검증
    (1페이지 첫 줄이 "안녕! 내 이름은…" 의 한글 점자로 정상 디코딩됨)
  · 그래픽 디코딩 결과가 원본 촉각 이미지와 일치
    (5.dtm 동그라미, 4.dtm 세모, 7.dtm 채워진 세모, 8.dtm 분할 화면,
     2/3/4/15.dtm 4방 게임 — 전부 육안 확인)
  · JS 문법 검사 통과

■ 실행
  로컬:  npx serve .        또는  python3 -m http.server
         → http://localhost:3000/dotbuddy/index.html
  ※ file:// 로 열면 fetch 가 막힙니다. 그 경우 화면의 파일 선택으로 .dtms 를 직접 지정하세요.

  파라미터:  ?src=./content/02_xxx.dtms   다른 DTMS 재생
             ?embed=1                      임베드 모드
             ?lang=en                      영어 (P1은 UI만, 콘텐츠는 한국어)

■ 다음 단계 (P2)
  1) interaction 필드 스펙 확정 (설계서 v0.2 §2)
  2) 27페이지에 interaction 부여 — 20~23p quadrant-choice, 11p count,
     13/16/19p button-press, 2/6/10/15p yes-no
  3) 판정 → 피드백 음성 → 효과음 → 재시도 루프
  4) 점자 줄 ↔ 평문 구간 매핑

■ 인코딩/불변식
  EA · 600hex 그대로. displayGraphicData 에 DTMS 원본 문자열을 그대로 전달합니다.
  (디코딩은 화면 미리보기 용도로만 사용)
