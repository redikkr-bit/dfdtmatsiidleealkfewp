/**********************************************
*   index.js (Safari 대응 / 로컬 ZXing 버전)
**********************************************/

var dataAnalyzer = new DataAnalyzer();
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
  $("#btnScan").off("click").on("click", function () {
    if (!_isScanning) startScan(); else stopScan();
  });
  $("#txtResult").text("(스캔 대기 중)");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
  const video = document.getElementById("cameraPreview");
  const container = document.getElementById("cameraContainer");
  const btn = $("#btnScan");

  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    alert("⚠️ HTTPS 환경에서만 카메라가 작동합니다.");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("이 브라우저는 카메라 API를 지원하지 않습니다.");
    return;
  }

  try {
    btn.prop("disabled", true).text("카메라 초기화 중...");

    // ZXing 로드 확인
    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
      console.warn("ZXing 라이브러리 미로드, 백업 로드 시도");
      await loadZXingFromLocal();
    }

    _currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    video.srcObject = _currentStream;
    await video.play();

    container.style.display = "flex";
    _isScanning = true;
    btn.text("스캔 중... (탭하면 중지)");

    _codeReader = new ZXing.BrowserMultiFormatReader();

    let deviceId = null;
    try {
      const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
      const back = devices.find(d => /back|rear|environment|후면/i.test(d.label));
      deviceId = back ? back.deviceId : (devices[0] ? devices[0].deviceId : null);
    } catch (e) { deviceId = null; }

    _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
      if (result && result.text) {
        console.log("스캔 결과:", result.text);
        stopScan(false);
        $("#txtResult").html(result.text.replace(/\r?\n/g, "<br>"));
        dataAnalyzer.setBarcodeData(result.text);
        setBarcodeSet();
      }
    });

  } catch (err) {
    console.error("startScan error:", err);
    alert("카메라 시작 실패: " + (err.message || err));
    stopScan(true);
  } finally {
    btn.prop("disabled", false);
  }
}

/* ============================================================
 *  스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
  try {
    if (_codeReader) {
      _codeReader.reset();
      _codeReader = null;
    }
  } catch (e) {}

  try {
    if (_currentStream) {
      _currentStream.getTracks().forEach(t => t.stop());
      _currentStream = null;
    }
  } catch (e) {}

  if (hide) {
    const container = document.getElementById("cameraContainer");
    if (container) container.style.display = "none";
  }

  _isScanning = false;
  $("#btnScan").text("SCAN");
}

/* ============================================================
 *  ZXing 로컬 로드 (백업용)
 * ============================================================ */
function loadZXingFromLocal() {
  return new Promise((resolve, reject) => {
    if (typeof ZXing !== "undefined") return resolve();
    const s = document.createElement("script");
    s.src = "js/zxing.min.js";
    s.onload = () => { console.log("ZXing loaded from local"); resolve(); };
    s.onerror = e => { console.error("ZXing load error", e); reject(e); };
    document.head.appendChild(s);
  });
}

/* ============================================================
 *  DataAnalyzer 연동 (기존 검증 로직)
 * ============================================================ */
function setBarcodeSet() {
  $("#txtResult").html(dataAnalyzer.getFullViewData());
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

  // EO번호, 부가정보 표시
  if ($("#result13").html() == "") { $("#tr13").hide(); } else { $("#tr13").show(); }
  if ($("#result30").html() == "" && $("#result31").html() == "") {
    $("#tr30").hide(); $("#tr31").hide();
  } else {
    $("#tr30").show(); $("#tr31").show();
  }

  // 업체영역
  if ($("#result40").html() == "") $("#tr40").hide(); else $("#tr40").show();
  return okng;
}

function setAllClear() {
  ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id=>{
    $("#result"+id).html("");
    $("#data"+id).html("");
  });
}
