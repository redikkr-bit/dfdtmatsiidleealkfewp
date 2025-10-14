/**********************************************
 *   index.js (iPhone Safari + GitHub Pages 호환 완성 버전)
 **********************************************/

// 전역 변수
var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function () {
    console.log("📱 DOM 로드 완료, Barcode Checker 초기화 시작");

    // DataAnalyzer 확인
    if (typeof DataAnalyzer === 'undefined') {
        $("#txtResult").text("❌ DataAnalyzer 로드 실패 - js 파일 확인 필요");
        console.error("DataAnalyzer.js 로드 실패");
        return;
    }

    try {
        dataAnalyzer = new DataAnalyzer();
        console.log("✅ DataAnalyzer 초기화 성공");
    } catch (e) {
        console.error("DataAnalyzer 초기화 실패:", e);
        $("#txtResult").text("DataAnalyzer 초기화 실패: " + e.message);
        return;
    }

    // SCAN 버튼 이벤트
    const $btnScan = $("#btnScan");
    if ($btnScan.length === 0) {
        console.error("SCAN 버튼을 찾을 수 없습니다!");
        return;
    }

    $btnScan.off("click").on("click", function (e) {
        e.preventDefault();
        if (!_isScanning) startScan();
        else stopScan();
    });

    $("#txtResult").text("📷 준비 완료 - SCAN 버튼을 터치하세요");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    console.log("▶️ startScan() 호출됨");

    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("❌ 카메라 기능을 지원하지 않는 브라우저입니다.\niOS 11+ Safari 필요");
        return;
    }

    if (location.protocol !== "https:" && location.hostname !== "localhost") {
        alert("⚠️ HTTPS 환경에서만 카메라를 사용할 수 있습니다.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 권한 요청 중...");
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        console.log("🎥 카메라 스트림 획득 성공");

        video.srcObject = _currentStream;
        await video.play();
        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        // ZXing 리더 초기화
        const reader = new ZXing.BrowserMultiFormatReader();
        _codeReader = reader;

        // ✅ 최신 버전에서는 인스턴스 메서드로 장치 목록 조회
        const devices = await reader.listVideoInputDevices();
        console.log("📸 사용 가능한 카메라:", devices);
        const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label));
        const deviceId = backCam ? backCam.deviceId : (devices[0] ? devices[0].deviceId : null);

        // ✅ 디코딩 시작
        reader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("✅ 바코드 스캔 성공:", result.text);
                stopScan(false);
                showMultiBlockResult(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("⚠️ 디코딩 에러:", err);
            }
        });
    } catch (err) {
        console.error("❌ startScan 에러:", err);
        let msg = "카메라 시작 실패: " + (err.message || err);
        if (err.name === "NotAllowedError") msg = "카메라 접근이 거부되었습니다.";
        if (err.name === "NotFoundError") msg = "카메라를 찾을 수 없습니다.";
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
    console.log("⏹ stopScan() 호출됨");

    if (_codeReader) {
        try {
            _codeReader.reset();
            _codeReader = null;
        } catch (e) {
            console.warn("ZXing 리더 정리 중 오류:", e);
        }
    }

    if (_currentStream) {
        _currentStream.getTracks().forEach(track => track.stop());
        _currentStream = null;
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
 *  다중 블록 결과 표시
 * ============================================================ */
function showMultiBlockResult(rawText) {
    // 블록 구분: #[)> 또는 ASCII 구분자() 등을 기준으로 분리
    const blocks = rawText.split(/#|\u001e\u0004/g).filter(b => b.trim() !== "");

    if (blocks.length === 0) {
        $("#txtResult").html("⚠️ 유효한 데이터 블록이 없습니다");
        return;
    }

    console.log("📦 감지된 블록 수:", blocks.length);

    let html = "";
    blocks.forEach((block, idx) => {
        html += `<div class="block-section">`;
        html += `<h3>블록 ${idx + 1}</h3>`;
        html += `<pre>${escapeHtml(block)}</pre>`;
        html += `</div>`;

        // 각 블록별 분석 결과 표시
        if (dataAnalyzer && typeof dataAnalyzer.setBarcodeData === "function") {
            dataAnalyzer.setBarcodeData(block);
            const result = dataAnalyzer.getFullViewData();
            html += `<div class="analysis-result">${result}</div>`;
        }
    });

    $("#txtResult").html(html);
    setBarcodeSet();
}

/* ============================================================
 *  기본 표시 함수
 * ============================================================ */
function setBarcodeSet() {
    if (!dataAnalyzer) return;
    $("#txtResult").append(dataAnalyzer.getFullViewData());
    $("body").scrollTop(0);
    return setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
    setAllClear();
    if (!dataAnalyzer) return;

    const okng = dataAnalyzer.getCheckResult();
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

    // EO번호, 특이정보, 업체영역 조건 표시
    if ($("#result13").html() == "") { $("#tr13").hide(); } else { $("#tr13").show(); }
    if ($("#result30").html() == "" && $("#result31").html() == "") {
        $("#tr30").hide(); $("#tr31").hide();
    } else {
        $("#tr30").show(); $("#tr31").show();
    }
    if ($("#result40").html() == "") $("#tr40").hide(); else $("#tr40").show();

    return okng;
}

function setAllClear() {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id => {
        $("#result" + id).html("");
        $("#data" + id).html("");
    });
}

/* ============================================================
 *  HTML 이스케이프 (보안용)
 * ============================================================ */
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (tag) {
        const chars = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return chars[tag] || tag;
    });
}
