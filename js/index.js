/**********************************************
 * index.js (멀티 블록 + 원본 스타일 + 폰트깨짐 해결)
 **********************************************/

let scanner = null;
let scannedCodes = [];
let scanTimer = null;
let dataAnalyzer = null;
let _isScanning = false;

$(function () {
    console.log("📦 App Init");
    dataAnalyzer = new DataAnalyzer();

    $("#btnScan").on("click", function () {
        if (_isScanning) stopScan();
        else startScan();
    });
});

async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라를 지원하지 않습니다.");
        return;
    }

    try {
        _isScanning = true;
        $("#btnScan").text("스캔 중...");

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        video.srcObject = stream;
        container.style.display = "flex";

        scannedCodes = [];
        const reader = new ZXing.BrowserMultiFormatReader();
        scanner = reader;

        reader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result) {
                const text = result.text.trim();
                if (!scannedCodes.includes(text)) {
                    scannedCodes.push(text);
                    console.log("📸 스캔:", text);
                }
                clearTimeout(scanTimer);
                scanTimer = setTimeout(() => {
                    stopScan(false);
                    handleScanComplete();
                }, 2000);
            }
        });
    } catch (err) {
        alert("카메라 접근 실패: " + err.message);
        stopScan();
    }
}

function stopScan(hide = true) {
    if (scanner) {
        try { scanner.reset(); } catch (e) {}
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

function handleScanComplete() {
    if (scannedCodes.length === 0) {
        $("#txtResult").text("스캔된 코드가 없습니다.");
        return;
    }

    // 블록들을 #으로 구분
    const merged = scannedCodes.join("#");
    dataAnalyzer.setBarcodeData(merged);
    $("#txtResult").html(dataAnalyzer.getFullViewData());

    renderAllResults();
}

function renderAllResults() {
    $("#resultContainer").empty();

    dataAnalyzer.getAllBlocksResult().forEach((block, idx) => {
        const table = $("<table>").append(`
            <tr><th colspan="3">[ ${idx + 1}번째 블록 ]</th></tr>
            <tr><th>항목</th><th>결과</th><th>데이터</th></tr>
        `);
        block.forEach(([type, okng, data]) => {
            table.append(`<tr><td>${getTitle(type)}</td><td class="ct">${okng}</td><td>${data ?? ""}</td></tr>`);
        });
        $("#resultContainer").append(table).append("<br>");
    });
}

function getTitle(type) {
    const map = {
        "00":"Header","10":"업체코드","11":"부품번호","12":"서열코드",
        "13":"EO번호","20":"추적코드","40":"업체영역","50":"Trailer"
    };
    return map[type] ?? type;
}
