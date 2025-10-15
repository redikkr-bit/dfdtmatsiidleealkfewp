/**********************************************
*   index.js (iOS Safari 대응 + 다중 블록 표시)
**********************************************/

var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
    console.log("DOM Ready");

    if (typeof DataAnalyzer === 'undefined') {
        alert("DataAnalyzer.js 로드 실패!");
        return;
    }

    dataAnalyzer = new DataAnalyzer();
    dataAnalyzer.setSelectIndex(0);

    $("#btnScan").on("click", function () {
        if (!_isScanning) startScan();
        else stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라를 지원하지 않습니다.");
        return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("⚠️ HTTPS 환경에서만 작동합니다.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 접근 중...");
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });

        video.srcObject = _currentStream;
        await video.play();

        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        _codeReader = new ZXing.BrowserMultiFormatReader();
        const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
        const backCam = devices.find(d => /back|rear|environment/i.test(d.label));
        const deviceId = backCam ? backCam.deviceId : devices[0]?.deviceId;

        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("스캔 성공:", result.text);
                stopScan(false);
                handleBarcode(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("디코딩 오류:", err);
            }
        });
    } catch (err) {
        alert("카메라 시작 실패: " + err.message);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

/* ============================================================
 *  스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
    if (_codeReader) {
        try { _codeReader.reset(); } catch {}
        _codeReader = null;
    }
    if (_currentStream) {
        _currentStream.getTracks().forEach(t => t.stop());
        _currentStream = null;
    }
    const video = document.getElementById("cameraPreview");
    if (video) video.srcObject = null;
    if (hide) $("#cameraContainer").hide();

    _isScanning = false;
    $("#btnScan").text("SCAN");
}

/* ============================================================
 *  결과 표시
 * ============================================================ */
function handleBarcode(text) {
    $("#txtResult").html(text.replace(/\r?\n/g, "<br>"));
    dataAnalyzer.setBarcodeData(text);
    setBarcodeSet();
}

function setBarcodeSet() {
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    dataAnalyzer.setSelectIndex(0);
    setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
    setAllClear();
    const results = dataAnalyzer.getResultData();
    results.forEach(v => {
        $("#result" + v[0]).html(v[1]);
        $("#data" + v[0]).html(v[2] || "-");
    });
}

function setAllClear() {
    ["00","10","11","12","13","20","40","50"].forEach(id=>{
        $("#result"+id).html("");
        $("#data"+id).html("");
    });
}
