/* =========================================================
   Cam — 영수증 촬영, 흐림·어두움 감지, 글자 읽기(OCR)
   - 카메라: getUserMedia (https 또는 localhost 필요)
   - 흐림 감지: 라플라시안 분산 (브라우저 안에서 계산, 사진은 밖으로 나가지 않아요)
   - 글자 읽기: Tesseract.js (오픈소스, 필요할 때만 불러와요)
========================================================= */
(function () {
  'use strict';
  var TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

  var Cam = {
    stream: null,
    SHARP_MIN: 45,   // 이보다 낮으면 '흐려요'
    BRIGHT_MIN: 50,  // 평균 밝기가 이보다 낮으면 '어두워요'

    supported: function () { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext !== false; },

    open: function (video) {
      if (!Cam.supported()) return Promise.reject(new Error('unsupported'));
      Cam.close();
      return navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false
      }).then(function (s) {
        Cam.stream = s;
        video.setAttribute('playsinline', ''); video.muted = true; video.srcObject = s;
        return video.play();
      });
    },
    close: function () {
      if (Cam.stream) { Cam.stream.getTracks().forEach(function (t) { t.stop(); }); Cam.stream = null; }
    },

    /** 영상에서 지금 화면을 캔버스로 */
    grab: function (video) {
      var w = video.videoWidth, h = video.videoHeight, k = Math.min(1, 1800 / Math.max(w, h));
      var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      return c;
    },
    /** 앨범 사진 파일을 캔버스로 */
    fromFile: function (file) {
      return new Promise(function (res, rej) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () {
          var k = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url); res(c);
        };
        img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('image')); };
        img.src = url;
      });
    },

    /** 사진 품질: { sharpness, brightness, sharp, bright } */
    quality: function (c) {
      var W = 420, k = W / c.width, w = W, h = Math.max(1, Math.round(c.height * k));
      var t = document.createElement('canvas'); t.width = w; t.height = h;
      var x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h), sum = 0, i;
      for (i = 0; i < w * h; i++) { g[i] = .299 * d[i * 4] + .587 * d[i * 4 + 1] + .114 * d[i * 4 + 2]; sum += g[i]; }
      var mean = sum / (w * h), s = 0, s2 = 0, n = 0;
      for (var y = 1; y < h - 1; y++) for (var xx = 1; xx < w - 1; xx++) {
        i = y * w + xx;
        var L = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
        s += L; s2 += L * L; n++;
      }
      var v = n ? s2 / n - Math.pow(s / n, 2) : 0;
      return { sharpness: Math.round(v), brightness: Math.round(mean), sharp: v >= Cam.SHARP_MIN, bright: mean >= Cam.BRIGHT_MIN };
    },

    _tess: null,
    loadOCR: function () {
      if (window.Tesseract) return Promise.resolve();
      if (Cam._tess) return Cam._tess;
      Cam._tess = new Promise(function (res, rej) {
        var s = document.createElement('script'); s.src = TESSERACT_URL; s.async = true;
        s.onload = function () { res(); }; s.onerror = function () { Cam._tess = null; rej(new Error('ocr-load')); };
        document.head.appendChild(s);
      });
      return Cam._tess;
    },
    /** 글자 읽기 → { hospital, amount, date, text } (못 읽으면 값이 null) */
    read: function (c, onProgress, timeoutMs) {
      var job = Cam.loadOCR().then(function () {
        return window.Tesseract.recognize(c, 'kor+eng', {
          logger: function (m) { if (onProgress && m.status === 'recognizing text') onProgress(m.progress); }
        });
      }).then(function (r) { return Cam.parse(r.data.text || ''); });
      var to = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, timeoutMs || 40000); });
      return Promise.race([job, to]);
    },
    parse: function (text) {
      var lines = text.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      var hre = /([가-힣A-Za-z0-9]{1,14}(?:정형외과|이비인후과|산부인과|비뇨의학과|비뇨기과|소아청소년과|소아과|신경외과|재활의학과|가정의학과|정신건강의학과|피부과|안과|치과|내과|외과|한의원|의원|병원|클리닉))/;
      var hospital = null;
      for (var i = 0; i < lines.length && !hospital; i++) {
        var m = lines[i].replace(/\s+/g, '').match(hre);
        if (m) hospital = m[1];
      }
      function money(s) {
        var ns = (s.match(/\d{1,3}(?:[,.]\d{3})+|\d{4,7}/g) || []).map(function (x) { return +x.replace(/[,.]/g, ''); })
          .filter(function (n) { return n >= 1000 && n <= 50000000; });
        return ns.length ? Math.max.apply(null, ns) : null;
      }
      var key = lines.filter(function (l) { return /(합계|총액|납부|수납|본인부담|청구|결제|금액)/.test(l.replace(/\s/g, '')); });
      var amount = null;
      for (var j = 0; j < key.length && !amount; j++) amount = money(key[j]);
      if (!amount) amount = money(text);
      var dm = text.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
      var date = dm ? new Date(+dm[1], +dm[2] - 1, +dm[3]) : null;
      if (date && (isNaN(date) || date > new Date())) date = null;
      return { hospital: hospital, amount: amount, date: date, text: text };
    }
  };
  window.Cam = Cam;
})();
