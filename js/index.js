/**********************************************
*   index.js (카메라 시작 문제 해결 버전)
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
        console.log("SCAN 버튼 클릭");
        
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
 *  스캔 시작 (카메라 문제 해결 버전)
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

        // iOS 호환성을 위한 카메라 설정
        const constraints = {
            video: {
                facingMode: { ideal: "environment" },
                // iOS 호환성을 위한 추가 설정
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: false
        };

        console.log("카메라 제약 조건:", constraints);

        // 카메라 스트림 요청
        _currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("카메라 스트림 얻음, 트랙 수:", _currentStream.getVideoTracks().length);

        // 비디오 요소 준비
        video.srcObject = _currentStream;
        
        // 비디오 메타데이터 로드 대기
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                console.log("비디오 메타데이터 로드됨");
                resolve();
            };
            // 타임아웃 설정
            setTimeout(resolve, 3000);
        });

        // 비디오 재생 시도 (iOS 호환성 개선)
        try {
            await video.play();
            console.log("비디오 재생 성공");
        } catch (playError) {
            console.warn("비디오 자동 재생 실패:", playError);
            // iOS에서는 사용자 상호작용이 필요할 수 있음
        }

        // UI 업데이트
        container.style.display = "flex";
        _isScanning = true;
        btn.textContent = "스캔 중... (탭하면 중지)";

        // ZXing 리더 초기화 전에 약간의 지연 (WASM 초기화 시간)
        await new Promise(resolve => setTimeout(resolve, 500));

        // ZXing 리더 초기화
        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 생성됨");

        // 사용 가능한 카메라 장치 찾기
        let deviceId = null;
        try {
            const devices = await _codeReader.listVideoInputDevices();
            console.log("사용 가능한 카메라 장치:", devices);
            
            if (devices && devices.length > 0) {
                // 후면 카메라 찾기
                const backCamera = devices.find(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('rear') ||
                    device.label.toLowerCase().includes('environment')
                );
                
                if (backCamera) {
                    deviceId = backCamera.deviceId;
                    console.log("후면 카메라 선택:", backCamera.label);
                } else {
                    deviceId = devices[0].deviceId;
                    console.log("기본 카메라 선택:", devices[0].label);
                }
            }
        } catch (deviceError) {
            console.warn("카메라 장치 목록 조회 실패:", deviceError);
            deviceId = null; // 기본 카메라 사용
        }

        console.log("최종 선택된 카메라 ID:", deviceId);

        // 디코딩 시작
        console.log("바코드 디코딩 시작...");
        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result) {
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
            if (err) {
                // NotFoundError는 정상적인 상황 (스캔할 바코드가 없을 때)
                if (!(err.name === 'NotFoundException')) {
                    console.warn("디코딩 에러:", err);
                }
            }
        });

        console.log("ZXing 디코딩이 시작되었습니다");

    } catch (err) {
        console.error("카메라 시작 중 에러:", err);
        
        let errorMsg = "카메라 시작 실패: ";
        
        if (err.name === 'NotAllowedError') {
            errorMsg = "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 확인해주세요.";
        } else if (err.name === 'NotFoundError') {
            errorMsg = "카메라를 찾을 수 없습니다. 기기에 카메라가 있는지 확인해주세요.";
        } else if (err.name === 'NotSupportedError') {
            errorMsg = "카메라 기능을 지원하지 않는 브라우저입니다.";
        } else if (err.name === 'NotReadableError') {
            errorMsg = "카메라가 다른 앱에서 사용 중이거나 접근할 수 없습니다.";
        } else if (err.name === 'OverconstrainedError') {
            errorMsg = "요청한 카메라 설정을 지원하지 않습니다. 기본 카메라로 시도해주세요.";
        } else {
            errorMsg += err.message || "알 수 없는 오류";
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
            console.log("ZXing 리더 정리됨");
        } catch (e) {
            console.warn("ZXing 정리 에러:", e);
        }
    }

    // 카메라 스트림 정리
    if (_currentStream) {
        try {
            _currentStream.getTracks().forEach(track => {
                console.log("트랙 정지:", track.kind, track.label);
                track.stop();
            });
            _currentStream = null;
            console.log("카메라 스트림 정리됨");
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
    
    console.log("스캔 완전히 중지됨");
}

// DataAnalyzer 연동 함수들 (이전과 동일)
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

// 글로벌 함수로 노출
window.startScan = startScan;
window.stopScan = stopScan;
