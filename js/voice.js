/* =========================================================
   Voice — 말하기(TTS)와 듣기(음성 인식)
   브라우저 내장 Web Speech API만 사용해요. (외부 서버·키 없음)
   - 말하기: speechSynthesis (거의 모든 브라우저)
   - 듣기:   SpeechRecognition / webkitSpeechRecognition
            (크롬·엣지·삼성 인터넷·안드로이드 크롬, 아이폰 사파리 14.5+)
   마이크는 https 주소(깃허브 페이지 등)나 localhost에서만 켜져요.
========================================================= */
(function () {
  'use strict';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var koVoice = null;
  function pickVoice() {
    try {
      var vs = speechSynthesis.getVoices();
      var ko = vs.filter(function (v) { return /^ko/i.test(v.lang); });
      // 자연스러운 목소리를 우선
      koVoice = ko.filter(function (v) { return /(Yuna|Google|Neural|Natural|SunHi|Heami)/i.test(v.name); })[0] || ko[0] || null;
    } catch (e) {}
  }
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}

  var seq = 0, rec = null, unlocked = false;
  var DESKTOP_CHROME = /Chrome\//.test(navigator.userAgent) && !/Mobile|Android|Edg\//.test(navigator.userAgent);

  var Voice = {
    canSpeak: 'speechSynthesis' in window,
    canListen: !!SR,
    secure: window.isSecureContext !== false,
    rate: 1,
    listening: false,
    onCaption: null,

    /** 첫 터치 때 한 번 호출 — 아이폰 사파리는 사용자 동작 없이 소리를 막아요. */
    unlock: function () {
      if (unlocked || !Voice.canSpeak) return;
      unlocked = true;
      try { var u = new SpeechSynthesisUtterance('.'); u.lang = 'ko-KR'; u.volume = 0.01; u.rate = 2; speechSynthesis.speak(u); } catch (e) {}
    },

    /** 말하기. 끝나면 onEnd 호출 (실패해도 호출). */
    speak: function (text, src, onEnd) {
      if (Voice.onCaption) Voice.onCaption(src || '소리 안내', text);
      var my = ++seq, started = false, done = false;
      function end() { if (done || my !== seq) return; done = true; if (onEnd) onEnd(); }
      if (!Voice.canSpeak) { setTimeout(end, Math.min(9000, 600 + text.length * 70)); return my; }
      try {
        var busy = speechSynthesis.speaking || speechSynthesis.pending;
        if (busy) speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR'; u.rate = Voice.rate; u.pitch = 1;
        if (koVoice) u.voice = koVoice;
        u.onstart = function () { started = true; };
        u.onend = end; u.onerror = end;
        // 아이폰은 누른 순간에 바로 말해야 소리가 나요 → 기다릴 필요가 없으면 바로 말하기
        if (busy && DESKTOP_CHROME) setTimeout(function () { if (my === seq) speechSynthesis.speak(u); }, 60); else speechSynthesis.speak(u);
        // 크롬이 15초 넘는 문장을 멈추는 문제 방지
        var keep = !DESKTOP_CHROME ? 0 : setInterval(function () {
          if (my !== seq || done) return clearInterval(keep);
          try { if (speechSynthesis.speaking) { speechSynthesis.pause(); speechSynthesis.resume(); } } catch (e) {}
        }, 10000);
        // 소리가 아예 시작되지 않는 환경 대비
        setTimeout(function () { if (!started) end(); }, 2500 + text.length * 80);
        setTimeout(end, 45000);
      } catch (e) { setTimeout(end, 600 + text.length * 70); }
      return my;
    },
    stopSpeak: function () { seq++; try { speechSynthesis.cancel(); } catch (e) {} },
    isSpeaking: function () { try { return speechSynthesis.speaking; } catch (e) { return false; } },

    /**
     * 한 번 듣기. h = {onStart, onInterim(text), onFinal(text, alternatives[]), onEnd(), onError(code)}
     * 오류 코드: not-allowed(권한 거부) · service-not-allowed · audio-capture(마이크 없음) · network · unsupported · insecure
     */
    listen: function (h) {
      h = h || {};
      if (!SR) { if (h.onError) h.onError('unsupported'); return false; }
      if (!Voice.secure) { if (h.onError) h.onError('insecure'); return false; }
      Voice.stopListen(true);
      var r = new SR();
      r.lang = 'ko-KR'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 3;
      var finalText = '', alts = [], err = null, got = false;
      r.onstart = function () { Voice.listening = true; if (h.onStart) h.onStart(); };
      r.onresult = function (e) {
        var interim = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var res = e.results[i];
          if (res.isFinal) {
            got = true; finalText += res[0].transcript;
            for (var a = 1; a < res.length; a++) alts.push(res[a].transcript);
          } else interim += res[0].transcript;
        }
        if (interim && h.onInterim) h.onInterim(interim);
        if (got) { try { r.stop(); } catch (x) {} }
      };
      r.onerror = function (e) { err = e.error; };
      r.onend = function () {
        Voice.listening = false; if (rec === r) rec = null;
        if (r._aborted) return;
        if (got && finalText.trim()) { if (h.onFinal) h.onFinal(finalText.trim(), alts); }
        else if (err && err !== 'no-speech' && err !== 'aborted') { if (h.onError) h.onError(err); }
        else if (h.onEnd) h.onEnd();
      };
      try { r.start(); rec = r; return true; }
      catch (e) { if (h.onError) h.onError('start'); return false; }
    },
    stopListen: function (silent) {
      if (!rec) return;
      var r = rec; rec = null; Voice.listening = false;
      if (silent) r._aborted = true;
      try { silent ? r.abort() : r.stop(); } catch (e) {}
    },

    /** 오류 코드를 사람 말로 */
    errorText: function (code) {
      switch (code) {
        case 'not-allowed': case 'service-not-allowed': return '마이크 권한이 꺼져 있어요. 주소창 옆 자물쇠를 눌러 마이크를 허용해 주세요.';
        case 'audio-capture': return '마이크를 찾지 못했어요. 마이크가 연결돼 있는지 확인해 주세요.';
        case 'network': return '음성 인식에 인터넷 연결이 필요해요. 연결을 확인해 주세요.';
        case 'unsupported': return '이 브라우저는 음성 인식을 지원하지 않아요. 크롬이나 사파리로 열어 주세요.';
        case 'insecure': return '마이크는 https 주소에서만 켜져요. 깃허브 페이지 주소로 열어 주세요.';
        default: return '잘 듣지 못했어요. 다시 말씀해 주세요.';
      }
    }
  };
  window.Voice = Voice;
})();
