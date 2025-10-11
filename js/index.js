/**********************************************
*   index.js (간소화된 버전)
**********************************************/

console.log("index.js 로드 시작");

// 전역 변수
var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

// jQuery 로드 확인 후 실행
$(document).ready(function() {
    console.log("jQuery ready, DataAnalyzer 초기화 시도");
    
    // DataAnalyzer 초기화
    if (typeof DataAnalyzer !== 'undefined') {
        try {
            dataAnalyzer = new DataAnalyzer();
            console.log("DataAnalyzer 초기화 성공");
        } catch (e) {
            console.error("DataAnalyzer 생성 실패:", e);
        }
    } else {
        console.warn("DataAnalyzer가 로드되지 않음");
    }

    // SCAN 버튼 이벤트 바인딩
    $('#btnScan').on('click', function(e) {
        e.preventDefault();
        console.log("SCAN 버튼 클릭 - jQuery 이벤트");
        
        if (!_isScanning) {
            startScan();
        } else {
            stopScan();
        }
    });

    // 초기 상태 설정
    $('#txtResult').text("준비 완료 - SCAN 버튼을 터치하세요");
    console.log("초기화 완료");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    console.log("startScan() 실행");
    
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = document.getElementById("btnScan");

    // 기본 검사
    if (!video || !container) {
        alert("카메라 요소를 찾을 수 없습니다.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라를 지원하지 않습니다.");
        return;
    }

    if (typeof ZXing === "undefined") {
        alert("스캔 라이브러리를 로드할 수 없습니다.");
        return;
    }

    try {
        console.log("카메라 시작...");
        btn.disabled = true;
        btn.textContent = "카메라 권한 요청 중...";

        // 카메라 스트림 요청
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: { ideal: "environment" }
            },
            audio: false
        });

        // 비디오 설정
        video.srcObject = _currentStream;
        await video.play();

        // UI 업데이트
        container.style.display = "flex";
        _isScanning = true;
        btn.textContent = "스캔 중... (탭하면 중지)";

        // ZXing 리더 초기화
        _codeReader = new ZXing.BrowserMultiFormatReader();

        // 디코딩 시작
        _codeReader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result && result.text) {
                console.log("스캔 성공:", result.text);
                stopScan(false);
                
                // 결과 표시
                $('#txtResult').html(result.text.replace(/\r?\n/g, "<br>"));
                
                // DataAnalyzer 처리
                if (dataAnalyzer && typeof dataAnalyzer.setBarcodeData === 'function') {
                    dataAnalyzer.setBarcodeData(result.text);
                    setBarcodeSet();
                }
            }
        });

    } catch (err) {
        console.error("스캔 에러:", err);
        let errorMsg = "카메라 시작 실패: ";
        
        if (err.name === 'NotAllowedError') {
            errorMsg = "카메라 권한이 거부되었습니다.";
        } else if (err.name === 'NotFoundError') {
            errorMsg = "카메라를 찾을 수 없습니다.";
        } else {
            errorMsg += err.message;
        }
        
        alert(errorMsg);
        stopScan(true);
    } finally {
        const btn = document.getElementById("btnScan");
        if (btn) {
            btn.disabled = false;
        }
    }
}

/* ============================================================
 *  스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
    console.log("stopScan() 호출");
    
    // ZXing 리더 정리
    if (_codeReader) {
        try {
            _codeReader.reset();
            _codeReader = null;
        } catch (e) {
            console.warn("ZXing 정리 에러:", e);
        }
    }

    // 카메라 스트림 정리
    if (_currentStream) {
        try {
            _currentStream.getTracks().forEach(track => track.stop());
            _currentStream = null;
        } catch (e) {
            console.warn("스트림 정리 에러:", e);
        }
    }

    // 비디오 정리
    const video = document.getElementById("cameraPreview");
    if (video) {
        video.srcObject = null;
    }

    // UI 업데이트
    if (hide) {
        const container = document.getElementById("cameraContainer");
        if (container) {
            container.style.display = "none";
        }
    }

    _isScanning = false;
    const btn = document.getElementById("btnScan");
    if (btn) {
        btn.textContent = "SCAN";
        btn.disabled = false;
    }
}

/* ============================================================
 *  DataAnalyzer 연동 함수
 * ============================================================ */
function setBarcodeSet() {
    if (!dataAnalyzer) return;
    
    $('#txtResult').html(dataAnalyzer.getFullViewData());
    $('body').scrollTop(0);
    setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
    setAllClear();
    if (!dataAnalyzer) return;
    
    dataAnalyzer.getResultData().forEach(function (v) {
        $('#result' + v[0]).html(v[1]);
        if (v[0] == 12 && (v[2] == null || v[2] == "")) {
            $('#result12').html("-");
            $('#data12').html("<span class='gray'>데이터 없음</span>");
        } else {
            if (v[1].indexOf("OK") > -1 && (v[2] == "" || v[2] == null)) {
                $('#result' + v[0]).html("-");
            }
            $('#data' + v[0]).html(v[2]);
        }
    });

    // 행 표시/숨김 처리
    $('#tr13')[$('#result13').html() ? 'show' : 'hide']();
    
    if ($('#result30').html() || $('#result31').html()) {
        $('#tr30').show();
        $('#tr31').show();
    } else {
        $('#tr30').hide();
        $('#tr31').hide();
    }
    
    $('#tr40')[$('#result40').html() ? 'show' : 'hide']();
}

function setAllClear() {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id => {
        $('#result' + id).html("");
        $('#data' + id).html("");
    });
}

// 글로벌 함수로 노출 (인라인 이벤트용)
window.startScan = startScan;
window.stopScan = stopScan;
