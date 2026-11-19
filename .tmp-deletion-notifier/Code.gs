const DELETE_NOTIFIER = Object.freeze({
  projectId: 'flashcars-294bc',
  collection: 'accountDeletionRequests',
  recipient: 'hijmjo@gmail.com',
  handler: 'sendPendingAccountDeletionEmails',
  timezone: 'Asia/Seoul',
});

/**
 * Run once after copying this project into Google Apps Script.
 * It replaces only this notifier's triggers and schedules checks near 09:00 and 21:00 KST.
 */
function installAccountDeletionEmailTriggers() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === DELETE_NOTIFIER.handler)
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  [9, 21].forEach((hour) => {
    ScriptApp.newTrigger(DELETE_NOTIFIER.handler)
      .timeBased()
      .atHour(hour)
      .nearMinute(0)
      .everyDays(1)
      .inTimezone(DELETE_NOTIFIER.timezone)
      .create();
  });
}

/**
 * Sends one email per unnotified deletion request and marks successful sends in Firestore.
 * A script lock prevents the two scheduled executions from overlapping.
 */
function sendPendingAccountDeletionEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;

  try {
    const documents = listDeletionRequests_();
    documents
      .filter(isPendingDeletionRequest_)
      .forEach((document) => sendDeletionEmail_(document));
  } finally {
    lock.releaseLock();
  }
}

function listDeletionRequests_() {
  const documents = [];
  let pageToken = '';

  do {
    const query = ['pageSize=100'];
    if (pageToken) query.push(`pageToken=${encodeURIComponent(pageToken)}`);
    const url = `${firestoreCollectionUrl_()}?${query.join('&')}`;
    const payload = fetchFirestoreJson_(url);
    documents.push(...(payload.documents || []));
    pageToken = payload.nextPageToken || '';
  } while (pageToken);

  return documents;
}

function isPendingDeletionRequest_(document) {
  const fields = document.fields || {};
  return fields.status?.stringValue === 'requested' && !fields.emailNotifiedAt;
}

function sendDeletionEmail_(document) {
  const fields = document.fields || {};
  const requesterEmail = fields.requesterEmail?.stringValue || '이메일 확인 불가';
  const requestedAt = fields.requestedAt?.timestampValue || '요청 시각 확인 불가';

  MailApp.sendEmail({
    to: DELETE_NOTIFIER.recipient,
    subject: '[붕억빵] 계정 삭제 요청',
    body: [
      '붕억빵 계정 삭제 요청이 접수되었습니다.',
      '',
      `요청자: ${requesterEmail}`,
      `요청 시각: ${requestedAt}`,
      '',
      'Firebase Authentication 계정과 해당 사용자의 Firestore 학습 기록을 확인한 뒤 삭제해주세요.',
      '삭제 전 요청자 이메일과 Firestore 요청 문서가 일치하는지 다시 확인해주세요.',
    ].join('\n'),
    name: '붕억빵',
  });

  markEmailSent_(document);
}

function markEmailSent_(document) {
  const updateTime = encodeURIComponent(document.updateTime);
  const url = `https://firestore.googleapis.com/v1/${document.name}`
    + `?updateMask.fieldPaths=emailNotifiedAt&currentDocument.updateTime=${updateTime}`;
  const response = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: firestoreHeaders_(),
    payload: JSON.stringify({
      name: document.name,
      fields: {emailNotifiedAt: {timestampValue: new Date().toISOString()}},
    }),
    muteHttpExceptions: true,
  });
  assertSuccessful_(response, url);
}

function firestoreCollectionUrl_() {
  return `https://firestore.googleapis.com/v1/projects/${DELETE_NOTIFIER.projectId}`
    + `/databases/(default)/documents/${DELETE_NOTIFIER.collection}`;
}

function fetchFirestoreJson_(url) {
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: firestoreHeaders_(),
    muteHttpExceptions: true,
  });
  assertSuccessful_(response, url);
  return JSON.parse(response.getContentText() || '{}');
}

function firestoreHeaders_() {
  return {Authorization: `Bearer ${ScriptApp.getOAuthToken()}`};
}

function assertSuccessful_(response, url) {
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Firestore 요청 실패 (${status}) ${url}: ${response.getContentText()}`);
  }
}
