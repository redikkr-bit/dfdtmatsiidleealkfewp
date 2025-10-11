/**********************************************
*   Barcode Checker (WebApp Safari 대응)
**********************************************/
var dataAnalyzer = new DataAnalyzer();

$(function () {
    $("#btnScan").click(startScan);
});

/* ============================================================
 *  SCAN FUNCTION
 * ============================================================ */
async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");

    try {
        // Safari 보안 제한 대응: HTTPS 환경에서만 허용
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            alert("⚠️ 카메라 기능은 HTTPS 환경에서만 작동합니다.\nGitHub Pages 또는 SSL 서버에서 테스트하세요.");
            return;
        }

        // 카메라 접근 권한 요청
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        container.style.display = "block";

        // Safari 초기 딜레이 (WASM 안정화)
        await new Promise(resolve => setTimeout(resolve, 700));

        // ZXing 초기화
        const codeReader = new ZXing.BrowserMultiFormatReader();
        codeReader.decodeFromVideoDevice(null, video, (result, err) => {
            if (result) {
                // 스캔 성공
                stream.getTracks().forEach(track => track.stop());
                container.style.display = "none";
                codeReader.reset();

                const text = result.text;
                console.log("✅ Scan Result:", text);
                dataAnalyzer.setBarcodeData(text);
                setBarcodeSet();

                alert("✅ DataMatrix 스캔 성공!\n\n" + text);
            }
        });
    } catch (e) {
        console.error("Camera Error:", e);
        alert("❌ 카메라 접근 실패 또는 권한 거부\n\n" + e.message);
    }
}

/* ============================================================
 *  TABLE VIEW LOGIC (원본 코드 유지)
 * ============================================================ */
function setTabShowHidden(cnt) {
    $(".tabButtonArea").hide();
    $("body").css("margin-bottom", "104px");
}

function setBarcodeSet() {
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    setTabShowHidden(dataAnalyzer.getCount());
    $("body").scrollTop(0);
    return setBarcodeResultDetail();
}

function setBarcodeResultDetail() {
    setAllClear();
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

    // EO번호 표시 여부
    if ($("#result13").html() == "") {
        $("#title_m10").attr("rowspan", "3");
        $("#tr13").hide();
    } else {
        $("#title_m10").attr("rowspan", "4");
        $("#tr13").show();
    }

    // 특이정보 / 초도품구분 표시 로직
    if ($("#result30").html() != "" && $("#result31").html() != "") {
        $("#tr30").show();
        $("#tr31").show();
        $("#title_m30").attr("rowspan", "2");
    } else if ($("#result30").html() != "") {
        $("#tr30").show();
        $("#tr31").hide();
        $("#title_m30").attr("rowspan", "1");
    } else if ($("#result31").html() != "") {
        $("#tr30").hide();
        $("#tr31").show();
    } else {
        $("#tr30").hide();
        $("#tr31").hide();
    }

    // 업체영역 표시 여부
    if ($("#result40").html() == "") {
        $("#tr40").hide();
    } else {
        $("#tr40").show();
    }

    return okng;
}

function setAllClear() {
    for (let i of ["00", "10", "11", "12", "13", "20", "21", "22", "23", "30", "31", "40", "50"]) {
        $("#result" + i).html("");
        $("#data" + i).html("");
    }
}
