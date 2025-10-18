/**************************************************
 * index.js - DataMatrix 스캔 감도 완화 + 다중 블록 지원 (완성본)
 **************************************************/
let codeReader;
let scanning = false;
let combinedBarcodeData = "";
let scanTimeout = null;
let lowQualityCount = 0;

const QUALITY_LIMIT = 3; // 3회 이상 low-quality 감지 시 안내 표시
const SCAN_SESSION_TIME = 4000; // 4초 동안 복수 블록 누적 수집

$(document).ready(function() {
    console.log("📷 ZXing 초기화 시작");

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.DATA_MATRIX]);

    codeReader = new ZXing.BrowserMultiFormatReader(hints);

    $("#btnScan").on("click", startScan);
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

    const videoElement = document.getElementById('cameraPreview');

    const constraints = {
        video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: "continuous"
        }
    };

    combinedBarcodeData = "";
    lowQualityCount = 0;

    // ZXing decode loop
    codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
        if (result) {
            handleDecodedData(result.text);
        } else if (err && !(err instanceof ZXing.NotFoundException)) {
            console.warn("Decode error:", err);
        } else {
            handleLowQuality();
        }
    }, constraints)
    .then(() => {
        $("#qualityIndicator").text("스캔 준비 완료 ✅");
        startScanSession();
    })
    .catch(err => {
        console.error("카메라 접근 오류:", err);
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
 * 디코딩된 데이터 누적 처리
 **************************************************/
function handleDecodedData(data) {
    const cleanData = data.replace(/\s+/g, '').trim();
    console.log("✅ 스캔된 데이터:", cleanData);

    // 중복 방지 (같은 블록 여러 번 인식 방지)
    if (!combinedBarcodeData.includes(cleanData)) {
        combinedBarcodeData += cleanData;
    }

    $("#qualityIndicator").text("데이터 감지됨... 누적 중");
}

/**************************************************
 * 낮은 품질 감지
 **************************************************/
function handleLowQuality() {
    lowQualityCount++;
    if (lowQualityCount % QUALITY_LIMIT === 0) {
        $("#qualityIndicator").text("스캔 품질 낮음 — 자동 재시도 중...");
    }
}

/**************************************************
 * 다중 블록 스캔 세션 관리
 **************************************************/
function startScanSession() {
    console.log("⏱️ 다중 블록 스캔 세션 시작");

    // 일정 시간 동안 누적 수집 (다중 블록)
    scanTimeout = setTimeout(() => {
        console.log("⏹️ 스캔 세션 종료");
        stopScan();
    }, SCAN_SESSION_TIME);
}

/**************************************************
 * 스캔 데이터 분석 및 테이블 갱신
 **************************************************/
function finalizeScanData() {
    console.log("🧩 누적된 전체 데이터:", combinedBarcodeData);
    $("#txtResult").html(
        combinedBarcodeData.replace(/\x1D/g, '[GS]')
            .replace(/\x1E/g, '[RS]')
            .replace(/\x04/g, '[EOT]')
            .replace(/#/g, '[#]')
    );

    if (window.dataAnalyzer) {
        console.log("📊 DataAnalyzer 분석 시작");
        dataAnalyzer.setBarcodeData(combinedBarcodeData);
        setBarcodeResultDetail();
        updateBarcodeDisplay();
    } else {
        console.error("❌ dataAnalyzer 인스턴스 없음");
    }
}

/**************************************************
 * 결과 테이블 표시 갱신
 **************************************************/
function setBarcodeResultDetail() {
    if (!window.dataAnalyzer) return;
    const result = dataAnalyzer.getSelectedResultData();

    // 모든 셀 초기화
    for (let i = 0; i <= 50; i++) {
        $(`#result${i}`).html("");
        $(`#data${i}`).html("");
    }

    // 결과 반영
    result.forEach(item => {
        const [code, status, data] = item;
        $(`#result${code}`).html(status);
        $(`#data${code}`).html(data);
    });
}
