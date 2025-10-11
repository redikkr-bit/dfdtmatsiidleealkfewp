/**********************************************
*   index.js (iPhone Safari 대응 전체)
*   - ZXing 사용 실시간 스캔
*   - DataAnalyzer 연동 (기존 테이블 업데이트 로직 유지)
*   - HTTPS / 권한 / 로드타이밍 안정화 적용
**********************************************/

var dataAnalyzer = new DataAnalyzer();
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
  // SCAN 버튼 바인딩
  $("#btnScan").off("click").on("click", function () {
    if (!_isScanning) startScan(); else stopScan();
  });

  // 초기 상태 표시
  $("#txtResult").text("(스캔 또는 업로드 후 결과가 여기에 표시됩니다)");
});

/* ============================================================
 *  SCAN START
 * ============================================================ */
async function startScan() {
  const video = document.getElementById("cameraPreview");
  const container = document.getElementById("cameraContainer");
  const btn = $("#btnScan");

  // 환경 체크: HTTPS 필요 (localhost 허용)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    alert("⚠️ 카메라는 HTTPS 환경에서만 동작합니다. GitHub Pages(https)에서 실행하세요.");
    return;
  }

  // getUserMedia 지원 체크
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("이 브라우저는 카메라 API를 지원하지 않습니다.");
    return;
  }

  try {
    btn.prop("disabled", true).text("카메라 권한 요청 중...");

    // 카메라 스트림 요청 (후면 권장)
    _currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    // 비디오에 스트림 연결
    video.srcObject = _currentStream;
    await video.play().catch(()=>{}); // play 실패 무시

    container.style.display = "block";
    _isScanning = true;
    btn.text("스캔 중 (탭하면 중지)");

    // ZXing가 로드되어 있는지 확인, 없으면 동적 로드 시도
    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
      // 동적 로드 (네트워크 연결 필요)
      await loadZXingFromCDN();
      if (typeof ZXing === "undefined") {
        throw new Error("ZXing 라이브러리를 로드할 수 없습니다.");
      }
    }

    // 안정화 딜레이: iOS에서 WASM / video 준비 안정화 시간
    await new Promise(r => setTimeout(r, 600));

    // 코드 리더 초기화
    _codeReader = new ZXing.BrowserMultiFormatReader();

    // try: device list (label은 권한 후에 제공됨)
    let deviceId = null;
    try {
      const devs = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
      // 후면 카메라 찾기 (label에 'back','rear','environment','후면' 포함)
      const back = devs.find(d => /back|rear|environment|환경|후면/i.test(d.label));
      deviceId = back ? back.deviceId : (devs.length ? devs[0].deviceId : null);
    } catch (e) {
      // device list 실패해도 null 허용 (default camera)
      deviceId = null;
    }

    // decodeFromVideoDevice: deviceId null => default camera
    _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
      if (result && result.text) {
        // 성공적으로 인식됨
        try {
          // 멈추기/정리
          stopScan(false); // 화면 숨기지 말고 stream 중지 및 reader reset
        } catch (e) { console.warn(e); }

        // 결과 반영
        console.log("Scan result:", result.text);
        $("#txtResult").html(result.text.replace(/\r?\n/g, "<br>"));
        dataAnalyzer.setBarcodeData(result.text);
        setBarcodeSet();

        // 사용자에게 알림(선택)
        // alert("스캔 성공:\n" + result.text);
      }
      // err는 빈번히 발생(디코딩 실패), 무시
    });

  } catch (err) {
    console.error("startScan error:", err);
    alert("카메라 시작 실패: " + (err && err.message ? err.message : err));
    // cleanup
    stopScan(true);
  } finally {
    $("#btnScan").prop("disabled", false);
  }
}

/* ============================================================
 *  SCAN STOP / CLEANUP
 *  param keepVideoHide: true -> hide preview; false -> leave hidden logic
 * ============================================================ */
function stopScan(hidePreview = true) {
  // stop ZXing reader
  try {
    if (_codeReader) {
      _codeReader.reset();
      _codeReader = null;
    }
  } catch (e) { console.warn(e); }

  // stop media stream
  try {
    if (_currentStream) {
      _currentStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      _currentStream = null;
    }
  } catch (e) { console.warn(e); }

  // hide preview
  const container = document.getElementById("cameraContainer");
  if (hidePreview && container) container.style.display = "none";

  _isScanning = false;
  $("#btnScan").text("SCAN");
}

/* ============================================================
 *  ZXing 동적 로드 (CDN)
 * ============================================================ */
function loadZXingFromCDN() {
  return new Promise((resolve, reject) => {
    if (typeof ZXing !== "undefined" && ZXing.BrowserMultiFormatReader) return resolve();
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js";
    s.async = true;
    s.onload = function () { console.log("ZXing loaded from CDN"); resolve(); };
    s.onerror = function (e) { console.error("ZXing load error", e); reject(e); };
    document.head.appendChild(s);
  });
}

/* ============================================================
 *  기존 테이블 처리 로직 (당신의 원본 로직을 유지)
 *  setTabShowHidden, setBarcodeSet, setBarcodeResultDetail, setAllClear
 * ============================================================ */

function setTabShowHidden(cnt) {
  $(".tabButtonArea").hide();
  $("body").css("margin-bottom", "104px");
}

function setBarcodeSet() {
  $("#txtResult").html(dataAnalyzer.getFullViewData());
  setTabShowHidden(dataAnalyzer.getCount());
  $("body").scrollTop(0);
  return setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
  setAllClear();
  var okng = dataAnalyzer.getCheckResult();
  dataAnalyzer.getResultData().forEach(function (v) {
    $("#result" + v[0]).html(v[1]);
    if (v[0] == 12 && (v[2] == null || v[2] == "")) {
      $("#result12").html("-");
      $("#data12").html("<span class='gray'>데이터 없음</span>");
    } else {
      if (v[1].indexOf("OK") > -1 && (v[2] == "" || v[2] == null)) {
        $("#result" + v[0]).html("-");
      }
      $("#data" + v[0]).html(v[2]);
    }
  });

  // EO번호 행 처리
  if ($("#result13").html() == "") {
    $("#title_m10").attr("rowspan", "3");
    $("#tr13").hide();
  } else {
    $("#title_m10").attr("rowspan", "4");
    $("#tr13").show();
  }

  // 특이정보 / 초도품구분 처리
  if ($("#result30").html() != "" && $("#result31").html() != "") {
    $("#tr30").show();
    $("#tr31").show();
    $("#title_m30").attr("rowspan", "2");
  } else if ($("#result30").html() != "") {
    $("#tr30").show();
    $("#tr31").hide();
    $("#title_m30").attr("rowspan", "1");
  } else if ($("#result31").html() != "") {
    $("#tr30").hide();
    $("#tr31").show();
  } else {
    $("#tr30").hide();
    $("#tr31").hide();
  }

  // 업체영역 표시 여부
  if ($("#result40").html() == "") {
    $("#tr40").hide();
  } else {
    $("#tr40").show();
  }

  return okng;
}

function setAllClear() {
  for (let i of ["00", "10", "11", "12", "13", "20", "21", "22", "23", "30", "31", "40", "50"]) {
    $("#result" + i).html("");
    $("#data" + i).html("");
  }
}
