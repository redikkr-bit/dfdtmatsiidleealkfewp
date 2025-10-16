// 바코드 내용 검증 - 모든 블록 검증
function getDataCheckResult() {
    var result = true;
    _barcodeResultData = []; // 2차원 배열로 초기화

    _barcodeDataList.forEach(function (rowData, rowIndex) {
        // 각 블록별 결과 배열 초기화
        _barcodeResultData[rowIndex] = [];
        
        var ex_00 = false;
        var ex_10 = false, ex_11 = false, ex_12 = false, ex_13 = false;
        var ex_20 = false, ex_21 = false, ex_22 = false, ex_23 = false;
        var ex_30 = false, ex_31 = false;
        var ex_40 = false;
        var ex_50 = false;

        console.log(`블록 ${rowIndex} 분석 시작:`, rowData);

        // Header 검사
        if (rowData.length >= 7) {
            if (
                rowData[0] === 91 && // [
                rowData[1] === 41 && // )
                rowData[2] === 62 && // >
                rowData[3] === 30 && // RS
                rowData[4] === 48 && // 0
                rowData[5] === 54 && // 6
                rowData[6] === 29   // GS
            ) {
                ex_00 = true;
                setAddDetail("00", true, rowData.slice(0, 7), rowIndex);
            }
        }

        // Trailer 검사
        if (rowData[rowData.length - 1] === 35 || rowData[rowData.length - 1] === 4) {
            ex_50 = true;
            if (
                rowData[rowData.length - 4] === 29 &&
                rowData[rowData.length - 3] === 30 &&
                rowData[rowData.length - 2] === 4 &&
                rowData[rowData.length - 1] === 35
            ) {
                setAddDetail("50", true, rowData.slice(rowData.length - 4), rowIndex);
            } else {
                setAddDetail("50", true, rowData.slice(rowData.length - 3), rowIndex);
            }
        }

        // 구분자 기준 split 후 검증
        var parts = getCheckArrayData(rowData);
        console.log(`블록 ${rowIndex} 분할된 파트:`, parts);
        
        parts.forEach(function (partData) {
            if (partData.length === 0) return;
            
            var code = partData[0];
            console.log(`파트 분석: 코드=${code}, 데이터=`, partData);
            
            if (code === 86) { // V - 업체코드
                ex_10 = true;
                setAddDetail("10", partData.length === 6, partData.slice(1), rowIndex); // V + 5자리 코드
            } else if (code === 80) { // P - 부품번호
                ex_11 = true;
                var isOK = partData.length > 10 && partData.length < 17 && !chkHaveCode(partData, 45);
                setAddDetail("11", isOK, partData.slice(1), rowIndex);
            } else if (code === 83) { // S - 서열코드
                ex_12 = true;
                setAddDetail("12", partData.length > 1 && partData.length < 10, partData.slice(1), rowIndex);
            } else if (code === 69) { // E - EO번호
                ex_13 = true;
                setAddDetail("13", partData.length > 8 && partData.length < 11, partData.slice(1), rowIndex);
            } else if (code === 84) { // T - 추적코드
                if (partData.length >= 7) {
                    ex_20 = true;
                    var okDate = chkValidDate(partData.slice(1, 7));
                    setAddDetail("20", okDate, partData.slice(1, 7), rowIndex);
                    
                    // 부품4M, A or @, 추적번호 분리
                    if (partData.length > 7) {
                        var remaining = partData.slice(7);
                        if (remaining.length >= 1) {
                            setAddDetail("21", true, [remaining[0]], rowIndex); // 부품4M
                        }
                        if (remaining.length >= 2) {
                            setAddDetail("22", true, [remaining[1]], rowIndex); // A or @
                        }
                        if (remaining.length >= 3) {
                            setAddDetail("23", true, remaining.slice(2), rowIndex); // 추적번호
                        }
                    }
                }
            } else if (code === 67) { // C - 업체영역
                ex_40 = true;
                setAddDetail("40", partData.length > 1 && partData.length < 52, partData.slice(1), rowIndex);
            } else if (code === 77) { // M - 특이정보
                ex_30 = true;
                setAddDetail("30", partData.length > 1, partData.slice(1), rowIndex);
            } else if (code === 78) { // N - 초도품구분  
                ex_31 = true;
                setAddDetail("31", partData.length > 1, partData.slice(1), rowIndex);
            }
        });

        // 필수 항목 체크
        if (!ex_00) setAddDetail("00", false, null, rowIndex);
        if (!ex_10) setAddDetail("10", false, null, rowIndex);
        if (!ex_11) setAddDetail("11", false, null, rowIndex);
        if (!ex_20) setAddDetail("20", false, null, rowIndex);
        if (!ex_50) setAddDetail("50", false, null, rowIndex);

        console.log(`블록 ${rowIndex} 분석 완료:`, _barcodeResultData[rowIndex]);
    });

    return result;
}

// 결과 데이터 추가 - 모든 블록에 대해 저장
function setAddDetail(type, okng, dispData, rowIndex) {
    var strOKNG = okng ? "<span class='eot'>OK</span>" : "<span class='gs'>NG</span>";
    
    // 해당 블록의 결과 배열에 추가
    if (!_barcodeResultData[rowIndex]) {
        _barcodeResultData[rowIndex] = [];
    }
    
    // 중복 추가 방지
    var existingIndex = _barcodeResultData[rowIndex].findIndex(item => item[0] === type);
    if (existingIndex !== -1) {
        _barcodeResultData[rowIndex][existingIndex] = [
            type,
            strOKNG,
            dispData != null ? getCodeFromArrayData(dispData) : null
        ];
    } else {
        _barcodeResultData[rowIndex].push([
            type,
            strOKNG,
            dispData != null ? getCodeFromArrayData(dispData) : null
        ]);
    }
}
