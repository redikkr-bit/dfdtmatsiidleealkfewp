/**********************************************
 * index.js (다중 블록 지원 + iOS Safari 대응)
 **********************************************/

// 전역 변수
var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

// DOM 로드 후 실행
$(function () {
    console.log("DOM 로드 완료, 버튼 이벤트 바인딩 시도");
    
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

    const $btnScan = $("#btnScan");
    if ($btnScan.length === 0) {
        console.error("SCAN 버튼을 찾을 수 없음!");
        return;
    }

    $btnScan.off("click").on("click", function (e) {
        e.preventDefault();
        console.log("SCAN 버튼 클릭됨 - 상태:", _isScanning ? "스캔중" : "대기중");
        if (!_isScanning) startScan();
        else stopScan();
    });

    // 닫기 버튼 이벤트
    $("#closeCamBtn").off("click").on("click", function() {
        stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
    console.log("버튼 이벤트 바인딩 완료");
});

/* ============================================================
 * 스캔 시작
 * ============================================================ */
async function startScan() {
    console.log("startScan() 함수 실행");
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!video || !container) {
        alert("카메라 요소를 찾을 수 없습니다.");
        return;
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert("⚠️ 카메라 기능은 HTTPS 환경에서만 작동합니다.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("이 브라우저는 카메라 API를 지원하지 않습니다.\niOS 11+ 또는 최신 브라우저를 사용해주세요.");
        return;
    }

    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
        alert("ZXing 라이브러리를 로드할 수 없습니다.\n인터넷 연결을 확인해주세요.");
        return;
    }

    try {
        btn.prop("disabled", true).text("카메라 권한 요청 중...");
        
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
            console.warn("비디오 자동 재생 제한:", e);
        }

        container.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        _codeReader = new ZXing.BrowserMultiFormatReader();
        console.log("ZXing 리더 생성됨");

        let deviceId = null;
        try {
            const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
            const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label));
            deviceId = backCam ? backCam.deviceId : (devices[0]?.deviceId ?? null);
            console.log("선택된 카메라:", deviceId);
        } catch (e) {
            console.warn("카메라 목록 조회 실패:", e);
        }

        console.log("바코드 디코딩 시작...");
        _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) {
                console.log("바코드 스캔 성공:", result.text);
                stopScan(false);
                
                if (dataAnalyzer && typeof dataAnalyzer.setBarcodeData === 'function') {
                    dataAnalyzer.setBarcodeData(result.text);
                    
                    // 약간의 지연을 두고 결과 표시 (비동기 처리 보장)
                    setTimeout(function() {
                        setBarcodeSet();
                    }, 100);
                    
                } else {
                    $("#txtResult").html("스캔 성공: " + result.text + "<br>DataAnalyzer 사용 불가");
                }
            }
            
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.warn("디코딩 에러:", err);
            }
        });

    } catch (err) {
        console.error("startScan 에러:", err);
        let msg = "카메라 시작 실패: ";
        if (err.name === 'NotAllowedError') msg = "카메라 권한이 거부되었습니다. 설정에서 허용해주세요.";
        else if (err.name === 'NotFoundError') msg = "카메라를 찾을 수 없습니다.";
        else msg += err.message || err;
        alert(msg);
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

/* ============================================================
 * 스캔 중지
 * ============================================================ */
function stopScan(hide = true) {
    console.log("stopScan() 호출");
    
    if (_codeReader) {
        try {
            _codeReader.reset();
            console.log("ZXing 리더 리셋됨");
        } catch (e) {
            console.warn("ZXing 리셋 에러:", e);
        }
        _codeReader = null;
    }

    if (_currentStream) {
        try {
            _currentStream.getTracks().forEach(t => {
                t.stop();
                console.log("카메라 트랙 정지:", t.label);
            });
            _currentStream = null;
        } catch (e) {
            console.warn("스트림 종료 중 에러:", e);
        }
    }

    const video = document.getElementById("cameraPreview");
    if (video) {
        video.srcObject = null;
    }

    if (hide) {
        const container = document.getElementById("cameraContainer");
        if (container) {
            container.style.display = "none";
        }
    }

    _isScanning = false;
    $("#btnScan").text("SCAN");
    console.log("스캔 완전 중지됨");
}

/* ============================================================
 * 데이터 표시 및 테이블 업데이트 (다중 블록 지원)
 * ============================================================ */
function setBarcodeSet() {
    if (!dataAnalyzer) {
        console.error("DataAnalyzer가 초기화되지 않음");
        return;
    }

    console.log("setBarcodeSet 호출");
    
    // 1. 바코드 데이터 검증 실행
    var isValid = dataAnalyzer.getCheckResult();
    console.log("바코드 검증 결과:", isValid);
    
    // 2. 블록 개수에 따라 탭 동적 조정
    adjustTabs();
    
    // 3. 바코드 내용 표시
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    
    $("body").scrollTop(0);
    
    // 4. 결과 테이블 업데이트
    return setBarcodeResultDetail();
}

// 블록 개수에 따라 탭 조정
function adjustTabs() {
    const blockCount = dataAnalyzer.getCount();
    console.log("블록 개수:", blockCount);
    
    // 기본 탭 설정
    const defaultTabs = ['Assy', 'Sub01', 'Sub02'];
    let tabHTML = '';
    
    for (let i = 0; i < Math.min(blockCount, 3); i++) {
        const isActive = i === dataAnalyzer.getSelectedIndex();
        tabHTML += `<button class="tab-button ${isActive ? 'active' : ''}" data-tab="${i}">${defaultTabs[i]}</button>`;
    }
    
    $("#blockTabs").html(tabHTML);
    console.log("탭 UI 업데이트 완료");
}

function setBarcodeResultDetail() {
    setAllClear();
    if (!dataAnalyzer) return;
    
    console.log("setBarcodeResultDetail 호출, 선택된 인덱스:", dataAnalyzer.getSelectedIndex());
    
    // 선택된 블록의 결과 데이터 가져오기
    var selectedResultData = dataAnalyzer.getSelectedResultData();
    console.log("선택된 블록 결과 데이터:", selectedResultData);
    
    if (selectedResultData && selectedResultData.length > 0) {
        selectedResultData.forEach(function (v) {
            console.log(`결과 데이터: ${v[0]} - ${v[1]} - ${v[2]}`);
            
            $("#result" + v[0]).html(v[1]);
            
            // 데이터가 null이거나 빈 문자열인 경우 처리
            if (v[2] === null || v[2] === "" || v[2] === undefined) {
                $("#data" + v[0]).html("");
            } else {
                $("#data" + v[0]).html(v[2]);
            }
        });
    } else {
        console.warn("선택된 블록에 결과 데이터가 없습니다.");
        $("#txtResult").html("데이터 분석 실패 - 결과 데이터가 없습니다.");
    }
    
    // 빈 데이터 행 숨기기
    hideEmptyRows();
    
    console.log("결과 테이블 업데이트 완료");
}

// 빈 데이터 행 숨기기
function hideEmptyRows() {
    const rowsToCheck = [
        { id: "trEO", resultId: "result13", dataId: "data13" },
        { id: "trSpecial", resultId: "result30", dataId: "data30" },
        { id: "trFirstProd", resultId: "result31", dataId: "data31" },
        { id: "trCompany", resultId: "result40", dataId: "data40" }
    ];
    
    rowsToCheck.forEach(row => {
        const resultCell = $("#" + row.resultId).html();
        const dataCell = $("#" + row.dataId).html();
        
        if ((!resultCell || resultCell.trim() === "" || resultCell === "-") && 
            (!dataCell || dataCell.trim() === "")) {
            $("#" + row.id).hide();
        } else {
            $("#" + row.id).show();
        }
    });
}

/* ============================================================
 * 초기화
 * ============================================================ */
function setAllClear() {
    console.log("테이블 초기화");
    const ids = ["00","10","11","12","13","20","21","22","23","30","31","40","50"];
    
    ids.forEach(id => {
        $("#result" + id).html("");
        $("#data" + id).html("");
    });
    
    // 모든 행 표시로 초기화
    $("table tr").show();
}
