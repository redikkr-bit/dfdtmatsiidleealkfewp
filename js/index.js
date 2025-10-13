/**********************************************
*   index.js (iOS Safari 대응 + 레이아웃 유지)
**********************************************/

// 전역 변수
var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

// DOM 로드 후 실행
$(function () {
    console.log("DOM 로드 완료, 버튼 이벤트 바인딩 시도");
    
    if (typeof DataAnalyzer === 'undefined') {
        console.error("DataAnalyzer 로드 실패!");
        $("#txtResult").text("DataAnalyzer 로드 실패 - 파일을 확인해주세요");
        return;
    }
    
    try {
        dataAnalyzer = new DataAnalyzer();
        console.log("DataAnalyzer 초기화 성공");
    } catch (e) {
        console.error("DataAnalyzer 생성 실패:", e);
        $("#txtResult").text("DataAnalyzer 초기화 실패: " + e.message);
        return;
    }

    const $btnScan = $("#btnScan");
    if ($btnScan.length === 0) {
        console.error("SCAN 버튼을 찾을 수 없음!");
        return;
    }

    $btnScan.off("click").on("click", function (e) {
        e.preventDefault();
        console.log("SCAN 버튼 클릭됨 - 상태:", _isScanning ? "스캔중" : "대기중");
        if (!_isScanning) startScan();
        else stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
    console.log("버튼 이벤트 바인딩 완료");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    console.log("startScan() 함수 실행");
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!video || !container) {
        alert("카메라 요소를 찾을 수 없습니다.");
        return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("⚠️ 카메라 기능은 HTTPS 환경에서만 작동합니다.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라 API를 지원하지 않습니다.\niOS 11+ 또는 최신 브라우저를 사용해주세요.");
        return;
    }

    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리를 로드할 수 없습니다.\n인터넷 연결을 확인해주세요.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 권한 요청 중...");

        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

        video.srcObject = _currentStream;
        try { await video.play(); } catch (e) { console.warn("비디오 자동 재생 제한:", e); }

        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 생성됨");

        let deviceId = null;
        try {
            const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
            const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label));
            deviceId = backCam ? backCam.deviceId : (devices[0]?.deviceId ?? null);
        } catch (e) {
            console.warn("카메라 목록 조회 실패:", e);
        }

        console.log("바코드 디코딩 시작...");
        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("바코드 스캔 성공:", result.text);
                stopScan(false);
                $("#txtResult").html(result.text.replace(/\r?\n/g, "<br>"));
                if (dataAnalyzer && typeof dataAnalyzer.setBarcodeData === 'function') {
                    dataAnalyzer.setBarcodeData(result.text);
                    setBarcodeSet();
                } else {
                    $("#txtResult").html("스캔 성공: " + result.text + "<br>DataAnalyzer 사용 불가");
                }
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("디코딩 에러:", err);
            }
        });
    } catch (err) {
        console.error("startScan 에러:", err);
        let msg = "카메라 시작 실패: ";
        if (err.name === 'NotAllowedError') msg = "카메라 권한이 거부되었습니다. 설정에서 허용해주세요.";
        else if (err.name === 'NotFoundError') msg = "카메라를 찾을 수 없습니다.";
        else msg += err.message || err;
        alert(msg);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

/* ============================================================
 *  스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
    console.log("stopScan() 호출");
    if (_codeReader) {
        try { _codeReader.reset(); } catch (e) { console.warn("ZXing 리셋 에러:", e); }
        _codeReader = null;
    }

    if (_currentStream) {
        try {
            _currentStream.getTracks().forEach(t => t.stop());
            _currentStream = null;
        } catch (e) { console.warn("스트림 종료 중 에러:", e); }
    }

    const video = document.getElementById("cameraPreview");
    if (video) video.srcObject = null;

    if (hide) {
        const container = document.getElementById("cameraContainer");
        if (container) container.style.display = "none";
    }

    _isScanning = false;
    $("#btnScan").text("SCAN");
}

/* ============================================================
 *  데이터 표시 및 테이블 업데이트 (Safari 대응)
 * ============================================================ */
function setBarcodeSet() {
    if (!dataAnalyzer) {
        console.error("DataAnalyzer가 초기화되지 않음");
        return;
    }
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    $("body").scrollTop(0);
    return setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
    setAllClear();
    if (!dataAnalyzer) return;

    var okng = dataAnalyzer.getCheckResult();
    dataAnalyzer.getResultData().forEach(function (v) {
        $("#result" + v[0]).html(v[1]);
        if (v[0] == 12 && (v[2] == null || v[2] == "")) {
            $("#result12").html("-");
            $("#data12").html("<span class='gray'>데이터 없음</span>");
        } else {
            if (v[1].includes("OK") && (!v[2] || v[2] === "")) {
                $("#result" + v[0]).html("-");
            }
            $("#data" + v[0]).html(v[2]);
        }
    });

    // EO번호
    if ($("#result13").html() === "")
        $("#tr13").css("visibility", "collapse");
    else
        $("#tr13").css("visibility", "visible");

    // 부가정보 (특이정보, 초도품)
    if ($("#result30").html() === "" && $("#result31").html() === "") {
        $("#tr30, #tr31").css("visibility", "collapse");
    } else {
        $("#tr30, #tr31").css("visibility", "visible");
    }

    // 업체영역
    if ($("#result40").html() === "")
        $("#tr40").css("visibility", "collapse");
    else
        $("#tr40").css("visibility", "visible");

    // ✅ rowspan 고정 (Safari 대응)
    $("#title_m10").attr("rowspan", "4");
    $("#title_m30").attr("rowspan", "2");

    return okng;
}

/* ============================================================
 *  초기화
 * ============================================================ */
function setAllClear() {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id=>{
        $("#result"+id).html("");
        $("#data"+id).html("");
    });
}
