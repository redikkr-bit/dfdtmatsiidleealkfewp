/**********************************************
 * index.js (멀티블록 + 안정된 테이블 레이아웃)
 **********************************************/

var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
    console.log("DOM 로드 완료");

    if (typeof DataAnalyzer === 'undefined') {
        $("#txtResult").text("DataAnalyzer 로드 실패");
        return;
    }

    try {
        dataAnalyzer = new DataAnalyzer();
        console.log("DataAnalyzer 초기화 완료");
    } catch (e) {
        console.error("DataAnalyzer 생성 실패:", e);
        $("#txtResult").text("DataAnalyzer 초기화 실패");
        return;
    }

    $("#btnScan").off("click").on("click", function (e) {
        e.preventDefault();
        if (!_isScanning) startScan();
        else stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 눌러주세요");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("카메라는 HTTPS 환경에서만 작동합니다.");
        return;
    }

    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 로드 실패!");
        return;
    }

    try {
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false
        });

        video.srcObject = _currentStream;
        await video.play();

        _isScanning = true;
        container.style.display = "flex";
        btn.text("스캔 중... (탭하면 중지)");

        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 시작");

        _codeReader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result && result.text) {
                console.log("스캔 성공:", result.text);
                stopScan(false);
                displayBarcodeResult(result.text);
            }
        });
    } catch (err) {
        alert("카메라 시작 실패: " + err.message);
        stopScan(true);
    }
}

/* ============================================================
 *  스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
    if (_codeReader) {
        try { _codeReader.reset(); } catch (e) {}
        _codeReader = null;
    }
    if (_currentStream) {
        _currentStream.getTracks().forEach(t => t.stop());
        _currentStream = null;
    }
    const video = document.getElementById("cameraPreview");
    if (video) video.srcObject = null;
    if (hide) document.getElementById("cameraContainer").style.display = "none";
    _isScanning = false;
    $("#btnScan").text("SCAN");
}

/* ============================================================
 *  스캔 결과 처리
 * ============================================================ */
function displayBarcodeResult(text) {
    $("#txtResult").html(text.replace(/\r?\n/g, "<br>"));
    if (!dataAnalyzer) return;

    dataAnalyzer.setBarcodeData(text);
    const totalBlocks = dataAnalyzer.getCount();
    console.log("총 블록 수:", totalBlocks);

    let allResultsHTML = "";
    for (let i = 0; i < totalBlocks; i++) {
        dataAnalyzer.setSelectIndex(i);
        allResultsHTML += `<div class="block-section"><div class="block-title">📦 Block ${i + 1}</div>`;
        allResultsHTML += dataAnalyzer.getFullViewData() + "</div><hr>";
    }

    $("#txtResult").html(allResultsHTML);
    setBarcodeSetMulti(totalBlocks);
}

/* ============================================================
 *  여러 블록 결과를 테이블에 반영
 * ============================================================ */
function setBarcodeSetMulti(blockCount) {
    setAllClear();

    for (let i = 0; i < blockCount; i++) {
        dataAnalyzer.setSelectIndex(i);
        const okng = dataAnalyzer.getCheckResult();
        const resultData = dataAnalyzer.getResultData();

        resultData.forEach(function (v) {
            const id = v[0];
            const res = v[1];
            const dat = v[2];

            if (res && dat) {
                $("#result" + id).html(res);
                $("#data" + id).html(dat);
            }
        });
    }

    // EO번호, 특이정보 등 표시 조건
    controlRowDisplay();
}

/* ============================================================
 *  테이블 행 표시 제어 (레이아웃 깨짐 방지)
 * ============================================================ */
function controlRowDisplay() {
    toggleRow("#tr13", $("#result13").html());
    toggleRow("#tr30", $("#result30").html());
    toggleRow("#tr31", $("#result31").html());
    toggleRow("#tr40", $("#result40").html());
}

function toggleRow(selector, content) {
    if (!content || content.trim() === "") $(selector).addClass("hidden-row");
    else $(selector).removeClass("hidden-row");
}

/* ============================================================
 *  테이블 초기화
 * ============================================================ */
function setAllClear() {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id=>{
        $("#result"+id).html("");
        $("#data"+id).html("");
    });
}
