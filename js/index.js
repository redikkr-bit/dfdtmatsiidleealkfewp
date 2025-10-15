/**********************************************
 *   index.js (iOS Safari 대응 + 멀티 블록 스캔)
 **********************************************/

let dataAnalyzer = null;
let scanner = null;
let scannedCodes = [];
let scanTimer = null;
let _isScanning = false;

$(function () {
    console.log("📦 DOM 로드 완료");

    if (typeof DataAnalyzer === "undefined") {
        $("#txtResult").text("❌ DataAnalyzer 로드 실패");
        return;
    }

    dataAnalyzer = new DataAnalyzer();
    console.log("✅ DataAnalyzer 초기화 완료");

    $("#btnScan").off("click").on("click", function (e) {
        e.preventDefault();
        if (!_isScanning) startScan();
        else stopScan();
    });
});

async function startScan() {
    console.log("🎥 startScan 호출됨");
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라를 지원하지 않습니다.");
        return;
    }

    try {
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)").prop("disabled", true);

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });

        video.srcObject = stream;
        await video.play();

        container.style.display = "flex";
        scannedCodes = [];

        const codeReader = new ZXing.BrowserMultiFormatReader();
        scanner = codeReader;

        console.log("📸 ZXing 시작됨");

        codeReader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result) {
                const text = result.text.trim();
                if (!scannedCodes.includes(text)) {
                    scannedCodes.push(text);
                    console.log("✅ 스캔 성공:", text);
                }

                // 3초 타이머 리셋
                clearTimeout(scanTimer);
                scanTimer = setTimeout(() => {
                    stopScan(false);
                    handleScanComplete();
                }, 3000);
            }
        });
    } catch (err) {
        console.error("🚫 카메라 에러:", err);
        alert("카메라 접근 실패: " + err.message);
        stopScan(true);
    } finally {
        $("#btnScan").prop("disabled", false);
    }
}

function stopScan(hide = true) {
    console.log("🛑 stopScan 호출");
    if (scanner) {
        try { scanner.reset(); } catch (e) { console.warn("scanner reset error:", e); }
        scanner = null;
    }
    const video = document.getElementById("cameraPreview");
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    }
    if (hide) $("#cameraContainer").hide();
    _isScanning = false;
    $("#btnScan").text("SCAN");
}

// ✅ 스캔 완료 후 DataAnalyzer 처리
function handleScanComplete() {
    console.log("🧩 스캔 완료:", scannedCodes);
    if (scannedCodes.length === 0) {
        $("#txtResult").text("스캔된 코드가 없습니다.");
        return;
    }

    // 여러 블록 병합 (# 구분)
    const mergedData = scannedCodes.join("#");
    dataAnalyzer.setBarcodeData(mergedData);

    $("#txtResult").html(dataAnalyzer.getFullViewData());
    renderResultTable(dataAnalyzer.getResultData());
}

function renderResultTable(results) {
    clearResultTable();
    results.forEach(([type, okng, data]) => {
        $(`#result${type}`).html(okng);
        $(`#data${type}`).html(data ?? "-");
    });
}

function clearResultTable() {
    ["00","10","11","12","13","20","40","50"].forEach(id=>{
        $(`#result${id}`).html("");
        $(`#data${id}`).html("");
    });
}
