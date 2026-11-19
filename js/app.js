/* =========================================================
   모니모 시니어 — 화면 흐름 · 접근성 · AI 음성 도우미
   화면은 피그마 기본형/고대비형 시안을 그대로 따라요.
   (시안에 없는 것: 처음 나이대 고르기 화면, AI 도우미 버튼)
========================================================= */
(function () {
'use strict';

/* ---------------- 아이콘 ---------------- */
function svg(d, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>'; }
var I = {
  back: svg('<path d="M15 18l-6-6 6-6"/>', 2.2),
  chev: svg('<path d="M9 18l6-6-6-6"/>', 2.2),
  spk: svg('<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>', 2),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 2.4),
  chk: function (w) { return svg('<path d="M20 6 9 17l-5-5"/>', w || 2.6); },
  arrow: svg('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>', 2.4),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 2.4),
  cam: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', 2),
  mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>', 2),
  warn: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>', 2),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 2)
};
function LOGO() { return '<svg viewBox="12 20 96 90" aria-hidden="true" focusable="false"><path d="M22 100V66A18 18 0 0 1 58 66V100M58 100V50A20 20 0 0 1 98 50V100" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

/* ---------------- 데이터 (모두 예시) ---------------- */
function day0(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
var TODAY = day0(new Date());
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return day0(x); }
var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function md(d) { return (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; }
function ymdDot(d) { return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0'); }
function diffDays(d) { return Math.round((TODAY - day0(d)) / 86400000); }
function relWord(d) { var n = diffDays(d); return n === 0 ? '오늘' : n === 1 ? '어제' : n === 2 ? '그저께' : WEEK[d.getDay()] + '요일'; }
function ro(w) { var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return '로'; var j = (c - 0xAC00) % 28; return j && j !== 8 ? '으로' : '로'; }
function josa(w, a, b) { var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return b; return (c - 0xAC00) % 28 ? a : b; }

var RECENT = { id: 'recent', name: '튼튼정형외과', addr: '서울 강남구 영동대로 173', meta: '지난달 방문' };
var HOSPITALS = ['튼튼정형외과', '바른내과의원', '맑은눈안과의원', '하얀이치과의원', '새봄한의원', '고운피부과의원', '튼튼소아청소년과'];
var DEPTS = ['내과', '정형외과', '치과', '안과', '한의원', '피부과', '기타'];
var REASONS = [{ v: '질병', d: '감기, 배탈, 통증 등' }, { v: '사고', d: '넘어짐, 부딪힘 등' }, { v: '검진', d: '건강검진, 정밀검사' }];
var BANK = { name: '신한은행', no: '****-1234', say: '신한은행, 끝자리 1234' };
var AGES = [{ v: 'a1', l: '20~40대', f: 'normal' }, { v: 'a2', l: '50대', f: 'large' }, { v: 'a3', l: '60대', f: 'large' }, { v: 'a4', l: '70대 이상', f: 'xlarge' }];
var FONT = { normal: '보통', large: '크게', xlarge: '아주 크게' };
var THEME = { 'default': '기본', hc: '고대비' };

/* ---------------- 상태 ---------------- */
function freshClaim() { return { consent: false, who: null, reason: null, dept: null, dateKind: null, date: null, hosp: null, photo: false, account: null }; }
var S = {
  view: 'age', age: null, font: 'normal', theme: 'default', voice: false, sr: false, curtain: false,
  ai: false, st: 0, cand: null, misses: 0, silent: 0,
  c: freshClaim(), draft: 0, done: null, claimNo: '', settingsBack: 'home', editing: false,
  week: null, shot: null, blurKind: 'blur', writing: false, listeningHosp: false
};

var device = document.getElementById('device'), scroller = document.getElementById('scroller'), scr = document.getElementById('screen');
var fab = document.getElementById('fab'), aiEl = document.getElementById('ai'), aiLog = document.getElementById('ai-log'), aiChips = document.getElementById('ai-chips');
var aiStatus = document.getElementById('ai-status'), micBtn = document.getElementById('mic'), micTxt = document.getElementById('mic-txt'), aiWarn = document.getElementById('ai-warn');
var live = document.getElementById('live'), capEl = document.getElementById('cap');

/* ---------------- 말하기 · 자막 ---------------- */
Voice.onCaption = function (src, text) {
  if (!capEl) return;
  var cls = src === '스크린리더' ? 'src-sr' : src === 'AI 도우미' ? 'src-ai' : src === '내 말' ? 'src-me' : '';
  capEl.innerHTML = '<span class="src ' + cls + '">' + esc(src) + '</span><p class="txt"></p>';
  capEl.querySelector('.txt').textContent = text;
};
function say(text, src, onEnd) { return Voice.speak(text, src, onEnd); }
function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 80); }
var toastT = null;
function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3500); }
/** 화면 밖으로 알려야 할 말 — AI가 켜져 있으면 AI가, 아니면 소리 안내·스크린리더가 */
function tell(msg) { announce(msg); if (S.ai) aiSay(msg); else if (S.voice || S.sr) say(msg, S.sr ? '스크린리더' : '소리 안내'); }

/* ---------------- 공통 조각 ---------------- */
var PILL = '<button class="pill" data-act="settings" aria-label="보기·듣기 설정"><span aria-hidden="true"><small>가</small>가 보기</span></button>';
function stepTop() { return '<div class="top"><button class="icon-btn muted" data-act="prev" aria-label="이전 화면">' + I.back + '</button><div class="top-r">' + PILL + '<button class="textbtn" data-act="exit">나가기</button></div></div>'; }
function prog(n) {
  return '<div class="prog"><p class="n" aria-hidden="true"><b>' + n + '</b>/8단계</p><p class="saved">' + I.chk(2.4) + '자동 저장됨</p></div>' +
    '<div class="bar" role="progressbar" aria-label="진행 단계" aria-valuemin="1" aria-valuemax="8" aria-valuenow="' + n + '" aria-valuetext="8단계 중 ' + n + '단계"><span style="width:' + (n / 8 * 100) + '%"></span></div>';
}
function nav(label) { return '<div class="actions"><button class="secondary" data-act="prev">이전</button><button class="primary" data-act="next">' + (label || '다음') + '</button></div>'; }
function radio(name, id, value, label, checked, o) {
  o = o || {};
  var d = o.desc || o.meta;
  return '<label class="opt' + (o.left ? ' left' : '') + (o.cls ? ' ' + o.cls : '') + '" for="' + id + '"><input class="sr-only" type="radio" name="' + name + '" id="' + id + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + (d ? ' aria-describedby="' + id + '-d"' : '') + '>' +
    (o.lead || '') + '<span class="tx"><span class="t">' + label + '</span>' + (d ? '<span id="' + id + '-d">' + (o.desc ? '<span class="sub">' + o.desc + '</span>' : '') + (o.meta ? '<span class="meta">' + o.meta + '</span>' : '') + '</span>' : '') + '</span>' +
    (o.circle ? '<span class="circle" aria-hidden="true">' + I.chk(3) + '</span>' : '') + '</label>';
}
function fb(text) { return '<p class="fb" id="fb" role="status">' + (text ? esc(text) : '') + '</p>'; }
function setFb(text) { var f = document.getElementById('fb'); if (f) f.textContent = text; }

/* ---------------- 표시용 값 ---------------- */
function whoL() { return S.c.who === 'me' ? '나(홍길동)' : S.c.who === 'family' ? '가족' : '-'; }
function hospL() { return (S.c.hosp ? S.c.hosp.name : '-') + '/' + (S.c.date ? (S.c.date.getMonth() + 1) + '.' + S.c.date.getDate() : '-'); }
function docL() { return S.c.photo ? '영수증 사진 1장' : '없음'; }
function bankL() { return S.c.account === 'reg' ? BANK.name + ' ' + BANK.no : S.c.account === 'other' ? '다른 계좌' : '-'; }
function dateFb(d) { return md(d) + '(' + relWord(d) + ')'; }
function pickedFb(v) { return '‘' + v + '’' + josa(v, '을', '를') + ' 골랐어요'; }

/* =========================================================
   화면
========================================================= */
var V = {};

/* --- 처음: 나이대 (교수님 피드백으로 추가) --- */
V.age = { title: '나이대 고르기', actions: true,
  html: function () {
    var a = AGES.filter(function (x) { return x.v === S.age; })[0];
    return '<div class="top"></div><h1 tabindex="-1" id="q-age">나이대를 알려주세요</h1><p class="lead">보기 편한 글자 크기로 맞춰 드려요</p>' +
      '<fieldset aria-labelledby="q-age"><div class="opts">' + AGES.map(function (x, i) { return radio('age', 'age-' + i, x.v, x.l, S.age === x.v); }).join('') + '</div></fieldset>' +
      fb(a ? '‘' + a.l + '’로 했어요. 글자는 ‘' + FONT[a.f] + '’예요' : '') +
      '<div class="spacer"></div><div class="actions"><button class="primary" data-act="next">다음</button></div>';
  },
  say: function () { return '나이대를 알려주세요. 보기 편한 글자 크기로 맞춰 드려요. 20에서 40대, 50대, 60대, 70대 이상 중에 골라 주세요.'; }
};

/* --- 홈 --- */
V.home = { title: '홈', actions: false,
  html: function () {
    return '<div class="home-top"><span class="brand">' + LOGO() + '<span>모니모</span></span><button class="icon-btn" data-act="search" aria-label="검색" style="margin:0 -1rem 0 0">' + I.search + '</button></div>' +
      '<h1 class="sr-only" tabindex="-1">모니모 홈, 내 보험</h1>' +
      '<div class="tabs" role="tablist" aria-label="홈 메뉴">' +
      ['홈', '내 보험', '도움받기'].map(function (l, i) { return '<button class="tab" role="tab" id="tab-' + i + '" aria-selected="' + (i === 1) + '" tabindex="' + (i === 1 ? 0 : -1) + '" data-act="tab" data-i="' + i + '">' + l + '</button>'; }).join('') + '</div>' +
      '<div role="tabpanel" aria-labelledby="tab-1">' +
      (S.draft ? '<div class="resume"><div><p class="t">작성하던 청구가<br>있어요</p><p class="d">' + S.draft + '단계까지 저장됨</p></div><button data-act="resume" aria-label="작성하던 청구 이어서 하기, ' + S.draft + '단계까지 저장됨">이어서 하기</button></div>' : '') +
      '<button class="big blue" data-act="claim"><span class="t">보험금<br>청구하기</span><span class="d">병원비를 돌려받아요</span><span class="go" aria-hidden="true">' + I.arrow + '</span></button>' +
      '<button class="big gray" data-act="status"><span class="t">내 청구<br>확인하기</span><span class="d">진행 상황을 봐요</span><span class="go" aria-hidden="true">' + I.arrow + '</span></button>' +
      '<button class="rowbtn" data-act="consult"><span>보험 상담 · 가입 안내</span>' + I.chev + '</button></div>';
  },
  say: function () { return '모니모 홈, 내 보험이에요. ' + (S.draft ? '작성하던 청구가 ' + S.draft + '단계까지 저장돼 있어요. ' : '') + '보험금 청구하기, 내 청구 확인하기, 보험 상담 가입 안내가 있어요.'; }
};

/* --- 청구 안내 --- */
V.intro = { title: '보험금 청구 안내', actions: true,
  html: function () {
    return '<div class="top"><button class="icon-btn muted" data-act="go-home" aria-label="뒤로">' + I.back + '</button><div class="top-r">' + PILL + '</div></div>' +
      '<h1 tabindex="-1" class="intro-h1">보험금 청구,<br>이렇게 진행돼요</h1>' +
      '<div class="info">' + I.clock + '<div><p class="t">5분 정도 걸려요</p><p class="d">시간 제한은 없어요. 쉬었다 해도 저장돼요.</p></div></div>' +
      '<h2 class="label" data-rd>미리 준비해주세요</h2>' +
      '<ul class="prep"><li><strong>병원 영수증</strong><span>진료비 계산서·영수증</span></li><li><strong>진료비 세부내역서</strong><span>n만원이 넘으면 필요해요.</span></li><li><strong>보험금 받을 계좌</strong><span>등록된 계좌로 자동 입력돼요</span></li></ul>' +
      '<div class="spacer"></div><div class="actions col">' +
      '<button class="setting-card" data-act="settings"><span class="badge" aria-hidden="true">가가</span><span class="sc-txt"><span class="sc-t">보기·듣기 설정</span><span class="sc-d">글자 크기, 화면 색, 소리 안내</span></span>' + I.chev + '</button>' +
      '<button class="primary" data-act="start">청구 시작하기</button></div>';
  },
  say: function () { return '보험금 청구, 이렇게 진행돼요. 5분 정도 걸려요. 시간 제한은 없고, 쉬었다 해도 저장돼요. 미리 준비해 주세요. 병원 영수증, 진료비 세부내역서, 보험금 받을 계좌예요. 계좌는 등록된 계좌로 자동 입력돼요.'; }
};

/* --- 보기·듣기 설정 --- */
V.settings = { title: '보기·듣기 설정', actions: true,
  html: function () {
    var fromStart = S.settingsBack === 'intro' || S.settingsBack === 'home';
    return '<div class="top"><button class="icon-btn" data-act="settings-back" aria-label="뒤로">' + I.back + '</button><div class="top-r"><button class="textbtn" data-act="settings-back">나가기</button></div></div>' +
      '<h1 tabindex="-1" class="set-h1">보기·듣기 설정</h1>' +
      '<fieldset class="set-fs"><legend class="sec-label first">글자 크기</legend><div class="opts three">' +
      radio('font', 'f-n', 'normal', '보통', S.fontTouched && S.font === 'normal') + radio('font', 'f-l', 'large', '크게', S.font === 'large') + radio('font', 'f-x', 'xlarge', '아주 크게', S.font === 'xlarge') + '</div></fieldset>' +
      '<fieldset class="set-fs"><legend class="sec-label">화면 색</legend><div class="opts theme">' +
      radio('theme', 't-d', 'default', '기본', S.theme === 'default') + radio('theme', 't-h', 'hc', '고대비', S.theme === 'hc', { cls: 'hc-prev' }) + '</div></fieldset>' +
      '<p class="note">청구 중에도 상단 ‘보기’에서 설정할 수 있어요.</p>' +
      '<div class="spacer"></div><div class="actions"><button class="primary" data-act="settings-done">' + (fromStart ? '청구 시작하기' : '설정 완료') + '</button></div>';
  },
  say: function () { return '보기 듣기 설정이에요. 글자 크기는 지금 ' + FONT[S.font] + ', 화면 색은 ' + THEME[S.theme] + '이에요. 글자 크기는 보통, 크게, 아주 크게가 있고, 화면 색은 기본과 고대비가 있어요. 고대비는 검정 바탕에 흰 글자로 또렷하게 보여요.'; }
};

/* --- 1단계 동의 --- */
V.s1 = { title: '1단계 동의', step: 1, actions: true,
  html: function () {
    return stepTop() + prog(1) + '<h1 tabindex="-1">청구하려면<br>아래 내용에 동의가<br>필요해요</h1>' +
      '<ul class="checks"><li>' + I.chk() + '병원 기록을 보험금 심사에만 써요</li><li>' + I.chk() + '입력한 정보는 삼성화재만 봐요</li><li>' + I.chk() + '심사가 끝나면 안전하게 보관해요</li></ul>' +
      '<label class="consent" for="agree" id="consent"><input class="sr-only" type="checkbox" id="agree"' + (S.c.consent ? ' checked' : '') + '><span class="cbox">' + I.chk(3) + '</span><span>위 내용에 모두 동의합니다.</span></label>' +
      '<button class="link" data-act="details" aria-expanded="false" aria-controls="details">동의 항목 7개 자세히 보기</button>' +
      '<div id="details" class="details" hidden><ol><li>개인정보 수집·이용</li><li>건강 정보 처리</li><li>고유식별정보 처리</li><li>병원 진료 기록 확인</li><li>보험금 심사 목적 이용</li><li>심사 후 보관 기간</li><li>동의 철회 방법</li></ol></div>' +
      '<div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 1단계예요. 청구하려면 아래 내용에 동의가 필요해요. 병원 기록을 보험금 심사에만 써요. 입력한 정보는 삼성화재만 봐요. 심사가 끝나면 안전하게 보관해요.'; }
};

/* --- 2단계 누구 --- */
function whoDetail() {
  return S.c.who === 'me' ? '<div class="who-card"><dl><div class="row"><dt>이름</dt><dd>홍길동</dd></div><div class="row"><dt>생년월일</dt><dd>1962.04.18</dd></div><div class="row"><dt>연락처</dt><dd>010-1234-5678</dd></div></dl></div>' +
    '<p class="fb">' + I.chk(2.8) + '정보가 맞으면 다음을 눌러주세요</p>' : '';
}
V.s2 = { title: '2단계 누구의 병원비', step: 2, actions: true,
  html: function () {
    return stepTop() + prog(2) + '<h1 tabindex="-1" id="q2">누구의 병원비인가요?</h1>' +
      '<fieldset aria-labelledby="q2" id="fs"><div class="opts who">' + radio('who', 'who-me', 'me', '나 (본인)', S.c.who === 'me') + radio('who', 'who-fam', 'family', '가족', S.c.who === 'family') + '</div></fieldset>' +
      '<div id="who-detail">' + whoDetail() + '</div><div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 2단계예요. 누구의 병원비인가요? 나, 본인과 가족 중에 골라 주세요.' + (S.c.who === 'me' ? ' 이름 홍길동, 생년월일 1962년 4월 18일, 연락처 010 1234 5678이에요. 정보가 맞으면 다음을 눌러주세요.' : ''); }
};

/* --- 3단계 이유 --- */
V.s3 = { title: '3단계 병원에 간 이유', step: 3, actions: true,
  html: function () {
    return stepTop() + prog(3) + '<h1 tabindex="-1" id="q3">왜 병원에 가셨나요?</h1><p class="lead">하나만 골라주세요</p>' +
      '<fieldset aria-labelledby="q3" id="fs"><div class="opts one">' + REASONS.map(function (r, i) { return radio('reason', 'rs-' + i, r.v, r.v, S.c.reason === r.v, { left: true, desc: r.d, circle: true }); }).join('') + '</div></fieldset>' +
      fb(S.c.reason ? pickedFb(S.c.reason) : '') + '<div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 3단계예요. 왜 병원에 가셨나요? 하나만 골라주세요. 질병, 감기 배탈 통증 등. 사고, 넘어짐 부딪힘 등. 검진, 건강검진 정밀검사.'; }
};

/* --- 4단계 진료과 --- */
V.s4 = { title: '4단계 진료 과목', step: 4, actions: true,
  html: function () {
    return stepTop() + prog(4) + '<h1 tabindex="-1" id="q4">어떤 진료를 받으셨나요?</h1><p class="lead">영수증 맨 위에 적혀 있어요</p>' +
      '<fieldset aria-labelledby="q4" id="fs"><div class="opts">' + DEPTS.map(function (d, i) { return radio('dept', 'dp-' + i, d, d, S.c.dept === d); }).join('') + '</div></fieldset>' +
      fb(S.c.dept ? pickedFb(S.c.dept) : '') + '<div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 4단계예요. 어떤 진료를 받으셨나요? 영수증 맨 위에 적혀 있어요. 내과, 정형외과, 치과, 안과, 한의원, 피부과, 기타 중에 골라 주세요.'; }
};

/* --- 5단계 날짜 --- */
function weekOf(d) { return addDays(d, -d.getDay()); }
function calHtml() {
  var ws = S.week || weekOf(S.c.date || TODAY), mid = addDays(ws, 3), h = '';
  for (var i = 0; i < 7; i++) {
    var d = addDays(ws, i), sel = S.c.date && +S.c.date === +d;
    h += '<button class="day" id="day-' + i + '" data-act="pick-day" data-t="' + (+d) + '" aria-pressed="' + !!sel + '" aria-label="' + md(d) + ' ' + WEEK[d.getDay()] + '요일' + (+d === +TODAY ? ', 오늘' : '') + '"' + (d > TODAY ? ' disabled' : '') + '>' + d.getDate() + '</button>';
  }
  return '<p class="cal-m" id="cal-m">' + mid.getFullYear() + '년 ' + (mid.getMonth() + 1) + '월</p>' +
    '<div class="cal-grid" id="cal-grid" role="group" aria-labelledby="cal-m" aria-describedby="cal-help">' + WEEK.map(function (w) { return '<span class="dw" aria-hidden="true">' + w + '</span>'; }).join('') + h + '</div>' +
    '<span class="sr-only" id="cal-help">왼쪽 오른쪽으로 밀면 다른 주가 나와요.</span>';
}
V.s5 = { title: '5단계 진료 날짜', step: 5, actions: true,
  html: function () {
    var k = S.c.dateKind;
    return stepTop() + prog(5) + '<h1 tabindex="-1" id="q5">언제 병원에 가셨나요?</h1>' +
      '<fieldset aria-labelledby="q5" id="fs"><div class="opts">' + radio('dk', 'dk-0', 'today', '오늘', k === 'today') + radio('dk', 'dk-1', 'yday', '어제', k === 'yday') + radio('dk', 'dk-2', '2day', '그저께', k === '2day') + radio('dk', 'dk-3', 'other', '다른 날', k === 'other') + '</div></fieldset>' +
      '<div class="cal" id="cal">' + calHtml() + '</div>' +
      fb(S.c.date ? '‘' + dateFb(S.c.date) + '’로 했어요' : '') + '<div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 5단계예요. 언제 병원에 가셨나요? 오늘, 어제, 그저께, 다른 날 중에 골라 주세요. 다른 날은 아래 달력에서 날짜를 눌러 주세요.'; }
};
function setDate(d, kind) {
  d = day0(d);
  S.c.date = d; S.c.dateKind = kind || (diffDays(d) === 0 ? 'today' : diffDays(d) === 1 ? 'yday' : diffDays(d) === 2 ? '2day' : 'other');
  S.week = weekOf(d);
  if (S.view === 's5') {
    scr.querySelectorAll('input[name=dk]').forEach(function (r) { r.checked = r.value === S.c.dateKind; });
    document.getElementById('cal').innerHTML = calHtml();
    setFb('‘' + dateFb(d) + '’로 했어요');
  }
}
function shiftWeek(n) {
  var ws = S.week || weekOf(S.c.date || TODAY), nw = addDays(ws, n * 7);
  if (nw > TODAY) return;
  S.week = nw; document.getElementById('cal').innerHTML = calHtml();
  announce(document.getElementById('cal-m').textContent + ', ' + md(nw) + '부터 ' + md(addDays(nw, 6)) + '까지');
}

/* --- 6단계 병원 --- */
V.s6 = { title: '6단계 병원', step: 6, actions: true,
  html: function () {
    var h = S.c.hosp, custom = h && h.id !== 'recent';
    var metaOf = { photo: '영수증에서 찾았어요', voice: '말씀하신 병원', write: '직접 쓴 병원' };
    return stepTop() + prog(6) + '<div class="hosp"><h1 tabindex="-1" id="q6">어느 병원에 가셨나요?</h1><p class="lead">최근에 간 병원</p>' +
      '<fieldset aria-labelledby="q6" id="fs"><div class="opts one">' +
      (custom ? radio('hosp', 'hp-c', 'custom', esc(h.name), true, { left: true, desc: h.addr ? esc(h.addr) : '', meta: metaOf[h.src] }) : '') +
      radio('hosp', 'hp-r', 'recent', RECENT.name, !!h && h.id === 'recent', { left: true, desc: RECENT.addr, meta: RECENT.meta }) +
      '</div></fieldset>' +
      '<p class="methods-t">다른 병원이면 편한 방법을 고르세요</p>' +
      '<div class="methods"><button class="method" data-act="go-cam">' + I.cam + '영수증 사진 찍기</button>' +
      '<button class="method" id="m-speak" data-act="speak-hosp">' + I.mic + '<span id="m-speak-t">병원 이름 말하기</span></button>' +
      (S.writing ? '<div class="method">' + I.search + '<label class="sr-only" for="h-in">병원 이름 쓰기</label><input id="h-in" list="h-list" placeholder="병원 이름 쓰기" enterkeyhint="done" autocomplete="off"><button class="go-btn" data-act="write-ok">확인</button></div><datalist id="h-list">' + HOSPITALS.map(function (x) { return '<option value="' + x + '">'; }).join('') + '</datalist>'
        : '<button class="method" data-act="write-hosp">' + I.search + '병원 이름 쓰기</button>') +
      '</div></div><div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 6단계예요. 어느 병원에 가셨나요? 최근에 간 병원은 튼튼정형외과, 서울 강남구 영동대로 173이에요. 다른 병원이면 영수증 사진 찍기, 병원 이름 말하기, 병원 이름 쓰기 중에 편한 방법을 고르세요.'; }
};
V.s6cam = { title: '6단계 영수증 찍기', step: 6, actions: true,
  html: function () {
    return stepTop() + prog(6) + '<h1 tabindex="-1">병원 영수증을 찍어주세요</h1>' +
      '<div class="cam-box" id="cam-box"><video id="cam-video" aria-hidden="true" playsinline muted></video><div class="cam-guide" aria-hidden="true"></div><p class="cam-msg" id="cam-msg" role="status"></p></div>' +
      '<div class="spacer"></div><div class="actions col cam-actions"><button class="primary" data-act="shoot" id="shoot">사진 찍기</button>' +
      '<div class="cam-row"><button class="secondary" data-act="prev">이전</button><label class="filebtn" for="album">앨범에서 고르기<input class="sr-only" type="file" id="album" accept="image/*"></label></div></div>';
  },
  say: function () { return '병원 영수증을 찍어주세요. 영수증 전체가 네모 안에 들어오게, 밝은 곳에서 흔들리지 않게 찍어 주세요.'; }
};
V.s6blur = { title: '사진이 흐려요', step: 6, actions: true,
  html: function () {
    return stepTop() + prog(6) + '<h1 tabindex="-1">' + (S.blurKind === 'dark' ? '사진이 너무 어두워요' : '사진이 조금 흐려요') + '</h1>' +
      '<div class="blur-box" aria-hidden="true"><div class="paper">' + (S.shot ? '<img src="' + S.shot + '" alt="">' : '<div class="fake"><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i></div>') + '</div></div>' +
      '<p class="warn" role="alert">' + I.warn + '<span>글자를 읽을 수 없어요. 지금까지의 쓴 내용은 그대로 있어요.</span></p>' +
      '<h2 class="tips-t" data-rd>이렇게 다시 찍어보세요</h2><ol class="tips"><li>밝은 곳에 영수증을 놓아요</li><li>휴대폰을 흔들리지 않게 잡아요</li></ol>' +
      '<div class="spacer"></div><div class="actions col blur-actions"><button class="primary" data-act="go-cam">다시찍기</button><button class="secondary wide" data-act="write-instead">사진 없이 직접 쓰기</button></div>';
  },
  say: function () { return (S.blurKind === 'dark' ? '사진이 너무 어두워요.' : '사진이 조금 흐려요.') + ' 글자를 읽을 수 없어요. 지금까지 쓴 내용은 그대로 있어요. 밝은 곳에 영수증을 놓고, 휴대폰을 흔들리지 않게 잡고 다시 찍어보세요.'; }
};

/* --- 7단계 계좌 --- */
V.s7 = { title: '7단계 받을 계좌', step: 7, actions: true,
  html: function () {
    var a = S.c.account;
    return stepTop() + prog(7) + '<h1 tabindex="-1" id="q7">보험금을 어디로 받으실까요?</h1>' +
      '<fieldset aria-labelledby="q7" id="fs" class="acc"><div class="opts one">' +
      radio('acc', 'ac-0', 'reg', BANK.name + '<br>' + BANK.no, a === 'reg', { left: true, desc: '지난번에도 이 계좌로 받았어요', circle: true, lead: '<span class="bankic" aria-hidden="true"><i>신</i></span>' }) +
      radio('acc', 'ac-1', 'other', '다른계좌로 받기', a === 'other', { left: true, cls: 'small', lead: '<span class="plusic" aria-hidden="true">' + I.plus + '</span>', circle: true }) +
      '</div></fieldset>' + fb(a === 'reg' ? '‘' + BANK.name + ' ' + BANK.no + '’로 받아요' : a === 'other' ? '‘다른 계좌’로 받아요' : '') +
      '<div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 7단계예요. 보험금을 어디로 받으실까요? 지난번에 받은 ' + BANK.say + ' 계좌와, 다른 계좌로 받기 중에 골라 주세요.'; }
};

/* --- 8단계 확인 --- */
function sumRow(k, v, to) { return '<div class="srow"><div><p class="k">' + k + '</p><p class="v">' + esc(v) + '</p></div><button class="edit" data-act="edit" data-to="' + to + '" aria-label="' + k + ', ' + esc(v) + ', 수정">수정</button></div>'; }
V.s8 = { title: '8단계 확인', step: 8, actions: true,
  html: function () {
    return stepTop() + prog(8) + '<h1 tabindex="-1">이대로 청구할까요?</h1>' +
      '<div class="sum">' + sumRow('누구', whoL(), 's2') + sumRow('이유', (S.c.reason || '-') + '·' + (S.c.dept || '-'), 's3') + sumRow('병원·날짜', hospL(), 's6') + sumRow('서류', docL(), 's6') + sumRow('받을 계좌', bankL(), 's7') + '</div>' +
      '<div class="spacer"></div>' + nav();
  },
  say: function () { return '8단계 중 8단계예요. 이대로 청구할까요? 누구, ' + (S.c.who === 'me' ? '나, 홍길동' : '가족') + '. 이유, ' + S.c.reason + ', ' + S.c.dept + '. 병원과 날짜, ' + (S.c.hosp ? S.c.hosp.name : '') + ', ' + (S.c.date ? md(S.c.date) : '') + '. 서류, ' + docL() + '. 받을 계좌, ' + (S.c.account === 'reg' ? BANK.say : '다른 계좌') + '. 맞으면 다음을 눌러 주세요.'; }
};

/* --- 접수 완료 --- */
V.done = { title: '접수 완료', actions: true,
  html: function () {
    var d = S.done;
    return '<div class="close-top"><button class="textbtn" data-act="go-home">닫기</button></div><div class="done-ic" aria-hidden="true">' + I.chk(2.8) + '</div>' +
      '<div class="done-body"><h1 tabindex="-1">청구가 접수됐어요</h1><span class="chipno">접수번호 ' + S.claimNo + '</span>' +
      '<p class="done-desc">지금 더 하실 일은 없어요.<br>서류가 더 필요하면 문자로 알려드려요.</p>' +
      '<button class="listen" data-act="listen">' + I.spk + '소리로 듣기</button>' +
      '<h2 class="where" data-rd>지금 어디까지 왔나요</h2>' +
      '<ol class="timeline"><li class="done"><span class="tl-dot" aria-hidden="true"></span><div><p class="tl-t">접수완료<span class="sr-only">, 완료</span></p><p class="tl-d">' + ymdDot(d.at) + '</p></div></li>' +
      '<li><span class="tl-dot" aria-hidden="true"></span><div><p class="tl-t">서류확인<span class="sr-only">, 다음 단계</span></p><p class="tl-d">2~3일 소요</p></div></li>' +
      '<li><span class="tl-dot" aria-hidden="true"></span><div><p class="tl-t">보험금 입금<span class="sr-only">, 남음</span></p></div></li></ol></div>' +
      '<div class="spacer"></div><div class="actions col"><button class="outline" data-act="sms">접수 내용 문자로 받기</button><button class="primary" data-act="go-home">홈으로</button></div>';
  },
  say: function () { return '청구가 접수됐어요. 접수번호 ' + S.claimNo.replace(/-/g, ', ') + '. 지금 더 하실 일은 없어요. 서류가 더 필요하면 문자로 알려드려요. 지금은 접수완료 단계이고, 다음 서류확인은 2에서 3일 걸려요.'; }
};

/* =========================================================
   이동 · 렌더
========================================================= */
var ORDER = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
var PREV = { intro: 'home', s1: 'intro', s2: 's1', s3: 's2', s4: 's3', s5: 's4', s6: 's5', s7: 's6', s8: 's7', s6cam: 's6', s6blur: 's6cam', done: 'home' };

function go(v, opt) {
  opt = opt || {};
  if (v === 'settings' && S.view !== 'settings') S.settingsBack = S.view;
  if (v !== 's6') S.writing = false;
  S.view = v; render(opt);
}
function render(opt) {
  opt = opt || {};
  if (S.view !== 's6cam') Cam.close();
  if (S.listeningHosp) { Voice.stopListen(true); S.listeningHosp = false; }
  var v = V[S.view];
  scr.innerHTML = '<div class="view ' + S.view + '">' + v.html() + '</div>';
  device.classList.toggle('no-actions', !v.actions);
  fab.hidden = S.view === 'age' || S.ai;
  placeFab();
  document.title = v.title + ' — 모니모';
  scroller.scrollTop = 0;
  S.st = 0; S.cand = null; S.misses = 0;
  var f = opt.focus ? scr.querySelector(opt.focus) : scr.querySelector('h1');
  if (f) f.focus({ preventScroll: true });
  if (v.step) announce('8단계 중 ' + v.step + '단계');
  if (S.view === 's6cam') startCam();
  if (S.view === 's5') bindSwipe();
  if (S.ai) { if (!opt.keepAi) aiIntro(); }
  else if (S.voice && !opt.quiet) say(v.say(), '소리 안내');
}
function placeFab() {
  var a = scr.querySelector('.view > .actions');
  fab.style.bottom = a ? (a.offsetHeight + 10) + 'px' : 'max(24px, calc(env(safe-area-inset-bottom) + 16px))';
}
window.addEventListener('resize', placeFab);
function ensureVisible(el) {
  if (!el || !scroller.contains(el) || el.closest('.actions')) return;
  var er = el.getBoundingClientRect(), limit = scroller.getBoundingClientRect().bottom;
  var a = scr.querySelector('.view > .actions'); if (a) limit = Math.min(limit, a.getBoundingClientRect().top);
  if (!fab.hidden) { var fr = fab.getBoundingClientRect(); if (er.right > fr.left) limit = Math.min(limit, fr.top); }
  if (er.bottom > limit - 8) scroller.scrollTop += er.bottom - (limit - 8);
}
scroller.addEventListener('focusin', function (e) { ensureVisible(e.target.closest('label') || e.target); });

/** 시안에 없는 오류 문구 대신: 해당 칸을 살짝 흔들고, 소리·스크린리더로 알려요 */
function nudge(msg, focusSel) {
  var box = document.getElementById('fs') || document.getElementById('consent');
  if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
  var f = focusSel && scr.querySelector(focusSel); if (f) f.focus();
  tell(msg);
  return false;
}
function validate() {
  var v = S.view, c = S.c;
  if (v === 'age' && !S.age) return nudge('나이대를 하나 골라 주세요.', '#age-0');
  if (v === 's1' && !c.consent) return nudge('‘위 내용에 모두 동의합니다’를 먼저 눌러 주세요.', '#agree');
  if (v === 's2' && !c.who) return nudge('본인인지 가족인지 먼저 골라 주세요.', '#who-me');
  if (v === 's3' && !c.reason) return nudge('병원에 간 이유를 하나 골라 주세요.', '#rs-0');
  if (v === 's4' && !c.dept) return nudge('받으신 진료를 골라 주세요.', '#dp-0');
  if (v === 's5' && !c.date) return nudge(c.dateKind === 'other' ? '달력에서 날짜를 눌러 주세요.' : '병원에 간 날을 골라 주세요.', c.dateKind === 'other' ? '.day:not([disabled])' : '#dk-0');
  if (v === 's7' && !c.account) return nudge('보험금 받을 계좌를 골라 주세요.', '#ac-0');
  if (v === 's6' && !c.hosp) return nudge('병원을 골라 주세요. 최근에 간 병원을 누르거나, 사진·말·글자로 찾을 수 있어요.', '#hp-r');
  return true;
}
function next() {
  var v = S.view;
  if (!validate()) return false;
  if (v === 'age') return go('home'), true;
  if (v === 's8') return submit(), true;
  var i = ORDER.indexOf(v);
  if (i > -1) {
    S.draft = Math.max(S.draft, i + 1);
    if (S.editing) { S.editing = false; go('s8'); return true; }
    go(ORDER[i + 1]); return true;
  }
  return false;
}
function submit() {
  var r = function () { return String(Math.floor(1000 + Math.random() * 9000)); };
  S.claimNo = r() + '-' + r() + '-' + r();
  S.done = { at: new Date() }; S.draft = 0; go('done');
}
function setAge(v) {
  S.age = v; var a = AGES.filter(function (x) { return x.v === v; })[0];
  setFont(a.f, true); setFb('‘' + a.l + '’로 했어요. 글자는 ‘' + FONT[a.f] + '’예요');
}
var FONTPX = { normal: 10, large: 11.5, xlarge: 13 };
/** 시안(360×780) 비율 그대로 화면에 맞추기 — 작은 휴대폰에서도 스크롤 없이 다 보이게 */
function fit() {
  var w = device.clientWidth, h = device.clientHeight;
  var k = Math.max(0.75, Math.min(w / 360, h / 780, 1.15));
  document.documentElement.style.fontSize = (FONTPX[S.font] * k).toFixed(2) + 'px';
  placeFab();
}
window.addEventListener('resize', fit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
function setFont(v, quiet) {
  S.font = v; document.documentElement.setAttribute('data-font', v); fit();
  scr.querySelectorAll('input[name=font]').forEach(function (r) { r.checked = r.value === v; });
  var m = '글자 크기를 ' + FONT[v] + '로 바꿨어요.'; if (!quiet) announce(m); return m;
}
function setTheme(v, quiet) {
  S.theme = v; document.documentElement.setAttribute('data-theme', v);
  var mc = document.querySelector('meta[name=theme-color]'); if (mc) mc.content = v === 'hc' ? '#000000' : '#FFFFFF';
  scr.querySelectorAll('input[name=theme]').forEach(function (r) { r.checked = r.value === v; });
  var m = '화면 색을 ' + THEME[v] + '로 바꿨어요.'; if (!quiet) announce(m); return m;
}
function flash(el) { if (!el) return; var lab = el.closest('label') || el; lab.classList.remove('flash'); void lab.offsetWidth; lab.classList.add('flash'); }
function pick(name, val) { var r = scr.querySelector('input[name=' + name + '][value="' + val + '"]'); if (r) { r.checked = true; flash(r); r.dispatchEvent(new Event('change', { bubbles: true })); } }
function reset() {
  Voice.stopSpeak(); Voice.stopListen(true); if (S.ai) aiClose(true); Cam.close();
  S.view = 'age'; S.age = null; S.voice = false; S.c = freshClaim(); S.draft = 0; S.done = null; S.editing = false; S.shot = null;
  setFont('normal', true); setTheme('default', true); syncEx(); render();
}

/* ---------------- 5단계: 달력 밀기 ---------------- */
function bindSwipe() {
  var g = document.getElementById('cal'), x0 = null;
  if (!g) return;
  g.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  g.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) shiftWeek(dx > 0 ? -1 : 1); });
}

/* ---------------- 6단계: 병원 ---------------- */
function pickHospital(name, src, addr) {
  var r = name === RECENT.name;
  S.c.hosp = r ? RECENT : { id: 'custom', name: name, addr: addr || '', src: src };
  if (src !== 'photo') S.c.photo = false;
}
function afterHospital(msg) {
  S.writing = false;
  render({ quiet: true, focus: S.c.hosp.id === 'recent' ? '#hp-r' : '#hp-c', keepAi: true });
  tell(msg || '‘' + S.c.hosp.name + '’로 했어요. 맞으면 다음을 눌러 주세요.');
}
function cleanName(t) { return t.replace(/[.,!?]/g, '').replace(/\s*(이에요|예요|입니다|이요|요|에 갔어요|갔어요|다녀왔어요|에서|이야|야)$/g, '').replace(/\s+/g, '').trim(); }
function bestHospital(t) {
  var n = t.replace(/\s/g, '');
  return HOSPITALS.filter(function (h) { var core = h.replace(/(의원|병원)$/, ''); return n.indexOf(core) > -1 || (n.length >= 2 && core.indexOf(n) > -1); })[0] || null;
}
function speakHospital() {
  if (S.ai) { S.st = 'name'; aiSay('병원 이름을 말씀해 주세요.'); renderChips(); return; }
  var btn = document.getElementById('m-speak'), lab = document.getElementById('m-speak-t');
  if (S.listeningHosp) { Voice.stopListen(true); S.listeningHosp = false; btn.classList.remove('listening'); lab.textContent = '병원 이름 말하기'; return; }
  Voice.stopSpeak();
  S.listeningHosp = true; btn.classList.add('listening'); lab.textContent = '듣고 있어요… 말씀하세요'; announce('듣고 있어요. 병원 이름을 말씀해 주세요.');
  Voice.listen({
    onInterim: function (t) { lab.textContent = t + '…'; },
    onFinal: function (t) { S.listeningHosp = false; Voice.onCaption('내 말', t); var n = cleanName(t); var m = bestHospital(n); pickHospital(m || n, 'voice'); afterHospital(); },
    onEnd: function () { S.listeningHosp = false; btn.classList.remove('listening'); lab.textContent = '병원 이름 말하기'; tell('잘 듣지 못했어요. 다시 누르고 말씀해 주세요.'); },
    onError: function (code) { S.listeningHosp = false; btn.classList.remove('listening'); lab.textContent = '병원 이름 말하기'; toast(Voice.errorText(code)); tell(Voice.errorText(code)); }
  });
}
function writeOk() {
  var i = document.getElementById('h-in'), v = i ? i.value.trim() : '';
  if (!v) { if (i) i.focus(); return tell('병원 이름을 써 주세요.'); }
  var m = bestHospital(v); pickHospital(m || v, 'write'); afterHospital();
}

/* ---------------- 6단계: 카메라 ---------------- */
function camMsg(t) { var m = document.getElementById('cam-msg'); if (m) m.textContent = t; }
function startCam() {
  var video = document.getElementById('cam-video'), box = document.getElementById('cam-box');
  if (!video) return;
  Cam.open(video).then(function () {
    if (S.view !== 's6cam') return Cam.close();
    box.classList.add('live'); camMsg('');
  }).catch(function (e) {
    if (S.view !== 's6cam') return;
    camMsg((e && e.name === 'NotAllowedError') ? '카메라 권한이 꺼져 있어요. ‘앨범에서 고르기’를 써 주세요.' : '카메라를 쓸 수 없어요. ‘앨범에서 고르기’를 써 주세요.');
  });
}
function shoot() {
  var video = document.getElementById('cam-video');
  if (!Cam.stream || !video || !video.videoWidth) { var a = document.getElementById('album'); if (a) a.click(); return; }
  processShot(Cam.grab(video));
}
function processShot(c) {
  Cam.close();
  S.shot = c.toDataURL('image/jpeg', .82);
  var q = Cam.quality(c);
  if (!q.bright || !q.sharp) { S.blurKind = !q.bright ? 'dark' : 'blur'; return go('s6blur'); }
  if (S.view !== 's6cam') go('s6cam', { quiet: true });
  var box = document.getElementById('cam-box');
  if (box) { box.classList.remove('live'); box.classList.add('reading'); var img = document.createElement('img'); img.className = 'shot'; img.alt = ''; img.src = S.shot; box.insertBefore(img, box.firstChild); }
  camMsg('영수증을 읽고 있어요…'); tell('영수증을 읽고 있어요. 잠시만 기다려 주세요.');
  var btn = document.getElementById('shoot'); if (btn) btn.disabled = true;
  Cam.read(c, function (p) { camMsg('영수증을 읽고 있어요… ' + Math.round(p * 100) + '%'); }, 45000).then(function (o) {
    if (S.view !== 's6cam') return;
    if (!o.hospital) { S.blurKind = 'blur'; return go('s6blur'); }
    pickHospital(o.hospital, 'photo'); S.c.photo = true;
    if (o.date && +day0(o.date) <= +TODAY) S.c.date = day0(o.date);
    go('s6', { quiet: true, focus: '#hp-c' });
    tell('영수증에서 ‘' + o.hospital + '’' + josa(o.hospital, '을', '를') + ' 찾았어요. 맞으면 다음을 눌러 주세요.');
  }).catch(function () { if (S.view === 's6cam') { S.blurKind = 'blur'; go('s6blur'); } });
}

/* =========================================================
   스크린리더 체험 (VoiceOver처럼 읽기)
========================================================= */
function txt(el) { return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); }
function describe(el) {
  if (!el || el === document.body) return '';
  var name = el.getAttribute('aria-label') || '';
  if (!name && el.labels && el.labels.length) name = txt(el.labels[0]);
  if (!name) name = txt(el);
  var tag = el.tagName.toLowerCase(), role = el.getAttribute('role'), out = name;
  if (/^h[1-3]$/.test(tag)) out = name + ', 제목';
  else if (tag === 'input' && el.type === 'radio') { var grp = scr.querySelectorAll('input[name="' + el.name + '"]'); out = name + ', ' + (el.checked ? '선택됨, ' : '') + '선택 버튼, ' + grp.length + '개 중 ' + (Array.prototype.indexOf.call(grp, el) + 1) + '번째'; }
  else if (tag === 'input' && el.type === 'checkbox') out = name + ', ' + (el.checked ? '체크됨' : '체크 안 됨') + ', 체크박스';
  else if (tag === 'input' && el.type === 'file') out = name + ', 버튼';
  else if (tag === 'input') out = name + ', 입력창' + (el.value ? ', ' + el.value : '');
  else if (role === 'tab') out = name + ', 탭, ' + (el.getAttribute('aria-selected') === 'true' ? '선택됨, ' : '') + '3개 중 ' + (+el.getAttribute('data-i') + 1) + '번째';
  else if (role === 'progressbar') out = el.getAttribute('aria-valuetext');
  else if (tag === 'button' || tag === 'a') { out = name + ', 버튼'; var ex = el.getAttribute('aria-expanded'); if (ex) out += ', ' + (ex === 'true' ? '펼쳐짐' : '접힘'); if (el.getAttribute('aria-pressed') === 'true') out = name + ', 선택됨, 버튼'; if (el.disabled) out += ', 흐리게 표시됨'; }
  return out;
}
function srItems() {
  var scope = S.ai ? aiEl : scr;
  var sel = 'h1,h2,[data-rd],.lead,.note,.info,.fb,.warn,.checks li,.prep li,.who-card .row,.timeline li,.chipno,.done-desc,.cal-m,[role=progressbar],button,a[href],input,select';
  var list = Array.prototype.filter.call(scope.querySelectorAll(sel), function (el) {
    if (el.closest('[hidden]') || el.closest('[aria-hidden=true]')) return false;
    if (el.matches('input.sr-only')) return true;
    if (el.classList.contains('fb') && !el.textContent.trim()) return false;
    return el.offsetParent !== null || el.classList.contains('sr-only');
  });
  return list.filter(function (el) { return el.matches('button,input') || !list.some(function (o) { return o !== el && el.contains(o); }); });
}
function srMove(dir) {
  var items = srItems(); if (!items.length) return;
  var cur = document.activeElement, i = items.indexOf(cur);
  if (i === -1) { i = dir > 0 ? -1 : items.length; items.forEach(function (el, k) { if (el.contains(cur)) i = k; }); }
  srSelect(items[Math.max(0, Math.min(items.length - 1, i + dir))]);
}
function srSelect(n) {
  if (!n) return;
  if (!n.matches('button,a,input,select,[tabindex]')) n.setAttribute('tabindex', '-1');
  var same = document.activeElement === n;
  n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest' });
  if (same || !n.matches('button,a,input,select,h1,h2,[role=tab],[role=progressbar]')) say(n.matches('button,a,input,select,h1,h2,[role=tab],[role=progressbar]') ? describe(n) : txt(n), '스크린리더');
}

/* ---------- 휴대폰에서 스크린리더 체험: VoiceOver·TalkBack과 같은 손동작 ----------
   한 번 누르기 = 읽기 · 두 번 누르기 = 누르기(실행) · 옆으로 밀기 = 다음/이전 항목 */
(function () {
  var x0 = 0, y0 = 0, t0 = 0, touch = false, lastTap = 0, allow = false, moved = false;
  function target(el) {
    var lab = el.closest('label');
    if (lab) { var inp = lab.querySelector('input'); if (inp) return inp; }
    var hit = el.closest('button,a[href],input,select,[role=tab]');
    if (hit) return hit;
    var items = srItems();
    for (var i = 0; i < items.length; i++) if (items[i].contains(el)) return items[i];
    return null;
  }
  function activate() {
    var cur = document.activeElement;
    if (!cur || cur === document.body || !device.contains(cur)) return;
    var el = cur;
    if (!el.matches('button,a,input,select,[role=tab]')) return;
    if (el.matches('input[type=text],input:not([type])')) { el.blur(); el.focus(); return; }
    allow = true; el.click(); allow = false;
  }
  device.addEventListener('pointerdown', function (e) {
    touch = e.pointerType === 'touch'; if (!S.sr || !touch) return;
    x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); moved = false;
  }, true);
  device.addEventListener('pointermove', function (e) { if (S.sr && touch && (Math.abs(e.clientX - x0) > 12 || Math.abs(e.clientY - y0) > 12)) moved = true; }, true);
  device.addEventListener('pointerup', function (e) {
    if (!S.sr || !touch) return;
    Voice.unlock();
    if (!S.srHinted) { S.srHinted = true; say('스크린리더 체험이 켜져 있어요. 한 번 누르면 읽고, 두 번 빠르게 누르면 눌러져요. 옆으로 밀면 다음 항목으로 가요.', '스크린리더'); return; }
    var dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 600) { srMove(dx < 0 ? 1 : -1); lastTap = 0; return; }
    if (moved) return;
    var now = Date.now();
    if (now - lastTap < 350) { lastTap = 0; activate(); return; }
    lastTap = now;
    var el = target(e.target);
    if (el && el !== document.activeElement) srSelect(el);
    else if (el) say(describe(el) || txt(el), '스크린리더');
  }, true);
  device.addEventListener('mousedown', function (e) { if (S.sr && touch && !allow) e.preventDefault(); }, true);
  device.addEventListener('click', function (e) {
    if (!S.sr || !touch || allow) return;
    e.preventDefault(); e.stopPropagation();
  }, true);
})();
document.addEventListener('focusin', function (e) {
  if (!S.sr || !device.contains(e.target)) return;
  if (S.ai && aiEl.classList.contains('speaking') && !aiEl.contains(e.target)) return;
  var t = e.target;
  if (t.matches('button,a,input,select,[role=tab],h1,h2,[role=progressbar]')) say(describe(t), '스크린리더');
});

/* =========================================================
   AI 음성 도우미
   - 화면을 보지 않아도 되도록, 고를 수 있는 것을 항상 말로 알려 줘요.
   - "네/아니요/모르겠어요/다시" 같은 대답을 어느 질문에서나 알아들어요.
   - 버튼(칩)은 말하기 어려울 때 누르는 보조 수단이에요.
========================================================= */
function tokensOf(n) { return n.split(/\s+/).filter(Boolean); }
function analyse(raw) {
  var n = (raw || '').replace(/[.,!?~‘’“”'"]/g, ' ').replace(/\s+/g, ' ').trim();
  var t = tokensOf(n), sq = n.replace(/\s/g, '');
  var startsAny = function (arr) { return t.some(function (w) { return arr.some(function (p) { return w.indexOf(p) === 0; }); }); };
  var exactAny = function (arr) { return t.some(function (w) { return arr.indexOf(w) > -1; }); };
  var no = startsAny(['아니', '아뇨', '아냐', '아닌', '틀려', '틀렸', '틀린', '싫어', '말고', '안돼', '안 돼']) || /(잘못|그게아니|그거아니|아닌데|노노)/.test(sq);
  var yes = !no && (exactAny(['네', '넵', '예', '응', '어', '엉', '웅', 'ㅇㅇ', '그래', '그럼']) || startsAny(['맞아', '맞습', '맞어', '맞네', '맞지', '맞아요', '좋아', '좋습', '오케이', '그렇', '그래요', '그러', '부탁', '해줘', '해 줘']) || /^(네|예|응)/.test(sq));
  var unsure = /(모르|몰라|기억\s?안|생각\s?안|잘\s?모|헷갈)/.test(n);
  return { raw: raw, n: n, sq: sq, t: t, yes: yes, no: no, unsure: unsure,
    has: function () { for (var i = 0; i < arguments.length; i++) if (sq.indexOf(arguments[i].replace(/\s/g, '')) > -1) return true; return false; },
    starts: startsAny };
}
function parseDateU(u) {
  if (u.has('그저께', '그제')) return addDays(TODAY, -2);
  if (u.has('어제')) return addDays(TODAY, -1);
  if (u.has('오늘')) return TODAY;
  var m = u.n.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) { var d = new Date(TODAY.getFullYear(), +m[1] - 1, +m[2]); if (d > TODAY) d.setFullYear(d.getFullYear() - 1); return day0(d); }
  m = u.n.match(/(\d{1,2})\s*일/);
  if (m) { var d2 = new Date(TODAY.getFullYear(), TODAY.getMonth(), +m[1]); if (d2 > TODAY) d2.setMonth(d2.getMonth() - 1); return day0(d2); }
  for (var i = 0; i < 7; i++) {
    if (u.has(WEEK[i] + '요일')) {
      var back = (TODAY.getDay() - i + 7) % 7; if (back === 0) back = 7;
      if (u.has('지난주', '저번주', '지난 주', '저번 주') && back < TODAY.getDay() + 1) back += 7;
      return addDays(TODAY, -back);
    }
  }
  return null;
}
function deptFrom(u) {
  var map = [['정형', '정형외과'], ['내과', '내과'], ['치과', '치과'], ['이빨', '치과'], ['치아', '치과'], ['안과', '안과'], ['눈', '안과'], ['한의', '한의원'], ['한방', '한의원'], ['침', '한의원'], ['피부', '피부과'], ['기타', '기타'], ['그외', '기타']];
  for (var i = 0; i < map.length; i++) if (u.sq.indexOf(map[i][0]) > -1) return map[i][1];
  return null;
}
function reasonFrom(u) {
  if (u.has('검진', '검사')) return '검진';
  if (u.has('사고', '넘어', '다쳐', '다쳤', '다침', '부딪', '골절', '삐', '접질', '미끄러', '데었')) return '사고';
  if (u.has('질병', '아파', '아팠', '아픈', '감기', '배탈', '통증', '열이', '기침', '병')) return '질병';
  return null;
}
var NEXT = ' 맞으면 ‘다음’이라고 말씀해 주세요.';

/** 화면별 대화. say: 묻는 말 / chips: 대신 누를 수 있는 대답 / on(u): 알아들은 대답 처리 (문장=AI가 말함, true=처리됨, null=못 알아들음) / help: 모를 때 쉬운 설명 */
function aiCfg() {
  var v = S.view, st = S.st, c = S.c;
  switch (v) {
    case 'home': return { say: '안녕하세요, 홍길동 님. 무엇을 도와드릴까요? 병원비를 돌려받으시려면 ‘청구’, 지난 청구를 보시려면 ‘확인’이라고 말씀해 주세요.', chips: ['청구할래', '확인할래'],
      on: function (u) { if (u.has('청구', '병원비', '보험금', '돌려')) return go('intro'), true; if (u.has('확인', '진행', '어디까지')) return ACT.status(), true; if (u.yes) return go('intro'), true; return null; } };
    case 'intro':
      if (st === 0) return { say: 'AI로 보험금 청구를 도와드릴게요. 제가 하나씩 여쭤보고, 대답하시면 대신 눌러 드려요. 도와드릴까요? ‘네’ 또는 ‘아니요’라고 말씀해 주세요.', chips: ['어, 도와줘', '아니, 혼자 할게'],
        on: function (u) {
          if (u.no || u.has('혼자', '괜찮')) { setTimeout(function () { aiClose(); }, 2600); return '알겠어요. 필요하시면 언제든 ‘AI 도우미’ 버튼을 눌러 주세요.'; }
          if (u.yes || u.has('도와', '해줘', '부탁')) { S.st = 1; return '좋아요. 5분 정도 걸리고, 병원 영수증이 필요해요. 준비되면 ‘다음’이라고 말씀해 주세요.'; }
          return null; } };
      return { say: '병원 영수증을 준비하셨으면 ‘다음’이라고 말씀해 주세요.', chips: ['다음', '영수증이 없어'],
        on: function (u) { if (u.has('없')) return '영수증이 없으면 병원 창구나 병원 앱에서 다시 받을 수 있어요. 영수증 없이도 병원 이름을 말로 알려 주시면 돼요. 시작하시려면 ‘다음’이라고 말씀해 주세요.'; if (u.yes || u.has('다음', '시작', '준비')) return go('s1'), true; return null; } };
    case 's1': return { say: '1단계예요. 청구하려면 동의가 필요해요. 병원 기록은 보험금 심사에만 쓰고, 입력한 정보는 삼성화재만 보고, 심사가 끝나면 안전하게 보관해요. 동의하시면 ‘동의해’, 자세한 내용이 궁금하시면 ‘자세히’라고 말씀해 주세요.', chips: c.consent ? ['다음', '자세히 알려줘'] : ['동의해', '자세히 알려줘'],
      help: '동의하셔야 보험금을 청구할 수 있어요. 동의하시면 ‘동의해’라고 말씀해 주세요.',
      on: function (u) {
        if (u.has('자세', '항목', '뭐에', '무슨')) return '동의 항목은 7개예요. 개인정보 수집과 이용, 건강 정보 처리, 고유식별정보 처리, 병원 진료 기록 확인, 보험금 심사 목적 이용, 심사 후 보관 기간, 동의 철회 방법이에요. 동의하시면 ‘동의해’라고 말씀해 주세요.';
        if (u.no) return '동의하지 않으시면 청구를 진행할 수 없어요. 궁금한 점이 있으면 ‘자세히’라고 말씀해 주세요. 그만하시려면 ‘그만’이라고 해 주세요.';
        if (!c.consent && (u.yes || u.has('동의'))) { var a = document.getElementById('agree'); if (a) { a.checked = true; flash(a); } c.consent = true; return '동의하셨어요.' + NEXT; }
        if (c.consent && (u.yes || u.has('다음'))) return next(), true;
        return null; } };
    case 's2':
      if (st === 'notme') return { say: '본인 정보가 아니라면, 가족분 병원비인가요? 아니면 제 정보가 바뀌었나요? ‘가족’ 또는 ‘정보가 바뀌었어’라고 말씀해 주세요.', chips: ['가족이야', '정보가 바뀌었어', '아니, 본인 맞아'],
        on: function (u) {
          if (u.has('가족', '아내', '남편', '자녀', '아들', '딸', '엄마', '아빠', '어머니', '아버지', '배우자', '부모')) { pick('who', 'family'); S.st = 0; return '가족분 병원비로 할게요.' + NEXT; }
          if (u.has('정보', '바뀌', '바꼈', '달라', '다르', '번호', '주소', '이름', '전화')) { S.st = 'info'; return '정보가 바뀌었다면 상담원이 바로 고쳐 드려요. 상담원과 통화하시려면 ‘상담원’, 이대로 계속하시려면 ‘계속’이라고 말씀해 주세요.'; }
          if (u.has('본인', '나야', '내거', '저예요', '제거') || (u.no && u.has('맞'))) { S.st = 0; return '그럼 본인 병원비로 할게요.' + NEXT; }
          return null; } };
      if (st === 'info') return { say: '상담원과 통화하시려면 ‘상담원’, 이대로 계속하시려면 ‘계속’이라고 말씀해 주세요.', chips: ['상담원', '계속할게'],
        on: function (u) { if (u.has('상담', '사람', '전화', '통화')) return '상담원 연결은 체험이라 생략했어요. 실제 앱에서는 바로 전화가 이어져요. 이대로 계속하시려면 ‘계속’이라고 말씀해 주세요.'; if (u.yes || u.has('계속', '다음', '넘어')) return next(), true; return null; } };
      if (c.who === 'me') return { say: '본인 병원비로 할게요. 홍길동 님, 1962년 4월 18일생, 연락처 010 1234 5678이 맞으세요? 맞으면 ‘맞아’, 아니면 ‘아니야’라고 말씀해 주세요.', chips: ['맞아', '아니야', '가족이야'],
        on: function (u) {
          if (u.has('가족', '아내', '남편', '자녀', '아들', '딸', '엄마', '아빠')) { pick('who', 'family'); return '가족분 병원비로 할게요.' + NEXT; }
          if (u.no) { S.st = 'notme'; return aiCfg().say; }
          if (u.yes || u.has('다음', '넘어')) return next(), true;
          return null; } };
      if (c.who === 'family') return { say: '가족분 병원비로 할게요.' + NEXT + ' 본인 병원비라면 ‘본인’이라고 말씀해 주세요.', chips: ['다음', '본인이야'],
        on: function (u) { if (u.has('본인') || u.starts(['나', '내', '제', '저'])) { pick('who', 'me'); return aiCfg().say; } if (u.no) { pick('who', 'me'); return '그럼 본인 병원비로 할게요. 홍길동 님 정보가 맞으면 ‘맞아’, 아니면 ‘아니야’라고 말씀해 주세요.'; } if (u.yes || u.has('다음')) return next(), true; return null; } };
      return { say: '2단계예요. 누구의 병원비인가요? 본인 병원비면 ‘본인’, 가족 병원비면 ‘가족’이라고 말씀해 주세요.', chips: ['본인이야', '가족이야'],
        help: '병원에 다녀오신 분이 홍길동 님이면 ‘본인’, 배우자나 자녀 같은 가족이면 ‘가족’이라고 말씀해 주세요.',
        on: function (u) {
          if (u.has('가족', '아내', '남편', '자녀', '아들', '딸', '엄마', '아빠', '배우자')) { pick('who', 'family'); return '가족분 병원비로 할게요.' + NEXT; }
          if (u.has('본인') || u.starts(['나', '내', '제', '저'])) { pick('who', 'me'); return aiCfg().say; }
          if (u.no) return '그럼 가족분 병원비인가요? 맞으면 ‘가족’이라고 말씀해 주세요.';
          if (u.yes) { pick('who', 'me'); return aiCfg().say; }
          return null; } };
    case 's3': return { say: (c.reason ? '‘' + c.reason + '’' + josa(c.reason, '을', '를') + ' 골랐어요.' + NEXT : '3단계예요. 왜 병원에 가셨나요? 아파서 가셨으면 ‘질병’, 넘어지거나 다치셨으면 ‘사고’, 건강검진이면 ‘검진’이라고 말씀해 주세요.'), chips: ['질병', '사고', '검진'].concat(c.reason ? ['다음'] : []),
      help: '감기나 배탈, 통증처럼 아파서 가셨으면 ‘질병’, 넘어지거나 부딪혀서 다치셨으면 ‘사고’, 건강검진이나 정밀검사면 ‘검진’이에요. 어떤 쪽인가요?',
      on: function (u) { var r = reasonFrom(u); if (r) { pick('reason', r); return pickedFb(r) + '.' + NEXT; } if (c.reason && (u.yes || u.has('다음'))) return next(), true; if (c.reason && u.no) return '그럼 질병, 사고, 검진 중에 어떤 건가요?'; return null; } };
    case 's4': return { say: (c.dept ? pickedFb(c.dept) + '.' + NEXT : '4단계예요. 어떤 진료를 받으셨나요? 내과, 정형외과, 치과, 안과, 한의원, 피부과, 기타 중에 말씀해 주세요.'), chips: ['정형외과', '내과', '치과', '모르겠어'].concat(c.dept ? ['다음'] : []),
      help: '영수증 맨 위에 진료과가 적혀 있어요. 뼈나 관절이 아프셨으면 보통 정형외과, 감기나 배가 아프셨으면 내과예요. 잘 모르시면 ‘기타’라고 하셔도 돼요.',
      on: function (u) { var d = deptFrom(u); if (d) { pick('dept', d); return pickedFb(d) + '.' + NEXT; } if (c.dept && (u.yes || u.has('다음'))) return next(), true; if (c.dept && u.no) return '그럼 어떤 진료과인가요? 내과, 정형외과, 치과, 안과, 한의원, 피부과, 기타 중에 말씀해 주세요.'; return null; } };
    case 's5': return { say: (c.date ? '‘' + dateFb(c.date) + '’로 했어요.' + NEXT : '5단계예요. 언제 병원에 가셨나요? ‘어제’, ‘그저께’, ‘지난주 금요일’, 또는 ‘11월 14일’처럼 말씀해 주세요.'), chips: ['오늘', '어제', '그저께'].concat(c.date ? ['다음'] : []),
      help: '영수증에 진료 날짜가 적혀 있어요. 정확하지 않아도 ‘지난주 월요일’처럼 기억나는 대로 말씀해 주세요.',
      on: function (u) {
        var d = parseDateU(u);
        if (d) { if (d > TODAY) return '아직 오지 않은 날이에요. 다녀오신 날을 말씀해 주세요.'; setDate(d); return '‘' + dateFb(d) + '’로 했어요.' + NEXT; }
        if (u.has('다른')) { pick('dk', 'other'); return '며칠이었나요? ‘11월 14일’이나 ‘지난주 금요일’처럼 말씀해 주세요.'; }
        if (c.date && (u.yes || u.has('다음'))) return next(), true;
        if (c.date && u.no) return '그럼 언제 가셨나요? 날짜를 말씀해 주세요.';
        return null; } };
    case 's6':
      if (st === 'confirm' && S.cand) return { say: '‘' + S.cand + '’ 맞나요? 맞으면 ‘맞아’, 아니면 ‘아니야’라고 말씀해 주세요.', chips: ['맞아', '아니야'],
        on: function (u) { if (u.no) { S.st = 'name'; S.cand = null; return '다시 말씀해 주세요. 천천히, 병원 이름만 말씀해 주시면 잘 알아들어요.'; } if (u.yes) { pickHospital(S.cand, 'voice'); var nm = S.cand; afterHospital(' '); S.st = 0; return '‘' + nm + '’' + ro(nm) + ' 했어요.' + NEXT; } return null; } };
      if (st === 'name') return { say: '병원 이름을 말씀해 주세요.', chips: ['튼튼정형외과', '모르겠어'],
        help: '병원 이름이 기억나지 않으시면 영수증을 찍으면 돼요. ‘사진’이라고 하시면 카메라를 켤게요.',
        on: function (u) { if (u.has('사진', '찍', '카메라')) return go('s6cam'), true; var nm = cleanName(u.raw); if (nm.length < 2) return null; S.cand = bestHospital(nm) || nm; S.st = 'confirm'; return aiCfg().say; } };
      if (c.hosp) return { say: '‘' + c.hosp.name + '’' + ro(c.hosp.name) + ' 했어요.' + NEXT + ' 다른 병원이면 ‘다른 병원’이라고 말씀해 주세요.', chips: ['다음', '다른 병원'],
        on: function (u) { if (u.has('다른') || u.no) { S.st = 'name'; return '병원 이름을 말씀해 주세요. 영수증을 찍으시려면 ‘사진’이라고 해 주세요.'; } if (u.yes || u.has('다음')) return next(), true; return null; } };
      return { say: '6단계예요. 어느 병원에 가셨나요? 최근에 가신 병원은 서울 강남구 튼튼정형외과예요. 여기가 맞으면 ‘맞아’, 다른 병원이면 병원 이름을 바로 말씀해 주세요. 영수증을 찍으시려면 ‘사진’이라고 해 주세요.', chips: ['맞아, 거기야', '다른 병원', '사진 찍을래'],
        help: '병원 이름이 기억나지 않으시면 ‘사진’이라고 해 주세요. 영수증을 찍으면 제가 병원 이름을 읽어 드려요.',
        on: function (u) {
          if (u.has('사진', '찍', '카메라', '영수증')) return go('s6cam'), true;
          if (u.has('튼튼') || (u.yes && !u.has('다른'))) { pick('hosp', 'recent'); return '‘튼튼정형외과’로 했어요.' + NEXT; }
          if (u.no || u.has('다른')) { S.st = 'name'; return '그럼 병원 이름을 말씀해 주세요. 영수증을 찍으시려면 ‘사진’이라고 해 주세요.'; }
          var nm = cleanName(u.raw); if (nm.length >= 2 && (bestHospital(nm) || /(과|원|병원|의원|클리닉)$/.test(nm))) { S.cand = bestHospital(nm) || nm; S.st = 'confirm'; return aiCfg().say; }
          return null; } };
    case 's6cam': return { say: '영수증을 찍을게요. 영수증을 밝은 곳에 놓고, 휴대폰을 그 위에 들어 주세요. 준비되면 ‘찍어’라고 말씀해 주세요. 다른 방법을 쓰시려면 ‘이전’이라고 해 주세요.', chips: ['찍어', '이전'],
      on: function (u) { if (u.has('찍', '촬영', '지금', '됐', '준비')) return shoot(), '찍었어요. 사진을 확인할게요.'; if (u.yes) return shoot(), '찍었어요. 사진을 확인할게요.'; return null; } };
    case 's6blur': return { say: '사진이 ' + (S.blurKind === 'dark' ? '어두워서' : '흐려서') + ' 글자를 읽을 수 없어요. 지금까지 쓴 내용은 그대로 있어요. 다시 찍으시려면 ‘다시 찍을래’, 병원 이름을 말로 알려 주시려면 ‘말로 할게’라고 말씀해 주세요.', chips: ['다시 찍을래', '말로 할게'],
      on: function (u) { if (u.has('찍', '다시')) return go('s6cam'), true; if (u.has('말', '이름', '직접', '쓸', '쓰')) { go('s6', { keepAi: true }); S.st = 'name'; aiSay('병원 이름을 말씀해 주세요.'); renderChips(); return true; } return null; } };
    case 's7': return { say: '7단계예요. 보험금을 어디로 받으실까요? 지난번에 받은 ' + BANK.say + ' 계좌로 받으시려면 ‘맞아’, 다른 계좌로 받으시려면 ‘다른 계좌’라고 말씀해 주세요.', chips: ['맞아', '다른 계좌'],
      on: function (u) { if (u.has('다른', '새') || u.no) { pick('acc', 'other'); return '다른 계좌로 받을게요. 새 계좌는 본인 확인 뒤 등록해요. 체험에서는 생략할게요.' + NEXT; } if (u.yes || u.has('신한', '그 계좌', '다음')) { if (!S.c.account || (S.c.account !== 'reg' && !u.has('다음'))) pick('acc', 'reg'); return next(), true; } return null; } };
    case 's8':
      if (st === 'edit') return { say: '어떤 걸 고칠까요? 누구, 이유, 병원, 날짜, 계좌 중에 말씀해 주세요.', chips: ['누구', '이유', '병원', '날짜', '계좌'],
        on: function (u) { var to = u.has('누구', '본인', '가족') ? 's2' : u.has('이유', '진료', '과') ? 's3' : u.has('병원', '서류', '영수증', '사진') ? 's6' : u.has('날짜', '언제', '날') ? 's5' : u.has('계좌', '은행', '통장') ? 's7' : null; if (!to) return null; S.editing = true; go(to); return true; } };
      return { say: '마지막으로 확인할게요. ' + (c.who === 'me' ? '본인' : '가족') + ' 병원비, ' + c.reason + ', ' + c.dept + ', ' + (c.hosp ? c.hosp.name : '') + ', ' + (c.date ? md(c.date) : '') + ', 받을 계좌는 ' + (c.account === 'reg' ? BANK.say : '다른 계좌') + '예요. 이대로 청구하시려면 ‘청구해 줘’, 고칠 게 있으면 ‘고칠래’라고 말씀해 주세요.', chips: ['청구해 줘', '고칠래'],
        on: function (u) { if (u.has('고칠', '고쳐', '수정', '바꿀', '바꿔') || u.no) { S.st = 'edit'; return aiCfg().say; } if (u.yes || u.has('청구', '다음', '접수')) return submit(), true; return null; } };
    case 'done': return { say: '청구가 접수됐어요. 지금 더 하실 일은 없어요. 서류가 더 필요하면 문자로 알려드려요. 접수 내용을 문자로 받으시려면 ‘문자’, 처음 화면으로 가시려면 ‘홈’이라고 말씀해 주세요.', chips: ['문자로 보내줘', '홈으로'],
      on: function (u) { if (u.has('문자')) { ACT.sms(); return '010 1234 5678로 접수 내용을 보냈어요. 처음 화면으로 가시려면 ‘홈’이라고 말씀해 주세요.'; } if (u.has('홈', '처음', '닫')) return go('home'), true; if (u.has('고마', '감사')) return '천만에요. 건강하세요, 홍길동 님!'; return null; } };
    case 'settings': return { say: '보기·듣기 설정이에요. 글자를 키우려면 ‘크게’, 검정 바탕의 또렷한 화면은 ‘고대비’, 원래대로는 ‘기본’, 다 되셨으면 ‘다 됐어’라고 말씀해 주세요.', chips: ['크게', '고대비', '다 됐어'],
      on: function (u) {
        if (u.has('아주')) return setFont('xlarge');
        if (u.has('크게', '키워', '크게해')) return setFont(S.font === 'normal' ? 'large' : 'xlarge');
        if (u.has('보통', '작게', '줄여')) return setFont('normal');
        if (u.has('고대비', '어둡', '검정', '대비')) return setTheme('hc');
        if (u.has('기본', '원래', '밝게', '하얗')) return setTheme('default');
        if (u.has('됐', '완료', '끝', '다음', '시작')) return ACT['settings-done'](), true;
        return null; } };
  }
  return { say: '무엇을 도와드릴까요?', chips: [], on: function () { return null; } };
}

var revealT = null;
function aiSay(t, noListen) {
  if (!t || !t.trim()) return;
  Voice.stopListen(true); setListening(false);
  var p = document.createElement('p'); p.className = 'b-ai';
  var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = 'AI 도우미: ' + t; p.appendChild(sr);
  var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
  vis.innerHTML = t.split(' ').map(function (w) { return '<span class="w">' + esc(w) + '</span>'; }).join(' ');
  p.appendChild(vis); aiLog.appendChild(p);
  while (aiLog.children.length > 8) aiLog.removeChild(aiLog.firstChild);
  aiLog.scrollTop = aiLog.scrollHeight;
  var ws = vis.querySelectorAll('.w'), i = 0; clearInterval(revealT);
  aiEl.classList.add('speaking'); aiStatus.textContent = '말하는 중…';
  var per = Math.max(110, Math.min(420, (t.length * 85) / ws.length));
  revealT = setInterval(function () { if (i < ws.length) { ws[i++].classList.add('on'); aiLog.scrollTop = aiLog.scrollHeight; } else clearInterval(revealT); }, per);
  say(t, 'AI 도우미', function () {
    clearInterval(revealT); ws.forEach(function (w) { w.classList.add('on'); });
    aiEl.classList.remove('speaking');
    if (!S.ai) return;
    if (!noListen) startListening(); else aiStatus.textContent = '마이크를 누르고 말씀해 주세요';
  });
}
function addMe(t, interim) {
  var last = aiLog.lastElementChild;
  if (last && last.classList.contains('interim')) last.remove();
  var p = document.createElement('p'); p.className = 'b-me' + (interim ? ' interim' : ''); p.textContent = t;
  if (interim) p.setAttribute('aria-hidden', 'true');
  aiLog.appendChild(p); aiLog.scrollTop = aiLog.scrollHeight;
}
function setListening(on) {
  aiEl.classList.toggle('listening', on);
  micBtn.setAttribute('aria-pressed', String(on));
  micBtn.setAttribute('aria-label', on ? '듣기 멈추기' : '말하기 시작');
  micTxt.innerHTML = on ? '듣고 있어요<small>편하게 말씀하세요</small>' : '눌러서 말하기<small>' + (Voice.canListen ? '마이크를 누르고 말씀하세요' : '이 브라우저는 듣기를 못 해요') + '</small>';
  if (on) aiStatus.textContent = '듣고 있어요 · 말씀하세요';
}
function startListening() {
  if (!S.ai) return;
  if (!Voice.canListen || !Voice.secure) { aiWarn.textContent = Voice.errorText(!Voice.canListen ? 'unsupported' : 'insecure'); aiStatus.textContent = '대답 버튼을 눌러 주세요'; return; }
  Voice.stopSpeak(); aiEl.classList.remove('speaking'); clearInterval(revealT);
  Voice.listen({
    onStart: function () { setListening(true); aiWarn.textContent = ''; },
    onInterim: function (t) { addMe(t + '…', true); },
    onFinal: function (t, alts) { setListening(false); handleUtter(t, alts, true); },
    onEnd: function () {
      setListening(false);
      var last = aiLog.lastElementChild; if (last && last.classList.contains('interim')) last.remove();
      S.silent++;
      if (!S.ai) return;
      if (S.silent === 2) { aiSay('제 말이 잘 들리셨나요? ' + (aiCfg().help || aiCfg().say)); return; }
      if (S.silent < 4) startListening();
      else aiStatus.textContent = '마이크를 누르고 말씀해 주세요';
    },
    onError: function (code) { setListening(false); aiWarn.textContent = Voice.errorText(code); aiStatus.textContent = '마이크를 누르거나 대답 버튼을 눌러 주세요'; if (code === 'not-allowed') say(Voice.errorText(code), 'AI 도우미'); }
  });
}
function renderChips() {
  var cfg = aiCfg();
  aiChips.innerHTML = (cfg.chips || []).map(function (l, i) { return '<button class="chip" data-act="chip" data-i="' + i + '" aria-label="‘' + l + '’라고 대답하기">“' + l + '”</button>'; }).join('') +
    '<button class="chip minor" data-act="chip-repeat" aria-label="‘다시 말해줘’라고 대답하기">“다시 말해줘”</button>';
}
function aiIntro() { S.misses = 0; S.silent = 0; renderChips(); var c = aiCfg(); if (c.say) aiSay(c.say); }
function aiOpen() {
  if (S.view === 'age') return;
  Voice.unlock();
  S.ai = true; aiEl.hidden = false; fab.hidden = true; fab.setAttribute('aria-expanded', 'true');
  aiLog.innerHTML = ''; aiWarn.textContent = ''; setListening(false); aiIntro();
  var b = document.getElementById('mic'); if (b) b.focus({ preventScroll: true });
}
function aiClose(silent) {
  S.ai = false; aiEl.hidden = true; Voice.stopSpeak(); Voice.stopListen(true); clearInterval(revealT); setListening(false);
  aiEl.classList.remove('speaking');
  fab.hidden = S.view === 'age'; fab.setAttribute('aria-expanded', 'false');
  if (!silent && !fab.hidden) fab.focus();
}
/** 어떤 대답이든 여기로 — 말(음성 인식), 대답 버튼, 모두 같은 길로 처리해요 */
function handleUtter(raw, alts, spoken) {
  S.silent = 0; addMe(raw);
  if (spoken) Voice.onCaption('내 말', raw);
  var before = S.view, cfg = aiCfg(), cands = [raw].concat(alts || []), out = null, u;
  // 1) 어디서나: 다시 말해 / 그만
  u = analyse(raw);
  if (/(다시\s?말|뭐라고|못\s?들|한\s?번\s?더|한번\s?더|다시\s?한)/.test(u.n)) return aiIntro();
  if (/(그만|종료|닫아|꺼\s?줘|끝낼래)/.test(u.n)) { aiSay('네, 그만할게요. 필요하시면 언제든 ‘AI 도우미’ 버튼을 눌러 주세요.', true); return setTimeout(function () { aiClose(); }, 3200); }
  // 2) 지금 질문에 대한 대답 (인식 후보를 차례로 시도)
  for (var i = 0; i < cands.length && out === null; i++) { u = analyse(cands[i]); out = cfg.on(u); }
  u = analyse(raw);
  // 3) 모르겠다고 할 때
  if (out === null && u.unsure && cfg.help) out = cfg.help;
  // 4) 어디서나 통하는 말
  if (out === null) {
    if (u.has('다음', '넘어가', '넘어 가')) out = (next() ? true : true);
    else if (u.has('이전', '뒤로', '돌아가')) { if (PREV[S.view]) { go(PREV[S.view]); out = true; } }
    else if (u.has('처음', '홈으로')) { go('home'); out = true; }
    else if (u.has('아주 크게')) out = setFont('xlarge');
    else if (u.has('크게', '안 보여', '안보여', '키워')) out = setFont(S.font === 'normal' ? 'large' : 'xlarge');
    else if (u.has('고대비', '어둡게', '눈부')) out = setTheme(S.theme === 'hc' ? 'default' : 'hc');
    else if (u.has('설정')) { go('settings'); out = true; }
    else if (u.has('상담', '사람 바꿔', '사람이랑')) out = '상담원 연결은 체험이라 생략했어요. 실제 앱에서는 바로 전화가 이어져요. ' + cfg.say;
    else if (u.has('도와', '어떻게', '뭐 해', '뭐해', '뭘 해', '뭘해')) out = cfg.help || cfg.say;
  }
  // 5) 못 알아들었을 때 — 화면을 보지 않아도 되도록 고를 수 있는 것을 다시 말로
  if (out === null) {
    S.misses++;
    out = (S.misses >= 2 ? '죄송해요, 제가 또 못 알아들었어요. 천천히 짧게 말씀해 주세요. ' : '죄송해요, 잘 못 알아들었어요. ') + (cfg.help && S.misses >= 2 ? cfg.help : cfg.say) + (S.misses >= 3 ? ' 어려우시면 ‘상담원’이라고 말씀해 주세요.' : '');
  } else S.misses = 0;
  if (S.view === before && S.ai) { if (typeof out === 'string') aiSay(out); renderChips(); }
}

/* =========================================================
   전시 패널
========================================================= */
function syncEx() {
  document.querySelectorAll('.ex-tg').forEach(function (b) {
    var a = b.getAttribute('data-act'), on = a === 'toggle-sr' ? S.sr : a === 'toggle-curtain' ? S.curtain : S.voice;
    b.setAttribute('aria-checked', String(on)); b.querySelector('.s').textContent = on ? '켜짐' : '꺼짐';
  });
  device.classList.toggle('sr-on', S.sr);
  document.getElementById('curtain').hidden = !S.curtain;
}
function envInfo() {
  var e = document.getElementById('ex-env'); if (!e) return;
  e.innerHTML = '<b>말 알아듣기:</b> ' + (Voice.canListen ? (Voice.secure ? '쓸 수 있어요' : 'https 주소에서만 돼요') : '이 브라우저는 안 돼요 (크롬·사파리 권장)') +
    '<br><b>카메라:</b> ' + (Cam.supported() ? '쓸 수 있어요' : 'https 주소에서만 돼요') + '<br><b>읽어 주기:</b> ' + (Voice.canSpeak ? '쓸 수 있어요' : '안 돼요');
}

/* =========================================================
   이벤트
========================================================= */
var ACT = {
  settings: function () { go('settings'); },
  'settings-back': function () { go(S.settingsBack || 'home'); },
  'settings-done': function () { var b = S.settingsBack || 'home'; if (b === 'intro' || b === 'home') return go('s1'); go(b); },
  'go-home': function () { go('home'); },
  claim: function () { if (!S.draft) { S.c = freshClaim(); S.week = null; S.shot = null; } go('intro'); },
  start: function () { if (!S.draft) { S.c = freshClaim(); S.week = null; } go('s1'); },
  resume: function () { go(ORDER[Math.max(0, S.draft - 1)]); },
  status: function () { if (S.done) go('done'); else tell('진행 중인 청구가 없어요.'), toast('진행 중인 청구가 없어요.'); },
  prev: function () { go(PREV[S.view] || 'home'); },
  next: next,
  tab: function (b) { if (b.getAttribute('data-i') !== '1') { toast('체험에서는 ‘내 보험’만 볼 수 있어요.'); announce('체험에서는 내 보험만 볼 수 있어요.'); } },
  search: function () { toast('검색은 체험에서 지원하지 않아요.'); },
  consult: function () { toast('상담 · 가입 안내는 체험에서 지원하지 않아요.'); },
  sms: function () { toast('010-1234-5678로 접수 내용을 보냈어요.'); announce('010-1234-5678로 접수 내용을 보냈어요.'); },
  exit: function () { var n = V[S.view].step || 1; S.draft = Math.max(S.draft, n); if (S.ai) aiClose(true); go('home'); tell(n + '단계까지 저장했어요. 이어서 하기를 누르면 다시 시작해요.'); },
  listen: function () { Voice.unlock(); say(V[S.view].say(), '소리 안내'); },
  details: function (b) { var d = document.getElementById('details'), open = d.hidden; d.hidden = !open; b.setAttribute('aria-expanded', String(open)); if (S.sr) say(describe(b), '스크린리더'); },
  'pick-day': function (b) { var d = new Date(+b.getAttribute('data-t')); setDate(d); var x = scr.querySelector('.day[aria-pressed=true]'); if (x) x.focus(); if (S.ai) aiSay('‘' + dateFb(d) + '’로 했어요.' + NEXT); else if (S.voice || S.sr) say('‘' + dateFb(d) + '’로 했어요', S.sr ? '스크린리더' : '소리 안내'); },
  'go-cam': function () { go('s6cam'); },
  'write-hosp': function () { S.writing = true; render({ quiet: true, focus: '#h-in', keepAi: true }); },
  'write-instead': function () { S.writing = true; go('s6', { focus: '#h-in' }); },
  'write-ok': function () { writeOk(); },
  shoot: function () { shoot(); },
  'speak-hosp': function () { Voice.unlock(); speakHospital(); },
  edit: function (b) { S.editing = true; go(b.getAttribute('data-to')); },
  'toggle-voice-ex': function () { S.voice = !S.voice; syncEx(); Voice.unlock(); if (S.voice) say(V[S.view].say(), '소리 안내'); else Voice.stopSpeak(); },
  'toggle-sr': function () { S.sr = !S.sr; syncEx(); Voice.unlock(); if (S.sr) say('스크린리더 체험을 켰어요. 탭 키나 오른쪽 화살표로 다음 항목을, 왼쪽 화살표로 이전 항목을 들을 수 있어요. 엔터로 누르세요.', '스크린리더'); else Voice.stopSpeak(); },
  'toggle-curtain': function () { S.curtain = !S.curtain; Voice.unlock(); if (S.curtain && !S.sr) { S.sr = true; say('화면을 가렸어요. 이제 소리만 듣고 청구해 보세요. 탭 키나 오른쪽 화살표로 이동하고, 엔터로 누르세요.', '스크린리더'); } syncEx(); },
  'ai-open': function () { aiOpen(); },
  'ai-close': function () { aiClose(); },
  mic: function () { Voice.unlock(); if (Voice.listening) { Voice.stopListen(true); setListening(false); aiStatus.textContent = '마이크를 누르고 말씀해 주세요'; } else { S.silent = 0; startListening(); } },
  chip: function (b) { var l = (aiCfg().chips || [])[+b.getAttribute('data-i')]; if (!l) return; Voice.stopListen(true); setListening(false); handleUtter(l); },
  'chip-repeat': function () { Voice.stopListen(true); handleUtter('다시 말해줘'); },
  'demo-ai': function () { if (S.view === 'age') { S.age = 'a3'; setFont('large', true); } S.c = freshClaim(); S.done = null; S.draft = 0; if (S.ai) aiClose(true); S.view = 'intro'; render({ quiet: true }); aiOpen(); },
  'demo-reset': function () { reset(); }
};
document.addEventListener('click', function (e) {
  Voice.unlock();
  var b = e.target.closest('[data-act]'); if (!b) return;
  var f = ACT[b.getAttribute('data-act')]; if (f) f(b, e);
});
document.addEventListener('change', function (e) {
  var t = e.target, c = S.c;
  if (!device.contains(t)) return;
  if (t.name === 'age') setAge(t.value);
  if (t.name === 'font') { S.fontTouched = true; setFont(t.value); }
  if (t.name === 'theme') setTheme(t.value);
  if (t.id === 'agree') c.consent = t.checked;
  if (t.name === 'who') { c.who = t.value; document.getElementById('who-detail').innerHTML = whoDetail(); }
  if (t.name === 'reason') { c.reason = t.value; setFb(pickedFb(t.value)); }
  if (t.name === 'dept') { c.dept = t.value; setFb(pickedFb(t.value)); }
  if (t.name === 'dk') {
    var k = t.value;
    if (k === 'today') setDate(TODAY, k); else if (k === 'yday') setDate(addDays(TODAY, -1), k); else if (k === '2day') setDate(addDays(TODAY, -2), k);
    else { c.dateKind = 'other'; c.date = null; S.week = addDays(weekOf(TODAY), -7); document.getElementById('cal').innerHTML = calHtml(); setFb(''); announce('지난주 달력이에요. 날짜를 눌러 주세요. 옆으로 밀면 다른 주가 나와요.'); }
  }
  if (t.name === 'hosp' && t.value === 'recent') pickHospital(RECENT.name, 'recent');
  if (t.name === 'acc') { c.account = t.value; setFb(t.value === 'reg' ? '‘' + BANK.name + ' ' + BANK.no + '’로 받아요' : '‘다른 계좌’로 받아요'); }
  if (t.id === 'album' && t.files && t.files[0]) Cam.fromFile(t.files[0]).then(processShot).catch(function () { tell('사진을 열 수 없어요. 다른 사진을 골라 주세요.'); });
  if (S.sr && (t.type === 'radio' || t.type === 'checkbox')) say(describe(t), '스크린리더');
  if (S.ai) renderChips();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && S.ai) { aiClose(); return; }
  if (e.target.id === 'h-in' && e.key === 'Enter') { e.preventDefault(); writeOk(); return; }
  // 달력: 화살표로 날짜 이동, 주 넘어가기
  if (!S.sr && e.target.classList && e.target.classList.contains('day') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    var i = +e.target.id.split('-')[1] + (e.key === 'ArrowRight' ? 1 : -1);
    if (i < 0) { shiftWeek(-1); i = 6; } else if (i > 6) { shiftWeek(1); i = 0; }
    var nb = document.getElementById('day-' + i); if (nb && !nb.disabled) nb.focus(); e.preventDefault(); return;
  }
  if (S.sr && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    var tg = e.target; if (tg.matches && tg.matches('input[type=text],input:not([type])')) return;
    if (!device.contains(tg) && tg !== document.body) return;
    e.preventDefault(); srMove(e.key === 'ArrowRight' ? 1 : -1);
  }
});
document.addEventListener('visibilitychange', function () { if (document.hidden) { Cam.close(); Voice.stopListen(true); } else if (S.view === 's6cam') startCam(); });

/* ---------------- 시작 ---------------- */
// 주소 끝 #home: 나이대 화면 건너뛰기 · #hc: 고대비로 시작 (발표·전시용)
if (/home/.test(location.hash)) S.view = 'home';
// 주소 끝 #sr: 스크린리더 체험을 켠 채로 시작 (휴대폰용 — 한 번 누르면 읽고, 두 번 누르면 실행)
if (/sr/.test(location.hash) || /[?&]sr\b/.test(location.search)) { S.sr = true; }
if (/hc/.test(location.hash)) setTheme('hc', true);
envInfo(); fit(); syncEx(); render({ quiet: true });

window.__monimo = { S: S, go: go, handleUtter: handleUtter, aiOpen: aiOpen };
})();
