/**********************************************
 * index.js - 통합 완성본
 **********************************************/

// 전역
var dataAnalyzer = null;
var _codeReader = null;
var _currentStream = null;
var _isScanning = false;

$(function(){
    // DataAnalyzer 존재 여부 확인
    if (typeof DataAnalyzer === "undefined") {
        $("#txtResult").text("DataAnalyzer 로드 실패. js/DataAnalyzer.js 확인.");
        return;
    }
    dataAnalyzer = new DataAnalyzer();

    $("#btnScan").off("click").on("click", function(e){
        e.preventDefault();
        if (!_isScanning) startScan(); else stopScan();
    });

    $("#txtResult").text("준비 완료 - SCAN 버튼을 터치하세요");
});

/* ---------------------------
   스캔 시작
   --------------------------- */
async function startScan(){
    const video = document.getElementById("cameraPreview");
    const camContainer = document.getElementById("cameraContainer");
    const btn = $("#btnScan");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("카메라 API를 사용할 수 없습니다.");
        return;
    }
    if (location.protocol !== "https:" && location.hostname !== "localhost") {
        alert("카메라 기능은 HTTPS 환경에서만 동작합니다.");
        return;
    }

    // ZXing 로드 확인
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
        try { await video.play(); } catch(e){ /* iOS 자동재생 제한 무시 */ }

        camContainer.style.display = "flex";
        _isScanning = true;
        btn.text("스캔 중... (탭하면 중지)");

        // 인스턴스 방식으로 ZXing 사용
        const reader = new ZXing.BrowserMultiFormatReader();
        _codeReader = reader;

        // 장치 목록(옵션)
        try {
            const devices = await reader.listVideoInputDevices();
            // console.log("devices", devices);
        } catch(e){
            // 일부 환경에서 목록 가져오기 실패 가능 — 무시
        }

        reader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result && result.text) {
                stopScan(false);
                handleScanResult(result.text);
            }
            // err는 무시( NotFoundException 빈번 )
        });

    } catch (err) {
        console.error("startScan error:", err);
        alert("카메라 시작 실패: " + (err.message || err));
        stopScan(true);
    } finally {
        btn.prop("disabled", false);
    }
}

/* ---------------------------
   스캔 중지
   --------------------------- */
function stopScan(hide=true){
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

/* ---------------------------
   스캔 결과 처리 (멀티블록 포함)
   --------------------------- */
function handleScanResult(rawText) {
    // 1) 원본 안전하게 화면에 표시 (제어문자 가시화)
    const safeHtml = rawToSafeHtml(rawText);
    $("#txtResult").html(safeHtml);

    // 2) 분석용(원문) 전달
    try {
        dataAnalyzer.setBarcodeData(rawText);
    } catch (e) {
        $("#txtResult").append("<br><span style='color:red;'>DataAnalyzer 오류: "+e.message+"</span>");
        return;
    }

    // 3) 블록 수 가져와서 블록별 결과 렌더
    const blocks = dataAnalyzer.getCount();
    $("#blocksContainer").empty();

    for (let i=0;i<blocks;i++){
        dataAnalyzer.setSelectIndex(i);
        const resultData = dataAnalyzer.getResultData(); // 배열 [ [type, OK/NG, data], ... ]
        renderBlock(i+1, resultData);
    }
}

/* ---------------------------
   단일 블록 렌더 함수
   - resultData: array from DataAnalyzer.getResultData()
   --------------------------- */
function renderBlock(blockNo, resultData){
    const container = $("#blocksContainer");
    const wrap = $("<div>").addClass("blockWrap");
    wrap.append($("<div>").addClass("blockTitle").text("📦 Block " + blockNo));

    // Build table rows according to the expected layout
    const tbl = $("<table>").addClass("blockTable");
    // header row (columns: 구분 / 결과 / Data)
    const thead = $("<thead>");
    thead.append(`<tr><th style="width:28%;">구분</th><th style="width:12%;">결과</th><th>Data</th></tr>`);
    tbl.append(thead);

    const tbody = $("<tbody>");

    // we will map code->display using label map
    const labelMap = {
        "00":"Header","10":"업체코드","11":"부품번호","12":"서열코드","13":"EO번호",
        "20":"생산일자","21":"부품4M","22":"A or @","23":"추적번호(7~)",
        "30":"특이정보","31":"초도품구분","40":"업체영역","50":"Trailer"
    };

    // build a map for quick lookup
    const dmap = {};
    resultData.forEach(function(r){
        dmap[r[0]] = { okng: r[1], data: r[2] };
    });

    // Rows in logical order grouped like app screenshot
    const rowsOrder = [
        ["00"], // Header
        ["10","11","12","13"], // 사양정보 (업체코드/부품번호/서열/EO)
        ["20","21","22","23"], // 추적정보
        ["30","31"], // 부가정보
        ["40"], // 기타
        ["50"]  // Trailer
    ];

    rowsOrder.forEach(group => {
        group.forEach(code => {
            const lbl = labelMap[code] || code;
            const entry = dmap[code] || { okng: "", data: "" };
            const tr = $("<tr>");
            tr.append($("<td>").text(lbl));
            tr.append($("<td>").addClass("ct").html(entry.okng || ""));
            tr.append($("<td>").html(entry.data || ""));
            tbody.append(tr);
        });
    });

    tbl.append(tbody);
    wrap.append(tbl);
    container.append(wrap);

    // After appending, ensure table layout stable (force reflow)
    // This line forces browser to re-calc layout which helps Safari
    // with rowspan/vertical-align quirks even though we don't use rowspan here.
    wrap[0].offsetHeight;
}

/* ---------------------------
   원문 -> 안전한 HTML (제어문자 시각화)
   --------------------------- */
function rawToSafeHtml(str){
    if (!str) return "";
    // replace control chars with [0x..] blocks, keep printable as-is but escape <>&
    let out = "";
    for (let i=0;i<str.length;i++){
        const ch = str[i];
        const code = ch.charCodeAt(0);
        if (code <= 31 || code === 127) {
            const hex = code.toString(16).toUpperCase().padStart(2,"0");
            out += `<span class="ctrl">[0x${hex}]</span>`;
        } else {
            // escape special HTML chars
            if (ch === "&") out += "&amp;";
            else if (ch === "<") out += "&lt;";
            else if (ch === ">") out += "&gt;";
            else out += ch;
        }
    }
    // preserve newlines
    out = out.replace(/\r?\n/g, "<br>");
    return out;
}
