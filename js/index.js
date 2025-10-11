/**********************************************
*   index.js (원본 레이아웃 호환 버전)
**********************************************/

// 전역 변수
var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

// DOM 로드 후 실행
$(function () {
    console.log("DOM 로드 완료, 버튼 이벤트 바인딩 시도");
    
    // DataAnalyzer 초기화 확인
    if (typeof DataAnalyzer === 'undefined') {
        console.error("DataAnalyzer 로드 실패!");
        $("#txtResult").text("DataAnalyzer 로드 실패 - 파일을 확인해주세요");
        return;
    }
    
    try {
        dataAnalyzer = new DataAnalyzer();
        console.log("DataAnalyzer 초기화 성공");
    } catch (e) {
        console.error("DataAnalyzer 생성 실패:", e);
        $("#txtResult").text("DataAnalyzer 초기화 실패: " + e.message);
        return;
    }

    // SCAN 버튼 이벤트 바인딩 (원본 버튼 ID 사용)
    var $btnScan = $("#btnScan");
    if ($btnScan.length === 0) {
        console.error("SCAN 버튼을 찾을 수 없음!");
        return;
    }

    $btnScan.off("click").on("click", function (e) {
        e.preventDefault();
        console.log("SCAN 버튼 클릭됨 - 현재 상태:", _isScanning ? "스캔중" : "대기중");
        
        if (!_isScanning) {
            startScan();
        } else {
            stopScan();
        }
    });

    // 다른 버튼들 기본 동작 방지 (필요시)
    $("#btnHistory").off("click").on("click", function(e) {
        e.preventDefault();
        alert("히스토리 기능은 현재 사용할 수 없습니다");
    });
    
    $("#btnInput").off("click").on("click", function(e) {
        e.preventDefault();
        alert("입력 기능은 현재 사용할 수 없습니다");
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
    console.log("버튼 이벤트 바인딩 완료");
});

/* ============================================================
 *  스캔 시작
 * ============================================================ */
async function startScan() {
    console.log("startScan() 함수 실행");
    
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    // 요소 존재 확인
    if (!video || !container) {
        alert("카메라 요소를 찾을 수 없습니다.");
        return;
    }

    // HTTPS 체크
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("⚠️ 카메라 기능은 HTTPS 환경에서만 작동합니다.");
        return;
    }

    // 카메라 API 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라 API를 지원하지 않습니다.\niOS 11+ 또는 최신 브라우저를 사용해주세요.");
        return;
    }

    // ZXing 라이브러리 확인
    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리를 로드할 수 없습니다.\n인터넷 연결을 확인해주세요.");
        return;
    }

    try {
        console.log("카메라 시작 시도...");
        btn.prop("disabled", true).text("카메라 권한 요청 중...");

        // 카메라 스트림 요청
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        console.log("카메라 스트림 획득 성공");

        // 비디오 설정
        video.srcObject = _currentStream;
        
        // 비디오 재생 시도
        try {
            await video.play();
            console.log("비디오 재생 성공");
        } catch (playError) {
            console.warn("비디오 자동 재생 실패:", playError);
        }

        // UI 업데이트
        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        // ZXing 리더 초기화
        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 생성됨");

        // 카메라 장치 선택
        let deviceId = null;
        try {
            const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
            console.log("사용 가능한 카메라:", devices.length + "개");
            
            const backCamera = devices.find(d => /back|rear|environment|후면/i.test(d.label));
            deviceId = backCamera ? backCamera.deviceId : (devices[0] ? devices[0].deviceId : null);
        } catch (e) {
            console.warn("카메라 목록 조회 실패:", e);
            deviceId = null;
        }

        // 디코딩 시작
        console.log("바코드 디코딩 시작...");
        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("바코드 스캔 성공:", result.text);
                
                // 결과 처리
                stopScan(false);
                $("#txtResult").html(result.text.replace(/\r?\n/g, "<br>"));
                
                // DataAnalyzer로 데이터 처리
                if (dataAnalyzer && typeof dataAnalyzer.setBarcodeData === 'function') {
                    dataAnalyzer.setBarcodeData(result.text);
                    setBarcodeSet();
                } else {
                    $("#txtResult").html("스캔 성공: " + result.text + "<br>DataAnalyzer를 사용할 수 없음");
                }
            }
        });

    } catch (err) {
        console.error("startScan 에러:", err);
        
        let errorMessage = "카메라 시작 실패: ";
        if (err.name === 'NotAllowedError') {
            errorMessage = "카메라 권한이 거부되었습니다.\n브라우저 설정에서 카메라 권한을 허용해주세요.";
        } else if (err.name === 'NotFoundError') {
            errorMessage = "카메라를 찾을 수 없습니다.";
        } else if (err.name === 'NotSupportedError') {
            errorMessage = "카메라 기능을 지원하지 않는 브라우저입니다.";
        } else {
            errorMessage += err.message || err;
        }
        
        alert(errorMessage);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
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
            console.warn("ZXing 정리 중 에러:", e);
        }
    }

    // 카메라 스트림 정리
    if (_currentStream) {
        try {
            _currentStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn("트랙 정리 에러:", e);
                }
            });
            _currentStream = null;
        } catch (e) {
            console.warn("스트림 정리 중 에러:", e);
        }
    }

    // 비디오 요소 정리
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
    $("#btnScan").text("SCAN");
}

/* ============================================================
 *  DataAnalyzer 연동 함수들 (원본 호환)
 * ============================================================ */
function setBarcodeSet() {
    if (!dataAnalyzer) {
        console.error("DataAnalyzer가 초기화되지 않음");
        return;
    }
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    $("body").scrollTop(0);
    return setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
    setAllClear();
    if (!dataAnalyzer) return;
    
    var okng = dataAnalyzer.getCheckResult();
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

    // 원본 레이아웃에 맞게 행 표시/숨김 처리
    if ($("#result13").html() == "") { 
        $("#tr13").hide(); 
    } else { 
        $("#tr13").show(); 
    }
    
    if ($("#result30").html() == "" && $("#result31").html() == "") {
        $("#tr30").hide(); 
        $("#tr31").hide();
    } else {
        $("#tr30").show(); 
        $("#tr31").show();
    }
    
    if ($("#result40").html() == "") {
        $("#tr40").hide(); 
    } else { 
        $("#tr40").show(); 
    }
    
    return okng;
}

function setAllClear() {
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id=>{
        $("#result"+id).html("");
        $("#data"+id).html("");
    });
}
