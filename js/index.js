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
    
    // 2. 전체 바코드 데이터 표시 (모든 블록)
    $("#txtResult").html(dataAnalyzer.getFullViewData());
    
    // 3. 블록 선택 UI 추가
    addBlockSelectionUI();
    
    $("body").scrollTop(0);
    
    // 4. 결과 테이블 업데이트
    return setBarcodeResultDetail();
}

// 블록 선택 UI 추가
function addBlockSelectionUI() {
    const blockCount = dataAnalyzer.getCount();
    console.log("블록 개수:", blockCount);
    
    // 기존 선택 UI 제거
    $(".block-selection").remove();
    
    if (blockCount > 1) {
        let selectionHTML = `<div class="block-selection">
            <div class="selection-title">📦 검색된 블록: ${blockCount}개</div>
            <div class="selection-buttons">`;
        
        for (let i = 0; i < blockCount; i++) {
            const isSelected = i === dataAnalyzer.getSelectedIndex();
            selectionHTML += `<button class="block-btn ${isSelected ? 'selected' : ''}" 
                onclick="selectBlock(${i})">블록 ${i + 1}</button>`;
        }
        
        selectionHTML += `</div></div>`;
        
        // 결과 테이블 앞에 블록 선택 UI 추가
        $("#resultTable").before(selectionHTML);
    }
}

// 블록 선택 함수
function selectBlock(index) {
    if (!dataAnalyzer) return;
    
    console.log("블록 선택:", index);
    dataAnalyzer.setSelectIndex(index);
    
    // 선택된 블록 강조 표시 업데이트
    $(".block-btn").removeClass("selected");
    $(`.block-btn:eq(${index})`).addClass("selected");
    
    // 결과 테이블 업데이트
    setBarcodeResultDetail();
    
    // 전체 뷰 업데이트 (선택 강조)
    $("#txtResult").html(dataAnalyzer.getFullViewData());
}

function setBarcodeResultDetail() {
    setAllClear();
    if (!dataAnalyzer) return;
    
    console.log("setBarcodeResultDetail 호출");
    
    // 선택된 블록의 결과 데이터 가져오기
    var selectedResultData = dataAnalyzer.getSelectedResultData();
    console.log("선택된 블록 결과 데이터:", selectedResultData);
    
    if (selectedResultData && selectedResultData.length > 0) {
        selectedResultData.forEach(function (v) {
            console.log(`결과 데이터: ${v[0]} - ${v[1]} - ${v[2]}`);
            
            $("#result" + v[0]).html(v[1]);
            
            if (v[0] == "12" && (v[2] == null || v[2] == "")) {
                $("#result12").html("-");
                $("#data12").html("<span class='gray'>데이터 없음</span>");
            } else {
                if (v[1] && v[1].includes("OK") && (!v[2] || v[2] === "")) {
                    $("#result" + v[0]).html("-");
                }
                $("#data" + v[0]).html(v[2] || "");
            }
        });
    } else {
        console.warn("선택된 블록에 결과 데이터가 없습니다.");
    }
    
    // EO번호 표시/숨기기
    if ($("#result13").html() === "" || $("#result13").html() === "-") {
        $("#tr13").css("visibility", "collapse");
    } else {
        $("#tr13").css("visibility", "visible");
    }
    
    // 부가정보 (특이정보, 초도품) 표시/숨기기
    if (($("#result30").html() === "" || $("#result30").html() === "-") && 
        ($("#result31").html() === "" || $("#result31").html() === "-")) {
        $("#tr30, #tr31").css("visibility", "collapse");
    } else {
        $("#tr30, #tr31").css("visibility", "visible");
    }
    
    // 업체영역 표시/숨기기
    if ($("#result40").html() === "" || $("#result40").html() === "-") {
        $("#tr40").css("visibility", "collapse");
    } else {
        $("#tr40").css("visibility", "visible");
    }
    
    // ✅ rowspan 고정 (Safari 대응)
    $("#title_m10").attr("rowspan", "4");
    $("#title_m30").attr("rowspan", "2");
    
    console.log("결과 테이블 업데이트 완료");
}

/* ============================================================
 * 초기화
 * ============================================================ */
function setAllClear() {
    console.log("테이블 초기화");
    ["00","10","11","12","13","20","21","22","23","30","31","40","50"].forEach(id=>{
        $("#result"+id).html("");
        $("#data"+id).html("");
    });
    
    // 모든 행 표시로 초기화
    $("#tr13, #tr30, #tr31, #tr40").css("visibility", "visible");
}
