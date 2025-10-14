/**********************************************
 * js/index.js - 통합 구현본
 **********************************************/

var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function(){
  // DataAnalyzer 확인 및 초기화
  if (typeof DataAnalyzer === "undefined") {
    $("#txtResult").text("DataAnalyzer 로드 실패 (js/DataAnalyzer.js 확인)");
    return;
  }
  dataAnalyzer = new DataAnalyzer();

  $("#btnScan").off("click").on("click", function(e){
    e.preventDefault();
    if (!_isScanning) startScan();
    else stopScan();
  });

  $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

/* --------- startScan --------- */
async function startScan(){
  const video = document.getElementById("cameraPreview");
  const camContainer = document.getElementById("cameraContainer");
  const btn = $("#btnScan");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("카메라 API를 지원하지 않습니다.");
    return;
  }
  if (location.protocol !== "https:" && location.hostname !== "localhost") {
    alert("카메라 기능은 HTTPS 환경에서만 동작합니다.");
    return;
  }
  if (typeof ZXing === "undefined" || !ZXing.BrowserMultiFormatReader) {
    alert("ZXing 라이브러리가 로드되지 않았습니다.");
    return;
  }

  try {
    btn.prop("disabled", true).text("카메라 권한 요청 중...");

    _currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    video.srcObject = _currentStream;
    try { await video.play(); } catch(e) { /* iOS 자동재생 이슈 무시 */ }

    camContainer.style.display = "flex";
    _isScanning = true;
    btn.text("스캔 중... (탭하면 중지)");

    // ZXing 인스턴스 방식
    const reader = new ZXing.BrowserMultiFormatReader();
    _codeReader = reader;

    // 비디오 디코드 시작; null => 기본 카메라
    reader.decodeFromVideoDevice(null, video, (result, err) => {
      if (result && result.text) {
        stopScan(false);
        handleScanResult(result.text);
      }
      // NotFoundException은 자주 발생하므로 로깅만
      if (err && !(err instanceof ZXing.NotFoundException)) {
        console.warn("decode error:", err);
      }
    });

  } catch (err) {
    console.error("startScan error:", err);
    alert("카메라 시작 실패: " + (err.message || err));
    stopScan(true);
  } finally {
    btn.prop("disabled", false);
  }
}

/* --------- stopScan --------- */
function stopScan(hide = true) {
  if (_codeReader) {
    try { _codeReader.reset(); } catch(e) {}
    _codeReader = null;
  }
  if (_currentStream) {
    _currentStream.getTracks().forEach(t => t.stop());
    _currentStream = null;
  }
  const video = document.getElementById("cameraPreview");
  if (video) video.srcObject = null;
  if (hide) document.getElementById("cameraContainer").style.display = "none";
  _isScanning = false;
  $("#btnScan").text("SCAN");
}

/* --------- handleScanResult --------- */
function handleScanResult(rawText) {
  // 1) 화면용 안전한 HTML로 변환(제어문자 가시화)
  $("#txtResult").html(rawToSafeHtml(rawText));

  // 2) 분석(원본 문자열 전달)
  try {
    dataAnalyzer.setBarcodeData(rawText);
  } catch (e) {
    $("#txtResult").append("<br><span style='color:red'>DataAnalyzer 오류: " + e.message + "</span>");
    return;
  }

  // 3) 블록별 렌더
  const blockCount = dataAnalyzer.getCount();
  $("#blocksContainer").empty();

  for (let i = 0; i < blockCount; i++) {
    dataAnalyzer.setSelectIndex(i);
    const res = dataAnalyzer.getResultData(); // [ [type, OK/NG, data], ... ]
    renderBlockTable(i + 1, res);
  }
}

/* --------- renderBlockTable : 블록별 표 생성 --------- */
function renderBlockTable(blockNo, resultData) {
  // label 매핑
  const labelMap = {
    "00":"Header","10":"업체코드","11":"부품번호","12":"서열코드","13":"EO번호",
    "20":"생산일자","21":"부품4M","22":"A or @","23":"추적번호(7~)",
    "30":"특이정보","31":"초도품구분","40":"업체영역","50":"Trailer"
  };

  // 빠른 조회 map
  const dm = {};
  resultData.forEach(r => { dm[r[0]] = { okng: r[1], data: r[2] }; });

  const wrap = $("<div>").addClass("blockWrap");
  wrap.append($("<div>").addClass("blockTitle").html("📦 Block " + blockNo));

  const tbl = $("<table>").addClass("blockTable");
  const thead = $("<thead>");
  thead.append(`<tr><th style="width:30%">구분</th><th style="width:12%">결과</th><th>Data</th></tr>`);
  tbl.append(thead);

  const tbody = $("<tbody>");

  // Render rows in the same logical groups as original app (keeps order)
  const rowsOrder = [
    ["00"],
    ["10","11","12","13"],
    ["20","21","22","23"],
    ["30","31"],
    ["40"],
    ["50"]
  ];

  rowsOrder.forEach(group => {
    group.forEach(code => {
      const lbl = labelMap[code] || code;
      const ent = dm[code] || { okng: "", data: "" };
      const tr = $("<tr>");
      tr.append($("<td>").text(lbl));
      tr.append($("<td>").addClass("ct").html(ent.okng || ""));
      tr.append($("<td>").html(ent.data || ""));
      tbody.append(tr);
    });
  });

  tbl.append(tbody);
  wrap.append(tbl);
  $("#blocksContainer").append(wrap);

  // 강제 reflow: 일부 Safari 렌더링 문제 예방
  wrap[0].offsetHeight;
}

/* --------- rawToSafeHtml --------- */
function rawToSafeHtml(str) {
  if (!str) return "";
  let out = "";
  for (let i=0;i<str.length;i++){
    const ch = str[i];
    const code = ch.charCodeAt(0);
    if (code <= 31 || code === 127) {
      const hex = code.toString(16).toUpperCase().padStart(2,"0");
      out += `<span class="ctrl">[0x${hex}]</span>`;
    } else {
      if (ch === "&") out += "&amp;";
      else if (ch === "<") out += "&lt;";
      else if (ch === ">") out += "&gt;";
      else out += ch;
    }
  }
  out = out.replace(/\r?\n/g, "<br>");
  return out;
}
