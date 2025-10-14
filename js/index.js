/**********************************************
 * index.js (멀티 블록 + 테이블 레이아웃 고정 버전)
 **********************************************/

var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
    console.log("DOM 로드 완료");

    // DataAnalyzer 확인
    if (typeof DataAnalyzer === "undefined") {
        $("#txtResult").text("⚠️ DataAnalyzer 로드 실패");
        return;
    }

    try {
        dataAnalyzer = new DataAnalyzer();
        console.log("DataAnalyzer 초기화 성공");
    } catch (e) {
        $("#txtResult").text("DataAnalyzer 초기화 실패: " + e.message);
        return;
    }

    $("#btnScan").off("click").on("click", function (e) {
        e.preventDefault();
        if (!_isScanning) startScan();
        else stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 누르세요");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("⚠️ 카메라는 HTTPS 환경에서만 작동합니다.");
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
                displayBarcodeBlocks(result.text);
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
 *  멀티 블록 결과 표시
 * ============================================================ */
function displayBarcodeBlocks(text) {
    $("#txtResult").html(text.replace(/\r?\n/g, "<br>"));
    if (!dataAnalyzer) return;

    dataAnalyzer.setBarcodeData(text);
    const totalBlocks = dataAnalyzer.getCount();
    console.log("총 블록 수:", totalBlocks);

    // 기존 결과 영역 초기화
    $("#multiBlockContainer").remove();

    // Block container 새로 생성
    const container = $("<div id='multiBlockContainer'></div>");
    $("#resultTable").after(container);

    for (let i = 0; i < totalBlocks; i++) {
        dataAnalyzer.setSelectIndex(i);

        const blockHTML = $("<div class='blockWrap'></div>");
        blockHTML.append(`<div class='blockTitle'>📦 Block ${i + 1}</div>`);

        // 원본 테이블 복제
        const tableClone = $("#resultTable table").first().clone(true);
        tableClone.find("td").html(""); // 초기화
        blockHTML.append(tableClone);

        container.append(blockHTML);

        // 각 블록 데이터 삽입
        fillBlockTable(tableClone, dataAnalyzer);
    }

    $("body").scrollTop(0);
}

/* ============================================================
 *  블록별 데이터 채우기
 * ============================================================ */
function fillBlockTable(table, analyzer) {
    const resultData = analyzer.getResultData();
    const okng = analyzer.getCheckResult();

    resultData.forEach(v => {
        const id = v[0];
        const res = v[1];
        const dat = v[2];
        table.find("#result" + id).html(res || "");
        table.find("#data" + id).html(dat || "");
    });

    // EO, 특이정보 등 행 표시 유지
    const has13 = table.find("#result13").text().trim() !== "";
    const has30 = table.find("#result30").text().trim() !== "";
    const has31 = table.find("#result31").text().trim() !== "";
    const has40 = table.find("#result40").text().trim() !== "";

    table.find("#tr13").toggle(has13);
    table.find("#tr30").toggle(has30);
    table.find("#tr31").toggle(has31);
    table.find("#tr40").toggle(has40);
}

/* ============================================================
 *  테이블 클리어
 * ============================================================ */
function setAllClear() {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id=>{
        $("#result"+id).html("");
        $("#data"+id).html("");
    });
}
