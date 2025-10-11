/**********************************************
*   웹앱용 메인 스크립트 (Cordova → Browser)
**********************************************/
var dataAnalyzer = new DataAnalyzer();

$(function () {
    $("#btnScan").click(startScan);
});

async function startScan() {
    const video = document.getElementById("cameraPreview");
    const container = document.getElementById("cameraContainer");
    container.style.display = "block";

    const codeReader = new ZXing.BrowserMultiFormatReader();
    try {
        const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
        const selected = devices.length > 1 ? devices[0].deviceId : undefined;

        await codeReader.decodeFromVideoDevice(selected, video, (result, err) => {
            if (result) {
                container.style.display = "none";
                codeReader.reset();

                // 바코드 검증
                const text = result.text;
                dataAnalyzer.setBarcodeData(text);
                setBarcodeSet();
            }
        });
    } catch (e) {
        alert("카메라 접근 실패: " + e);
    }
}

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

    // EO번호 행 처리
    if ($("#result13").html() == "") {
        $("#title_m10").attr("rowspan", "3");
        $("#tr13").hide();
    } else {
        $("#title_m10").attr("rowspan", "4");
        $("#tr13").show();
    }

    // 특이정보 / 초도품구분 처리
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
    for (let i of ["00","10","11","12","13","20","21","22","23","30","31","40","50"]) {
        $("#result" + i).html("");
        $("#data" + i).html("");
    }
}
