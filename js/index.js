/**************************************************
 * index.js - 다중 블록 DataMatrix 스캔 (최종 완성)
 **************************************************/
let codeReader;
let scanning = false;
let combinedBarcodeData = "";
let detectedBlocks = new Set();
let scanTimeout = null;
let lowQualityCount = 0;

const SCAN_SESSION_TIME = 5000; // 5초간 스캔 세션 유지
const QUALITY_LIMIT = 4;        // 4회 낮은 품질 시에만 경고

$(document).ready(function() {
    console.log("📷 ZXing 초기화 시작");

    codeReader = new ZXing.BrowserMultiFormatReader();

    $("#btnScan").on("click", function() {
        if (scanning) stopScan();
        else startScan();
    });

    $("#closeCamBtn").on("click", stopScan);
});

/**************************************************
 * 스캔 시작
 **************************************************/
function startScan() {
    if (scanning) return;
    scanning = true;

    $("#cameraContainer").show();
    $("#qualityIndicator").show().text("카메라 초기화 중...");

    const videoElement = document.getElementById("cameraPreview");
    const constraints = {
        video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    };

    combinedBarcodeData = "";
    detectedBlocks.clear();
    lowQualityCount = 0;

    codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
        if (result && result.text) {
            handleDecodedData(result.text);
        } else if (err && !(err instanceof ZXing.NotFoundException)) {
            console.warn("⚠️ 디코딩 에러:", err);
        } else {
            handleLowQuality();
        }
    }, constraints)
    .then(() => {
        $("#qualityIndicator").text("스캔 중... 여러 블록 감지 대기중");
        startScanSession();
    })
    .catch(err => {
        console.error("❌ 카메라 접근 오류:", err);
        $("#qualityIndicator").text("카메라 접근 실패");
        scanning = false;
    });
}

/**************************************************
 * 스캔 종료
 **************************************************/
function stopScan() {
    if (!scanning) return;
    scanning = false;
    codeReader.reset();
    $("#cameraContainer").hide();
    $("#qualityIndicator").hide();

    if (scanTimeout) clearTimeout(scanTimeout);

    if (combinedBarcodeData.length > 0) {
        finalizeScanData();
    } else {
        $("#qualityIndicator").text("인식된 데이터 없음").fadeOut(1000);
    }
}

/**************************************************
 * 스캔 세션 유지 (여러 블록 누적)
 **************************************************/
function startScanSession() {
    console.log("⏱️ 다중 블록 스캔 세션 시작");

    scanTimeout = setTimeout(() => {
        console.log("⏹️ 스캔 세션 종료");
        stopScan();
    }, SCAN_SESSION_TIME);
}

/**************************************************
 * 스캔 감지된 데이터 처리
 **************************************************/
function handleDecodedData(rawData) {
    const cleanData = rawData.replace(/\s+/g, '').trim();

    // 동일 데이터 반복 인식 방지
    if (detectedBlocks.has(cleanData)) return;
    detectedBlocks.add(cleanData);

    console.log("✅ 새 블록 감지됨:", cleanData);

    // 블록 구분자 추가
    if (!combinedBarcodeData.endsWith('#') && combinedBarcodeData.length > 0) {
        combinedBarcodeData += '#';
    }
    combinedBarcodeData += cleanData;

    $("#qualityIndicator").text(`블록 감지됨 (${detectedBlocks.size}개 누적)`);
}

/**************************************************
 * 낮은 품질 감지 (감도 완화)
 **************************************************/
function handleLowQuality() {
    lowQualityCount++;
    if (lowQualityCount % QUALITY_LIMIT === 0) {
        $("#qualityIndicator").text("품질 낮음 — 자동 재시도 중...");
    }
}

/**************************************************
 * 최종 데이터 처리
 **************************************************/
function finalizeScanData() {
    console.log("🧩 누적된 전체 스캔 데이터:", combinedBarcodeData);

    const viewData = combinedBarcodeData
        .replace(/\x1D/g, '[GS]')
        .replace(/\x1E/g, '[RS]')
        .replace(/\x04/g, '[EOT]')
        .replace(/#/g, '[#]');

    $("#txtResult").html(viewData);

    if (window.dataAnalyzer) {
        console.log("📊 DataAnalyzer 분석 실행");
        dataAnalyzer.setBarcodeData(combinedBarcodeData);
        setBarcodeResultDetail();
        updateBarcodeDisplay();
    } else {
        console.error("❌ DataAnalyzer 로드 실패");
    }
}

/**************************************************
 * 테이블 업데이트
 **************************************************/
function setBarcodeResultDetail() {
    if (!window.dataAnalyzer) return;
    const result = dataAnalyzer.getSelectedResultData();

    // 초기화
    for (let i = 0; i <= 50; i++) {
        $(`#result${i}`).html("");
        $(`#data${i}`).html("");
    }

    result.forEach(([code, status, data]) => {
        $(`#result${code}`).html(status);
        $(`#data${code}`).html(data);
    });
}
