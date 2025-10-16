/**********************************************
 * index.js - 완전 재작성
 **********************************************/

var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

// DOM 로드 후 실행
$(function () {
    console.log("DOM 로드 완료");
    
    // DataAnalyzer 초기화
    if (typeof DataAnalyzer !== 'undefined') {
        dataAnalyzer = new DataAnalyzer();
        console.log("DataAnalyzer 초기화 성공");
    } else {
        console.error("DataAnalyzer 로드 실패");
        $("#txtResult").text("DataAnalyzer 로드 실패");
        return;
    }

    // SCAN 버튼 이벤트
    $("#btnScan").off("click").on("click", function (e) {
        e.preventDefault();
        if (!_isScanning) {
            startScan();
        } else {
            stopScan();
        }
    });

    // 닫기 버튼 이벤트
    $("#closeCamBtn").off("click").on("click", function() {
        stopScan();
    });

    // 탭 전환 이벤트
    $(document).on('click', '.tab-button', function() {
        var tabIndex = parseInt($(this).data('tab'));
        selectBlock(tabIndex);
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

// 스캔 시작
async function startScan() {
    console.log("스캔 시작");
    
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    // 필수 요소 확인
    if (!video || !container) {
        alert("카메라 요소를 찾을 수 없습니다.");
        return;
    }

    // HTTPS 확인
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("카메라 기능은 HTTPS 환경에서만 작동합니다.");
        return;
    }

    // 카메라 API 지원 확인
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라 API를 지원하지 않습니다.");
        return;
    }

    // ZXing 라이브러리 확인
    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리를 로드할 수 없습니다.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 권한 요청 중...");
        
        // 카메라 접근
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = _currentStream;
        
        // 비디오 재생
        try {
            await video.play();
        } catch (e) {
            console.warn("비디오 자동 재생 제한:", e);
        }

        // UI 업데이트
        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        // ZXing 리더 생성
        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 생성됨");

        // 후면 카메라 찾기
        let deviceId = null;
        try {
            const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
            const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label));
            deviceId = backCam ? backCam.deviceId : (devices[0]?.deviceId ?? null);
        } catch (e) {
            console.warn("카메라 목록 조회 실패:", e);
        }

        // 바코드 디코딩 시작
        console.log("바코드 디코딩 시작...");
        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("바코드 스캔 성공:", result.text);
                stopScan(false);
                processScannedData(result.text);
            }
            
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("디코딩 에러:", err);
            }
        });

    } catch (err) {
        console.error("startScan 에러:", err);
        handleCameraError(err);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

// 스캔 중지
function stopScan(hide = true) {
    console.log("스캔 중지");
    
    if (_codeReader) {
        try {
            _codeReader.reset();
        } catch (e) {
            console.warn("ZXing 리셋 에러:", e);
        }
        _codeReader = null;
    }

    if (_currentStream) {
        try {
            _currentStream.getTracks().forEach(t => t.stop());
            _currentStream = null;
        } catch (e) {
            console.warn("스트림 종료 중 에러:", e);
        }
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

// 스캔된 데이터 처리
function processScannedData(scannedData) {
    console.log("스캔된 데이터 처리:", scannedData);
    
    if (!dataAnalyzer) {
        console.error("DataAnalyzer가 초기화되지 않음");
        return;
    }

    try {
        // 데이터 설정 및 분석
        dataAnalyzer.setBarcodeData(scannedData);
        
        // 결과 표시
        updateDisplay();
        
    } catch (e) {
        console.error("데이터 처리 중 오류:", e);
        $("#txtResult").html("데이터 처리 오류: " + e.message);
    }
}

// 블록 선택
function selectBlock(index) {
    console.log("블록 선택:", index);
    
    if (!dataAnalyzer) {
        console.error("DataAnalyzer가 초기화되지 않음");
        return;
    }

    dataAnalyzer.setSelectIndex(index);
    
    // 탭 활성화 업데이트
    $('.tab-button').removeClass('active');
    $(`.tab-button[data-tab="${index}"]`).addClass('active');
    
    // 디스플레이 업데이트
    updateDisplay();
}

// 디스플레이 업데이트
function updateDisplay() {
    if (!dataAnalyzer) return;
    
    // 바코드 내용 표시
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    
    // 블록 탭 업데이트
    updateTabs();
    
    // 결과 테이블 업데이트
    updateResultTable();
    
    // 스크롤 상단으로
    $("body").scrollTop(0);
}

// 블록 탭 업데이트
function updateTabs() {
    var blockCount = dataAnalyzer.getCount();
    var selectedIndex = dataAnalyzer.getSelectedIndex();
    
    console.log("블록 탭 업데이트:", blockCount, "개 블록");
    
    var tabNames = ['Assy', 'Sub01', 'Sub02'];
    var tabsHTML = '';
    
    for (var i = 0; i < blockCount && i < 3; i++) {
        var isActive = (i === selectedIndex);
        tabsHTML += `<button class="tab-button ${isActive ? 'active' : ''}" data-tab="${i}">${tabNames[i]}</button>`;
    }
    
    $("#blockTabs").html(tabsHTML);
}

// 결과 테이블 업데이트
function updateResultTable() {
    console.log("결과 테이블 업데이트");
    
    // 테이블 초기화
    clearTable();
    
    if (!dataAnalyzer) return;
    
    var resultData = dataAnalyzer.getSelectedResultData();
    console.log("표시할 결과 데이터:", resultData);
    
    if (resultData && resultData.length > 0) {
        resultData.forEach(function(item) {
            var type = item[0];
            var result = item[1];
            var data = item[2] || "";
            
            $("#result" + type).html(result);
            $("#data" + type).html(data);
        });
    }
    
    // 빈 행 숨기기
    hideEmptyRows();
}

// 테이블 초기화
function clearTable() {
    var ids = ["00","10","11","12","13","20","21","22","23","30","31","40","50"];
    ids.forEach(function(id) {
        $("#result" + id).html("");
        $("#data" + id).html("");
    });
}

// 빈 행 숨기기
function hideEmptyRows() {
    var rowsToHide = ["13", "30", "31", "40"];
    
    rowsToHide.forEach(function(id) {
        var resultCell = $("#result" + id).html();
        var dataCell = $("#data" + id).html();
        
        if ((!resultCell || resultCell.trim() === "") && 
            (!dataCell || dataCell.trim() === "")) {
            $("#tr" + getRowName(id)).hide();
        } else {
            $("#tr" + getRowName(id)).show();
        }
    });
}

// 행 ID 매핑
function getRowName(id) {
    var mapping = {
        "13": "EO",
        "30": "Special", 
        "31": "FirstProd",
        "40": "Company"
    };
    return mapping[id] || "";
}

// 카메라 에러 처리
function handleCameraError(err) {
    var msg = "카메라 시작 실패: ";
    if (err.name === 'NotAllowedError') {
        msg = "카메라 권한이 거부되었습니다. 설정에서 허용해주세요.";
    } else if (err.name === 'NotFoundError') {
        msg = "카메라를 찾을 수 없습니다.";
    } else {
        msg += err.message || err;
    }
    alert(msg);
}

// 전역 함수 노출
window.stopScan = stopScan;
window.selectBlock = selectBlock;
