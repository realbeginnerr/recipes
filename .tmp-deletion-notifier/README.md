# 계정 삭제 요청 이메일 알림

Firebase Blaze 요금제나 유료 이메일 서비스 없이 Google Apps Script로 Firestore의 미처리 계정 삭제 요청을 확인한다.

## 실행 일정

- 매일 오전 9시 근처, 오후 9시 근처(Asia/Seoul)
- Apps Script의 `nearMinute(0)`은 지정 시각 전후 약 15분 범위에서 실행될 수 있다.
- 메일 전송에 성공한 요청은 `emailNotifiedAt`을 기록하므로 다음 실행에서 제외한다.

## 최초 1회 설정

1. `hijmjo@gmail.com`으로 [Google Apps Script](https://script.google.com/)를 열고 **새 프로젝트**를 만든다.
2. 프로젝트 이름을 `붕억빵 계정 삭제 알림`으로 지정한다.
3. `Code.gs`의 기본 내용을 이 폴더의 `Code.gs`로 교체한다.
4. 왼쪽 **프로젝트 설정**에서 **appsscript.json 매니페스트 파일을 편집기에 표시**를 켠다.
5. 나타난 `appsscript.json`을 이 폴더의 파일 내용으로 교체한다.
6. **프로젝트 설정 → Google Cloud Platform(GCP) 프로젝트 → 프로젝트 변경**에서 Firebase 프로젝트 번호 `1019849659468`을 입력한다. 프로젝트 ID가 아니라 숫자 프로젝트 번호다.
7. 편집기 상단 함수 목록에서 `installAccountDeletionEmailTriggers`를 선택하고 **실행**한다.
8. `hijmjo@gmail.com` 계정으로 Firestore 접근·외부 요청·메일 전송 권한을 승인한다.
9. 왼쪽 **트리거**에서 `sendPendingAccountDeletionEmails`가 매일 오전 9시와 오후 9시 일정으로 두 개 생성됐는지 확인한다.

## 최초 검증

1. Firebase Console → **Firestore Database → 데이터 → `accountDeletionRequests`**에서 테스트 요청 문서 하나를 확인한다.
2. Apps Script 함수 목록에서 `sendPendingAccountDeletionEmails`를 한 번 수동 실행한다.
3. `hijmjo@gmail.com` 받은편지함에 `[붕억빵] 계정 삭제 요청` 메일이 왔는지 확인한다.
4. 같은 Firestore 문서에 `emailNotifiedAt`이 추가됐는지 확인한다.
5. 같은 함수를 다시 실행했을 때 같은 요청의 메일이 중복 발송되지 않는지 확인한다.

## 보안 원칙

- 서비스 계정 키, Gmail 비밀번호, 앱 비밀번호를 코드에 저장하지 않는다.
- 수신자는 Firestore 문서의 값을 신뢰하지 않고 코드의 `hijmjo@gmail.com`으로 고정한다.
- Apps Script 프로젝트는 본인만 접근할 수 있도록 공유하지 않는다.
- 이 자동화는 이메일 알림만 보낸다. Firebase Authentication 계정과 학습 기록 삭제는 관리자가 요청 내용을 확인한 뒤 직접 처리한다.
