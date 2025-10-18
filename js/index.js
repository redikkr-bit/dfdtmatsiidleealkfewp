var dataAnalyzer = new DataAnalyzer();
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;
var _scanDataBuffer = "";
var _scanTimeout = null;
var _lastScanTime = 0;

$(function(){
    console.log("페이지 로드 완료");
    
    $("#btnScan").click(function() {
        if (!_isScanning) {
            startScan();
        } else {
            stopScan();
        }
    });

    $("#closeCamBtn").click(function() {
        stopScan();
    });

    $(document).on('click', '.tab-button', function() {
        var idx = parseInt($(this).data('tab'));
        dataAnalyzer.setSelectIndex(idx);
        setBarcodeSet();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

async function startScan() {
    console.log("스캔 시작");
    
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!video || !container) {
        alert("카메라 요소를 찾을 수 없습니다.");
        return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("카메라 기능은 HTTPS 환경에서만 작동합니다.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라 API를 지원하지 않습니다.");
        return;
    }

    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리를 로드할 수 없습니다.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 접근 중...");
        
        // 데이터 버퍼 초기화
        _scanDataBuffer = "";
        _lastScanTime = Date.now();
        
        _currentStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = _currentStream;
        
        try {
            await video.play();
        } catch (e) {
            console.warn("비디오 재생 제한:", e);
        }

        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중지");

        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 생성됨");

        let deviceId = null;
        try {
            const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
            const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label));
            deviceId = backCam ? backCam.deviceId : (devices[0]?.deviceId ?? null);
        } catch (e) {
            console.warn("카메라 목록 조회 실패:", e);
        }

        // 연속 스캔 시작
        console.log("연속 스캔 모드 시작");
        startContinuousScan(deviceId, video);
        
        // 5초 후 자동 종료
        _scanTimeout = setTimeout(() => {
            if (_isScanning) {
                console.log("스캔 타임아웃");
                finishScan();
            }
        }, 5000);

    } catch (err) {
        console.error("스캔 시작 오류:", err);
        handleCameraError(err);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

function startContinuousScan(deviceId, video) {
    _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
        if (result && result.text) {
            var currentTime = Date.now();
            var newData = result.text;
            
            console.log("스캔된 데이터:", newData.length + " bytes");
            
            // 데이터 버퍼에 추가 (중복 방지)
            if (!_scanDataBuffer.includes(newData)) {
                _scanDataBuffer += newData;
                _lastScanTime = currentTime;
                
                // 블록 개수 확인
                var blockCount = (_scanDataBuffer.match(/#/g) || []).length;
                $("#scanProgress").text(`데이터 수집 중... (${blockCount}/3 블록 발견)`);
                
                console.log("현재 버퍼:", _scanDataBuffer.length + " bytes, 블록:", blockCount);
                
                // 3개 블록 모두 발견되면 즉시 종료
                if (blockCount >= 3) {
                    console.log("3개 블록 모두 발견, 스캔 완료");
                    finishScan();
                    return;
                }
            }
            
            // 2초 동안 새로운 데이터가 없으면 종료
            clearTimeout(_scanTimeout);
            _scanTimeout = setTimeout(() => {
                if (_isScanning && (Date.now() - _lastScanTime > 2000)) {
                    console.log("새로운 데이터 없음, 스캔 종료");
                    finishScan();
                }
            }, 2100);
        }
        
        if (err && !(err instanceof ZXing.NotFoundException)) {
            console.warn("디코딩 에러:", err);
        }
    });
}

function finishScan() {
    console.log("스캔 완료, 최종 데이터:", _scanDataBuffer.length + " bytes");
    
    if (_scanDataBuffer.length > 0) {
        processScannedData(_scanDataBuffer);
    } else {
        $("#txtResult").html("<span style='color: red;'>스캔 실패 - 데이터를 찾을 수 없습니다</span>");
    }
    
    stopScan(false);
}

function stopScan(hide = true) {
    console.log("스캔 중지");
    
    clearTimeout(_scanTimeout);
    
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
    $("#scanProgress").text("데이터 수집 중... (카메라를 바코드에 천천히 이동해주세요)");
}

function processScannedData(scannedData) {
    console.log("데이터 처리 시작:", scannedData.length + " bytes");
    
    if (!dataAnalyzer) {
        console.error("DataAnalyzer가 초기화되지 않음");
        return;
    }

    try {
        dataAnalyzer.setBarcodeData(scannedData);
        setBarcodeSet();
        
    } catch (e) {
        console.error("데이터 처리 오류:", e);
        $("#txtResult").html("데이터 처리 오류: " + e.message);
    }
}

function setBarcodeSet(){
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    setTabShowHidden(dataAnalyzer.getCount());
    $("body").scrollTop(0);
    return setBarcodeResultDetail();
}

function setTabShowHidden(cnt){
    if (cnt > 1) {
        $("#blockTabs").show();
        if (cnt >= 3) {
            $("#blockTabs").html(`
                <button class="tab-button active" data-tab="0">Assy</button>
                <button class="tab-button" data-tab="1">Sub01</button>
                <button class="tab-button" data-tab="2">Sub02</button>
            `);
        } else if (cnt == 2) {
            $("#blockTabs").html(`
                <button class="tab-button active" data-tab="0">Assy</button>
                <button class="tab-button" data-tab="1">Sub01</button>
            `);
        }
    } else {
        $("#blockTabs").hide();
    }
}

function setBarcodeResultDetail(){
    setAllClear();
    var okng = dataAnalyzer.getCheckResult();
    dataAnalyzer.getResultData().forEach(function(v, i) {
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

    // EO번호
    if ($("#result13").html() == "") {
        $("#trEO").hide();
    } else {
        $("#trEO").show();
    }

    // 부가정보
    if ($("#result30").html() == "" && $("#result31").html() == "") {
        $("#trSpecial, #trFirstProd").hide();
    } else {
        $("#trSpecial, #trFirstProd").show();
    }

    // 업체영역
    if ($("#result40").html() == "") {
        $("#trCompany").hide();
    } else {
        $("#trCompany").show();
    }

    return okng;
}

function setAllClear() {
    var ids = ["00","10","11","12","13","20","21","22","23","30","31","40","50"];
    ids.forEach(function(id) {
        $("#result" + id).html("");
        $("#data" + id).html("");
    });
}

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
