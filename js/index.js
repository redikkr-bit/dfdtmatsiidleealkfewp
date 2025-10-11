/**********************************************
*   index.js (수정된 버전)
*   - iOS Safari 웹앱 모드 대응 강화
*   - ZXing 로드 실패 대비 개선
*   - 비디오 재생 처리 개선
**********************************************/

var dataAnalyzer = new DataAnalyzer();
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
  // SCAN 버튼 바인딩 - iOS 호환성 개선
  $("#btnScan").off("click").on("click", function (e) {
    e.preventDefault();
    if (!_isScanning) {
      startScan();
    } else {
      stopScan();
    }
  });

  // 초기 상태 표시
  $("#txtResult").text("(스캔 또는 업로드 후 결과가 여기에 표시됩니다)");
  
  // iOS 웹앱 모드 감지 및 안내
  if (window.navigator.standalone) {
    console.log('iOS 웹앱 모드에서 실행 중');
  }
});

/* ============================================================
 *  SCAN START (수정된 버전)
 * ============================================================ */
async function startScan() {
  const video = document.getElementById("cameraPreview");
  const container = document.getElementById("cameraContainer");
  const btn = $("#btnScan");

  // iOS 웹앱 모드 체크 및 안내
  if (window.navigator.standalone) {
    const shouldContinue = confirm(
      "iOS 웹앱 모드에서는 카메라 기능에 제한이 있을 수 있습니다.\n" +
      "정식 Safari 브라우저에서 열면 더 원활하게 사용할 수 있습니다.\n\n" +
      "계속 진행하시겠습니까?"
    );
    if (!shouldContinue) return;
  }

  // 환경 체크: HTTPS 필요 (localhost 허용)
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    alert("⚠️ 카메라는 HTTPS 환경에서만 동작합니다. GitHub Pages(https)에서 실행하세요.");
    return;
  }

  // getUserMedia 지원 체크
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("이 브라우저는 카메라 API를 지원하지 않습니다. iOS 11+ 또는 최신 브라우저를 사용해주세요.");
    return;
  }

  try {
    btn.prop("disabled", true).text("카메라 권한 요청 중...");

    // ZXing 라이브러리 먼저 로드 확인
    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
      btn.text("라이브러리 로드 중...");
      await loadZXingFromCDN();
    }

    // 카메라 스트림 요청 (iOS 호환성 개선)
    _currentStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: { ideal: "environment" },
        // iOS 호환성을 위한 추가 설정
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    // 비디오에 스트림 연결 및 재생
    video.srcObject = _currentStream;
    
    // iOS 비디오 재생 처리 개선
    try {
      await video.play();
      console.log("비디오 재생 성공");
    } catch (playError) {
      console.warn("비디오 자동 재생 실패:", playError);
      // iOS에서는 사용자 상호작용 필요할 수 있음
      alert("카메라 미리보기를 시작할 수 없습니다. 화면을 탭해주세요.");
    }

    container.style.display = "flex"; // flex로 변경하여 중앙 정렬
    _isScanning = true;
    btn.text("스캔 중 (탭하면 중지)");

    // iOS에서 WASM 준비를 위한 추가 대기 시간
    await new Promise(r => setTimeout(r, 1000));

    // 코드 리더 초기화
    _codeReader = new ZXing.BrowserMultiFormatReader();
    
    // 디코딩 타임아웃 설정 (iOS 최적화)
    _codeReader.timeBetweenDecodingAttempts = 500;

    let deviceId = null;
    try {
      const devs = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
      const back = devs.find(d => /back|rear|environment|환경|후면/i.test(d.label));
      deviceId = back ? back.deviceId : (devs.length ? devs[0].deviceId : null);
      console.log("선택된 카메라:", back ? '후면' : '기본');
    } catch (e) {
      console.warn("카메라 목록 조회 실패, 기본 카메라 사용:", e);
      deviceId = null;
    }

    // 디코딩 시작
    _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
      if (result && result.text) {
        console.log("스캔 성공:", result.text);
        
        // 결과 처리
        stopScan(false);
        $("#txtResult").html(result.text.replace(/\r?\n/g, "<br>"));
        
        // DataAnalyzer 처리
        if (dataAnalyzer && typeof dataAnalyzer.setBarcodeData === 'function') {
          dataAnalyzer.setBarcodeData(result.text);
          setBarcodeSet();
        } else {
          $("#txtResult").html("스캔 성공: " + result.text + "<br><small>DataAnalyzer 로드 실패</small>");
        }
      }
      
      if (err && !(err instanceof ZXing.NotFoundException)) {
        console.warn("디코딩 에러:", err);
      }
    });

  } catch (err) {
    console.error("startScan error:", err);
    
    let errorMessage = "카메라 시작 실패: ";
    if (err.name === 'NotAllowedError') {
      errorMessage += "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.";
    } else if (err.name === 'NotFoundError') {
      errorMessage += "카메라를 찾을 수 없습니다.";
    } else if (err.name === 'NotSupportedError') {
      errorMessage += "카메라 기능을 지원하지 않는 브라우저입니다.";
    } else {
      errorMessage += err.message || err;
    }
    
    alert(errorMessage);
    stopScan(true);
  } finally {
    $("#btnScan").prop("disabled", false);
  }
}

/* ============================================================
 *  SCAN STOP / CLEANUP (수정된 버전)
 * ============================================================ */
function stopScan(hidePreview = true) {
  console.log("스캔 중지");
  
  // ZXing 리더 정리
  try {
    if (_codeReader) {
      _codeReader.reset();
      _codeReader.stopContinuousDecode();
      _codeReader = null;
    }
  } catch (e) { 
    console.warn("ZXing 정리 중 에러:", e);
  }

  // 미디어 스트림 정리
  try {
    if (_currentStream) {
      _currentStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn("트랙 정리 중 에러:", e);
        }
      });
      _currentStream = null;
    }
  } catch (e) { 
    console.warn("스트림 정리 중 에러:", e);
  }

  // 비디오 요소 정리
  const video = document.getElementById("cameraPreview");
  if (video) {
    video.srcObject = null;
  }

  // 프리뷰 숨기기
  const container = document.getElementById("cameraContainer");
  if (hidePreview && container) {
    container.style.display = "none";
  }

  _isScanning = false;
  $("#btnScan").text("SCAN").prop("disabled", false);
}

/* ============================================================
 *  ZXing 동적 로드 (개선된 버전)
 * ============================================================ */
function loadZXingFromCDN() {
  return new Promise((resolve, reject) => {
    if (typeof ZXing !== "undefined" && ZXing.BrowserMultiFormatReader) {
      return resolve();
    }
    
    // 이미 로드 시도 중인지 확인
    if (window._zxingLoading) {
      const checkInterval = setInterval(() => {
        if (typeof ZXing !== "undefined" && ZXing.BrowserMultiFormatReader) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("ZXing 로드 타임아웃"));
      }, 10000);
      return;
    }
    
    window._zxingLoading = true;
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js";
    s.async = true;
    s.onload = function () { 
      console.log("ZXing 동적 로드 성공");
      window._zxingLoading = false;
      resolve(); 
    };
    s.onerror = function (e) { 
      console.error("ZXing 로드 실패", e);
      window._zxingLoading = false;
      reject(new Error("ZXing 라이브러리를 로드할 수 없습니다. 인터넷 연결을 확인해주세요.")); 
    };
    document.head.appendChild(s);
  });
}

// 기존 함수들은 동일하게 유지
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

  if ($("#result13").html() == "") {
    $("#title_m10").attr("rowspan", "3");
    $("#tr13").hide();
  } else {
    $("#title_m10").attr("rowspan", "4");
    $("#tr13").show();
  }

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
