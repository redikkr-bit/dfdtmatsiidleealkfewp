/**********************************************
*   index.js (멀티 블록 표시 지원 버전)
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

    dataAnalyzer = new DataAnalyzer();
    console.log("DataAnalyzer 초기화 완료");

    $("#btnScan").off("click").on("click", function (e) {
        e.preventDefault();
        if (!_isScanning) startScan();
        else stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("카메라를 지원하지 않습니다");
        return;
    }

    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리가 로드되지 않았습니다");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 권한 요청 중...");

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
        const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label));
        const deviceId = backCam ? backCam.deviceId : devices[0].deviceId;

        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("스캔 성공:", result.text);
                stopScan(false);
                showMultiBlockResult(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("디코딩 오류:", err);
            }
        });
    } catch (err) {
        console.error("startScan 에러:", err);
        alert("카메라 시작 실패: " + err.message);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

function stopScan(hide = true) {
    if (_codeReader) {
        _codeReader.reset();
        _codeReader = null;
    }
    if (_currentStream) {
        _currentStream.getTracks().forEach(track => track.stop());
        _currentStream = null;
    }
    if (hide) document.getElementById("cameraContainer").style.display = "none";

    _isScanning = false;
    $("#btnScan").text("SCAN");
}

/* ============================================================
 *  여러 블록 결과를 구분하여 표시
 * ============================================================ */
function showMultiBlockResult(rawText) {
    $("#txtResult").empty();

    dataAnalyzer.setBarcodeData(rawText);
    const blockCount = dataAnalyzer.getCount();
    console.log("블록 수:", blockCount);

    // 결과 전체 HTML 구성
    let fullHtml = "";
    for (let i = 0; i < blockCount; i++) {
        dataAnalyzer.setSelectIndex(i);
        const okng = dataAnalyzer.getCheckResult();
        const results = dataAnalyzer.getResultData();

        fullHtml += `<div class="block-section" style="border:2px solid #115f97;margin:10px 0;padding:10px;border-radius:10px;background:#f9f9f9;">
                        <div style="font-weight:bold;color:#115f97;">[BLOCK ${i + 1}]</div>
                        <table style="width:100%;margin-top:6px;border-collapse:collapse;font-size:13pt;">
                            <tr><th style="background:#ddd;">구분</th><th style="background:#ddd;">결과</th><th style="background:#ddd;">데이터</th></tr>`;

        results.forEach(v => {
            fullHtml += `<tr>
                            <td style="border:1px solid #ccc;padding:4px;">${labelName(v[0])}</td>
                            <td style="border:1px solid #ccc;text-align:center;">${v[1]}</td>
                            <td style="border:1px solid #ccc;padding:4px;">${v[2] || "-"}</td>
                         </tr>`;
        });

        fullHtml += `</table></div>`;
    }

    $("#txtResult").html(fullHtml);
}

/* ============================================================
 *  항목명 변환
 * ============================================================ */
function labelName(code) {
    const map = {
        "00": "Header",
        "10": "업체코드",
        "11": "부품번호",
        "12": "서열코드",
        "13": "EO번호",
        "20": "생산일자",
        "21": "부품4M",
        "22": "A or @",
        "23": "추적번호(7~)",
        "30": "특이정보",
        "31": "초도품구분",
        "40": "업체영역",
        "50": "Trailer"
    };
    return map[code] || code;
}
