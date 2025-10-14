/**********************************************
*   index.js (iOS Safari 대응 + 멀티블록 + 안정화)
**********************************************/

var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
    console.log("📱 페이지 로드 완료");

    if (typeof DataAnalyzer === "undefined") {
        $("#txtResult").text("⚠️ DataAnalyzer 로드 실패");
        return;
    }

    try {
        dataAnalyzer = new DataAnalyzer();
    } catch (e) {
        $("#txtResult").text("DataAnalyzer 초기화 오류: " + e.message);
        return;
    }

    $("#btnScan").on("click", function (e) {
        e.preventDefault();
        if (_isScanning) stopScan();
        else startScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

/* ============================================================
 *  카메라 스캔 시작
 * ============================================================ */
async function startScan() {
    console.log("🎥 startScan() 실행");

    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!video || !container) return alert("카메라 요소를 찾을 수 없습니다.");

    if (location.protocol !== "https:" && location.hostname !== "localhost") {
        alert("⚠️ Safari에서는 HTTPS 환경에서만 카메라 접근이 가능합니다.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라 API를 지원하지 않습니다.");
        return;
    }

    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리를 로드할 수 없습니다.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 접근 중...");

        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

        video.srcObject = _currentStream;
        await video.play();

        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing Reader 활성화");

        _codeReader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result && result.text) {
                console.log("✅ 스캔 성공:", result.text);
                stopScan(false);
                displayBarcodeBlocks(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("⚠️ 디코딩 에러:", err);
            }
        });
    } catch (err) {
        console.error("카메라 실행 오류:", err);
        alert("카메라 실행 실패: " + err.message);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

/* ============================================================
 *  카메라 스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
    console.log("🛑 stopScan() 호출");

    if (_codeReader) {
        try {
            _codeReader.reset();
        } catch {}
        _codeReader = null;
    }

    if (_currentStream) {
        _currentStream.getTracks().forEach(track => track.stop());
        _currentStream = null;
    }

    const video = document.getElementById("cameraPreview");
    if (video) video.srcObject = null;

    if (hide) document.getElementById("cameraContainer").style.display = "none";

    _isScanning = false;
    $("#btnScan").text("SCAN");
}

/* ============================================================
 *  멀티 블록 표시 + 안전한 텍스트 처리
 * ============================================================ */
function displayBarcodeBlocks(text) {
    console.log("📦 원본 스캔 데이터:", text);

    // 안전하게 HTML로 표시
    const safeText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r?\n/g, "<br>")
        .replace(/[\x00-\x1F\x7F]/g, c => {
            const code = c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
            return `<span class="ctrl">[0x${code}]</span>`;
        });

    $("#txtResult").html(safeText);

    // 분석 실행
    if (!dataAnalyzer) return;
    try {
        dataAnalyzer.setBarcodeData(text);
    } catch (e) {
        $("#txtResult").append("<br>⚠️ 분석 실패: " + e.message);
        return;
    }

    const totalBlocks = dataAnalyzer.getCount();
    console.log("총 블록 수:", totalBlocks);

    // 이전 결과 제거
    $("#multiBlockContainer").remove();

    const container = $("<div id='multiBlockContainer'></div>");
    $("#resultTable").after(container);

    for (let i = 0; i < totalBlocks; i++) {
        dataAnalyzer.setSelectIndex(i);

        const blockHTML = $("<div class='blockWrap'></div>");
        blockHTML.append(`<div class='blockTitle'>📦 Block ${i + 1}</div>`);

        const tableClone = $("#resultTable table").first().clone(true);
        tableClone.find("td").html("");
        blockHTML.append(tableClone);
        container.append(blockHTML);

        fillBlockTable(tableClone);
    }
}

/* ============================================================
 *  각 블록 테이블 채우기
 * ============================================================ */
function fillBlockTable(table) {
    setAllClear(table);

    const okng = dataAnalyzer.getCheckResult();
    dataAnalyzer.getResultData().forEach(function (v) {
        table.find("#result" + v[0]).html(v[1]);
        table.find("#data" + v[0]).html(v[2] || "-");
    });

    // EO 번호가 없을 경우 행 숨김
    if (table.find("#result13").html() === "") table.find("#tr13").hide();
    else table.find("#tr13").show();

    // 부가 정보
    const has30 = table.find("#result30").html() !== "";
    const has31 = table.find("#result31").html() !== "";
    if (!has30 && !has31) {
        table.find("#tr30, #tr31").hide();
    } else {
        table.find("#tr30, #tr31").show();
    }

    // 업체영역
    if (table.find("#result40").html() === "") table.find("#tr40").hide();
    else table.find("#tr40").show();

    return okng;
}

/* ============================================================
 *  테이블 초기화
 * ============================================================ */
function setAllClear(table) {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id => {
        table.find("#result" + id).html("");
        table.find("#data" + id).html("");
    });
}
