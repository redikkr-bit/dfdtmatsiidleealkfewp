var dataAnalyzer = null, _codeReader = null, _currentStream = null, _isScanning = false;
$(function () {
    console.log("DOM 로드 완료, 초기화 시작");
    if (typeof DataAnalyzer !== 'undefined') { dataAnalyzer = new DataAnalyzer(); console.log("✅ DataAnalyzer 초기화 성공"); } else { console.error("❌ DataAnalyzer 로드 실패"); $("#txtResult").text("DataAnalyzer 로드 실패 - 파일을 확인해주세요"); return; }
    $("#btnScan").off("click").on("click", function (e) { e.preventDefault(); console.log("SCAN 버튼 클릭 - 현재 상태:", _isScanning ? "스캔중" : "대기중"); if (!_isScanning) startScan(); else stopScan(); });
    $("#closeCamBtn").off("click").on("click", function() { console.log("닫기 버튼 클릭"); stopScan(); });
    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요"); console.log("✅ 초기화 완료");
});
async function startScan() {
    console.log("🚀 스캔 시작 함수 실행"); const video = document.getElementById("cameraPreview"); const container = document.getElementById("cameraContainer"); const btn = $("#btnScan");
    if (!video || !container) { alert("카메라 요소를 찾을 수 없습니다."); return; }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') { alert("⚠️ 카메라 기능은 HTTPS 환경에서만 작동합니다."); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert("이 브라우저는 카메라 API를 지원하지 않습니다.\niOS 11+ 또는 최신 브라우저를 사용해주세요."); return; }
    if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) { alert("ZXing 라이브러리를 로드할 수 없습니다.\n인터넷 연결을 확인해주세요."); return; }
    try {
        btn.prop("disabled", true).text("카메라 권한 요청 중..."); console.log("📷 카메라 접근 요청");
        _currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        video.srcObject = _currentStream; try { await video.play(); console.log("✅ 비디오 재생 성공"); } catch (e) { console.warn("⚠️ 비디오 자동 재생 제한:", e); }
        container.style.display = "flex"; _isScanning = true; btn.text("스캔 중... (탭하면 중지)"); _codeReader = new ZXing.BrowserMultiFormatReader(); console.log("✅ ZXing 리더 생성됨");
        let deviceId = null; try { const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices(); const backCam = devices.find(d => /back|rear|environment|후면/i.test(d.label)); deviceId = backCam ? backCam.deviceId : (devices[0]?.deviceId ?? null); console.log("📸 선택된 카메라:", deviceId ? "후면 카메라" : "기본 카메라"); } catch (e) { console.warn("⚠️ 카메라 목록 조회 실패:", e); }
        console.log("🔍 바코드 디코딩 시작..."); _codeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
            if (result && result.text) { console.log("✅ 바코드 스캔 성공"); console.log("📊 데이터 길이:", result.text.length); console.log("📝 원본 데이터:", result.text);
                var quality = evaluateScanQuality(result.text); updateScanQualityIndicator(quality); console.log("📈 스캔 품질:", quality);
                stopScan(false); processScannedData(result.text);
                if (quality === 'poor') { showQualityMessage("제한적 품질로 처리되었습니다."); }
            }
            if (err && !(err instanceof ZXing.NotFoundException)) { console.warn("⚠️ 디코딩 에러:", err); }
        });
    } catch (err) { console.error("❌ startScan 에러:", err); handleCameraError(err); stopScan(true); } finally { btn.prop("disabled", false); }
}
function stopScan(hide = true) {
    console.log("🛑 스캔 중지 함수 호출"); if (_codeReader) { try { _codeReader.reset(); console.log("✅ ZXing 리더 리셋됨"); } catch (e) { console.warn("⚠️ ZXing 리셋 에러:", e); } _codeReader = null; }
    if (_currentStream) { try { _currentStream.getTracks().forEach(t => { t.stop(); console.log("✅ 카메라 트랙 정지:", t.label); }); _currentStream = null; } catch (e) { console.warn("⚠️ 스트림 종료 중 에러:", e); } }
    const video = document.getElementById("cameraPreview"); if (video) video.srcObject = null; if (hide) { const container = document.getElementById("cameraContainer"); if (container) container.style.display = "none"; } _isScanning = false; $("#btnScan").text("SCAN"); console.log("✅ 스캔 완전 중지됨");
}
function processScannedData(scannedData) { console.log("🔄 스캔된 데이터 처리 시작"); if (!dataAnalyzer) { console.error("❌ DataAnalyzer가 초기화되지 않음"); return; } try { dataAnalyzer.setBarcodeData(scannedData); setBarcodeSet(); console.log("✅ 데이터 처리 완료"); } catch (e) { console.error("❌ 데이터 처리 중 오류:", e); $("#txtResult").html("데이터 처리 오류: " + e.message); } }
function setBarcodeSet() { if (!dataAnalyzer) { console.error("❌ DataAnalyzer가 초기화되지 않음"); return; } console.log("🔄 setBarcodeSet 호출"); adjustTabs(); $("#txtResult").html(dataAnalyzer.getFullViewData()); $("body").scrollTop(0); setBarcodeResultDetail(); console.log("✅ UI 업데이트 완료"); }
function adjustTabs() { const blockCount = dataAnalyzer.getCount(); const selectedIndex = dataAnalyzer.getSelectedIndex(); console.log("🔧 블록 탭 조정:", blockCount, "개 블록, 선택:", selectedIndex); const defaultTabs = ['Assy', 'Sub01', 'Sub02']; let tabHTML = ''; for (let i = 0; i < Math.min(blockCount, 3); i++) { const isActive = (i === selectedIndex); tabHTML += `<button class="tab-button ${isActive ? 'active' : ''}" data-tab="${i}">${defaultTabs[i]}</button>`; } $("#blockTabs").html(tabHTML); console.log("✅ 탭 UI 업데이트 완료"); }
function selectBlock(index) { console.log("🔘 블록 선택:", index); if (!dataAnalyzer) { console.error("❌ DataAnalyzer가 초기화되지 않음"); return; } dataAnalyzer.setSelectIndex(index); $('.tab-button').removeClass('active'); $(`.tab-button[data-tab="${index}"]`).addClass('active'); setBarcodeResultDetail(); $("#txtResult").html(dataAnalyzer.getFullViewData()); console.log("✅ 블록 전환 완료"); }
function setBarcodeResultDetail() { setAllClear(); if (!dataAnalyzer) return; console.log("🔄 결과 테이블 업데이트 시작, 선택된 인덱스:", dataAnalyzer.getSelectedIndex()); var selectedResultData = dataAnalyzer.getSelectedResultData(); console.log("📊 선택된 블록 결과 데이터:", selectedResultData); if (selectedResultData && selectedResultData.length > 0) { selectedResultData.forEach(function (v) { console.log(`📋 결과 데이터: ${v[0]} - ${v[1]} - ${v[2]}`); $("#result" + v[0]).html(v[1]); if (v[2] === null || v[2] === "" || v[2] === undefined) { $("#data" + v[0]).html(""); } else { $("#data" + v[0]).html(v[2]); } }); } else { console.warn("⚠️ 선택된 블록에 결과 데이터가 없습니다."); $("#txtResult").html("데이터 분석 실패 - 결과 데이터가 없습니다."); } hideEmptyRows(); console.log("✅ 결과 테이블 업데이트 완료"); }
function hideEmptyRows() { const rowsToCheck = [ { id: "trEO", resultId: "result13", dataId: "data13" }, { id: "trSpecial", resultId: "result30", dataId: "data30" }, { id: "trFirstProd", resultId: "result31", dataId: "data31" }, { id: "trCompany", resultId: "result40", dataId: "data40" } ]; rowsToCheck.forEach(row => { const resultCell = $("#" + row.resultId).html(); const dataCell = $("#" + row.dataId).html(); if ((!resultCell || resultCell.trim() === "" || resultCell === "-") && (!dataCell || dataCell.trim() === "")) { $("#" + row.id).hide(); } else { $("#" + row.id).show(); } }); }
function setAllClear() { console.log("🔄 테이블 초기화"); const ids = ["00","10","11","12","13","20","21","22","23","30","31","40","50"]; ids.forEach(id => { $("#result" + id).html(""); $("#data" + id).html(""); }); $("table tr").show(); }
function evaluateScanQuality(scannedData) { var score = 0; console.log("🔍 스캔 품질 평가 시작 - 데이터 길이:", scannedData.length); if (scannedData.length > 50) score += 3; else if (scannedData.length > 30) score += 2; else if (scannedData.length > 15) score += 1; var headerCount = (scannedData.match(/\[\)>\x1E06\x1D/g) || []).length; console.log("🔍 헤더 개수:", headerCount); if (headerCount >= 1) score += 3; var hashCount = (scannedData.match(/#/g) || []).length; console.log("🔍 # 개수:", hashCount); if (hashCount >= 1) score += 2; if (scannedData.includes('[)>06')) score += 2; console.log("🔍 최종 품질 점수:", score); if (score >= 4) return 'excellent'; if (score >= 3) return 'good'; if (score >= 2) return 'fair'; return 'poor'; }
function updateScanQualityIndicator(quality) { var indicator = $("#qualityIndicator"); var text = "", color = ""; switch(quality) { case 'excellent': text = "✓ 우수한 품질"; color = "#4CAF50"; break; case 'good': text = "○ 좋은 품질"; color = "#8BC34A"; break; case 'fair': text = "△ 보통 품질"; color = "#FFC107"; break; case 'poor': text = "⚠️ 제한적 품질 - 데이터는 처리됨"; color = "#FF9800"; break; } indicator.text(text).css({'background-color': color, 'display': 'block'}); setTimeout(() => indicator.fadeOut(), quality === 'poor' ? 5000 : 3000); }
function showQualityMessage(message) { var currentContent = $("#txtResult").html(); $("#txtResult").html(currentContent + "<br><span style='color: #FF9800; font-size: 11px;'>⚠️ " + message + "</span>"); }
function handleCameraError(err) { var msg = "카메라 시작 실패: "; if (err.name === 'NotAllowedError') { msg = "카메라 권한이 거부되었습니다. 설정에서 허용해주세요."; } else if (err.name === 'NotFoundError') { msg = "카메라를 찾을 수 없습니다."; } else { msg += err.message || err; } alert(msg); }
window.stopScan = stopScan; window.selectBlock = selectBlock; window.setBarcodeResultDetail = setBarcodeResultDetail;
