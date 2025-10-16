/******************************************
 * 데이터 분석 및 검증 + 시각화 모듈 - 다중 블록 지원
 ******************************************/
function DataAnalyzer() {
    var _barcodeData = [];
    var _barcodeDataList = [];
    var _barcodeResultData = []; // 모든 블록의 결과를 저장하는 2차원 배열
    var _barcodeDataStr = "";
    var _barcodeCount = 0;
    var _selectedIndex = 0;

    // 바코드 데이터 설정
    this.setBarcodeData = function (strData) {
        _barcodeData = [];
        _barcodeDataList = [];
        _barcodeResultData = [];
        _selectedIndex = 0;
        _barcodeCount = 0;
        _barcodeDataStr = strData;
        setArrayFromString(strData);
        setSharpDivide();
        
        console.log("바코드 데이터 설정 완료. 블록 개수:", _barcodeCount);
        console.log("바코드 데이터:", strData);
    };

    // 선택된 index 번호 설정
    this.setSelectIndex = function (index) {
        if (index >= 0 && index < _barcodeCount) {
            _selectedIndex = index;
            console.log("선택된 블록 인덱스:", _selectedIndex);
        }
    };

    // View용 전체 문자열 리턴 - 선택된 블록만 표시
    this.getFullViewData = function () {
        return getCodeFromArray();
    };

    // #으로 구분된 바코드 세트 개수 리턴
    this.getCount = function () {
        return _barcodeCount;
    };

    // 모든 블록의 검증 결과 리턴
    this.getAllResultData = function () {
        return _barcodeResultData;
    };

    // 선택된 블록의 검증 결과 리턴
    this.getSelectedResultData = function () {
        if (_barcodeResultData[_selectedIndex]) {
            return _barcodeResultData[_selectedIndex];
        }
        return [];
    };

    // 선택된 index 번호 리턴
    this.getSelectedIndex = function () {
        return _selectedIndex;
    };

    // 바코드 내용 검증
    this.getCheckResult = function () {
        return getDataCheckResult();
    };

    // # 기준으로 바코드를 나눠서 보관
    function setSharpDivide() {
        var rowData = [];
        console.log("바코드 데이터 분할 시작:", _barcodeData);
        
        _barcodeData.forEach(function (v, index) {
            rowData.push(v);
            if (v === 35) { // # (샵 문자)
                if (rowData.length > 0) {
                    _barcodeDataList.push(rowData);
                    console.log(`블록 ${_barcodeCount} 추가:`, rowData);
                    rowData = [];
                    _barcodeCount += 1;
                }
            }
        });
        
        // 마지막 블록 처리
        if (rowData.length > 0) {
            _barcodeDataList.push(rowData);
            _barcodeCount += 1;
            console.log(`마지막 블록 ${_barcodeCount} 추가:`, rowData);
        }
        
        console.log(`분리된 블록 개수: ${_barcodeCount}`);
    }

    // 배열 데이터를 표시용 문자열로 리턴 - 선택된 블록만 표시
    function getCodeFromArray() {
        var rtnData = "";
        if (_barcodeDataList[_selectedIndex]) {
            _barcodeDataList[_selectedIndex].forEach(function (v) {
                rtnData += getCodeToChar(v);
            });
        }
        return rtnData;
    }

    // 입력받은 배열 데이터를 표시용 문자열로 리턴
    function getCodeFromArrayData(arrData) {
        var rtnData = "";
        if (typeof arrData === "number") {
            rtnData = getCodeToChar(arrData);
        } else if (Array.isArray(arrData)) {
            arrData.forEach(function (v) {
                rtnData += getCodeToChar(v);
            });
        }
        return rtnData;
    }

    // 문자열을 바이트 배열로 변환
    function setArrayFromString(str) {
        _barcodeData = [];
        for (var i = 0; i < str.length; i++) {
            _barcodeData.push(str.charCodeAt(i));
        }
    }

    // 문자 코드 → 화면용 문자 변환
    function getCodeToChar(str) {
        var tmp = "";
        if (str === 29) {
            tmp = "<span class='gs'>G_S</span>";
        } else if (str === 30) {
            tmp = "<span class='rs'>R_S</span>";
        } else if (str === 4) {
            tmp = "<span class='eot'>EO_T</span>";
        } else if (str === 35) {
            tmp = "#";
        } else if (str === 34) {
            tmp = '"';
        } else if (str === 39) {
            tmp = "'";
        } else if (str === 96) {
            tmp = "";
        } else {
            if ((str >= 0 && str <= 32) || str === 127) {
                tmp = "&lt;0x" + lpad(str.toString(16).toUpperCase(), 2) + "&gt;";
            } else {
                tmp = String.fromCharCode(str);
            }
        }
        return tmp;
    }

    // 바코드 내용 검증 - 모든 블록 검증
    function getDataCheckResult() {
        var result = true;
        _barcodeResultData = []; // 2차원 배열로 초기화

        _barcodeDataList.forEach(function (rowData, rowIndex) {
            // 각 블록별 결과 배열 초기화
            _barcodeResultData[rowIndex] = [];
            
            var ex_00 = false, ex_10 = false, ex_11 = false, ex_12 = false;
            var ex_13 = false, ex_20 = false, ex_21 = false, ex_22 = false;
            var ex_23 = false, ex_30 = false, ex_31 = false, ex_40 = false, ex_50 = false;

            console.log(`블록 ${rowIndex} 분석 시작:`, rowData);

            // Header 검사 [)>06
            if (rowData.length >= 7) {
                if (rowData[0] === 91 && rowData[1] === 41 && rowData[2] === 62 && 
                    rowData[3] === 30 && rowData[4] === 48 && rowData[5] === 54 && 
                    rowData[6] === 29) {
                    ex_00 = true;
                    setAddDetail("00", true, rowData.slice(0, 7), rowIndex);
                }
            }

            // Trailer 검사
            var hasTrailer = false;
            if (rowData.length >= 4) {
                if (rowData[rowData.length - 4] === 29 && // GS
                    rowData[rowData.length - 3] === 30 && // RS
                    rowData[rowData.length - 2] === 4 &&   // EOT
                    rowData[rowData.length - 1] === 35) {  // #
                    ex_50 = true;
                    hasTrailer = true;
                    setAddDetail("50", true, rowData.slice(rowData.length - 4), rowIndex);
                }
            }
            if (!hasTrailer && rowData[rowData.length - 1] === 35) {
                ex_50 = true;
                setAddDetail("50", true, [rowData[rowData.length - 1]], rowIndex);
            }

            // 구분자 기준 분할 및 검증
            var parts = getCheckArrayData(rowData);
            console.log(`블록 ${rowIndex} 분할된 파트 개수:`, parts.length);
            
            parts.forEach(function (partData, partIndex) {
                if (partData.length === 0) return;
                
                var code = partData[0];
                var codeChar = String.fromCharCode(code);
                console.log(`블록 ${rowIndex} 파트 ${partIndex}: 코드=${codeChar}, 데이터=`, partData);
                
                if (code === 86) { // V - 업체코드
                    ex_10 = true;
                    // V + 5자리 코드 (VKM54)
                    setAddDetail("10", partData.length === 6, partData.slice(1), rowIndex);
                } else if (code === 80) { // P - 부품번호
                    ex_11 = true;
                    var isOK = partData.length >= 11 && partData.length <= 16;
                    setAddDetail("11", isOK, partData.slice(1), rowIndex);
                } else if (code === 83) { // S - 서열코드
                    ex_12 = true;
                    setAddDetail("12", partData.length > 1 && partData.length < 10, partData.slice(1), rowIndex);
                } else if (code === 69) { // E - EO번호
                    ex_13 = true;
                    setAddDetail("13", partData.length >= 9 && partData.length <= 10, partData.slice(1), rowIndex);
                } else if (code === 84) { // T - 추적코드
                    if (partData.length >= 7) {
                        ex_20 = true;
                        var datePart = partData.slice(1, 7);
                        var okDate = chkValidDate(datePart);
                        setAddDetail("20", okDate, datePart, rowIndex);
                        
                        // 부품4M (1문자)
                        if (partData.length > 7) {
                            setAddDetail("21", true, [partData[7]], rowIndex);
                            ex_21 = true;
                        }
                        // A or @ (1문자)
                        if (partData.length > 8) {
                            setAddDetail("22", true, [partData[8]], rowIndex);
                            ex_22 = true;
                        }
                        // 추적번호 (나머지)
                        if (partData.length > 9) {
                            setAddDetail("23", true, partData.slice(9), rowIndex);
                            ex_23 = true;
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

            console.log(`블록 ${rowIndex} 분석 완료. 결과 항목:`, _barcodeResultData[rowIndex].length);
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

    // 구분자(ASCII 29) 기준으로 분할
    function getCheckArrayData(arrData) {
        var rtnData = [];
        var rowData = [];
        
        for (var i = 0; i < arrData.length; i++) {
            var v = arrData[i];
            if (v === 29) { // GS
                if (rowData.length > 0) {
                    rtnData.push(rowData.slice(0));
                    rowData = [];
                }
            } else if (v !== 32) { // 공백 제외
                rowData.push(v);
            }
        }
        
        // 마지막 부분 추가
        if (rowData.length > 0) {
            rtnData.push(rowData.slice(0));
        }
        
        return rtnData;
    }

    // 배열에 특정 코드 포함 여부 확인
    function chkHaveCode(arrData, chkCode) {
        return arrData.some(function (v) {
            return v === chkCode;
        });
    }

    // 날짜 형식 검증 (YYMMDD)
    function chkValidDate(arrData) {
        if (!arrData || arrData.length !== 6) return false;
        
        var strDate = "";
        arrData.forEach(function (v) {
            strDate += String.fromCharCode(v);
        });
        
        var df = /^[0-9]{6}$/;
        if (!df.test(strDate)) return false;
        
        var year = Number("20" + strDate.substr(0, 2));
        var month = Number(strDate.substr(2, 2));
        var day = Number(strDate.substr(4, 2));
        
        // 간단한 날짜 유효성 검사
        if (month < 1 || month > 12 || day < 1 || day > 31) return false;
        
        return true;
    }

    // 왼쪽 0 채우기
    function lpad(n, width) {
        n = n + "";
        return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
    }
}
