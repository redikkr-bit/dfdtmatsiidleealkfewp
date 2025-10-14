/******************************************
 *   데이터 분석 및 검증 + 시각화 모듈
 ******************************************/

function DataAnalyzer() {
    var _barcodeData = [];
    var _barcodeDataList = [];
    var _barcodeResultData = [];
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
    };

    // 선택된 index 번호 설정
    this.setSelectIndex = function (index) {
        _selectedIndex = index;
    };

    // View용 전체 문자열 리턴
    this.getFullViewData = function () {
        return getCodeFromArray();
    };

    // #으로 구분된 바코드 세트 개수 리턴
    this.getCount = function () {
        return _barcodeCount;
    };

    // 바코드 검증 결과 리턴(true/false)
    this.getCheckResult = function () {
        return getDataCheckResult();
    };

    // 바코드 검증결과 중 선택된 index의 상세 내용 리턴
    this.getResultData = function () {
        return _barcodeResultData;
    };

    // 선택된 index 번호 리턴
    this.getSelectedIndex = function () {
        return _selectedIndex;
    };

    // # 기준으로 바코드를 나눠서 보관
    function setSharpDivide() {
        var rowData = [];
        _barcodeData.forEach(function (v) {
            rowData.push(v);
            if (v === 35) { // #
                _barcodeDataList.push(rowData);
                rowData = [];
                _barcodeCount += 1;
            }
        });
        if (rowData.length > 0) {
            _barcodeDataList.push(rowData);
            _barcodeCount += 1;
        }
    }

    // 배열 데이터를 표시용 문자열로 리턴
    function getCodeFromArray() {
        var rtnData = "";
        _barcodeDataList.forEach(function (valRow, indexRow) {
            if (indexRow === _selectedIndex) rtnData += "<span class='selected'>";
            valRow.forEach(function (v) {
                rtnData += getCodeToChar(v);
            });
            if (indexRow === _selectedIndex) rtnData += "</span>";
        });
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
            tmp = "<span class='gs'><sup>G</sup><sub>S</sub></span>";
        } else if (str === 30) {
            tmp = "<span class='rs'><sup>R</sup><sub>S</sub></span>";
        } else if (str === 4) {
            tmp = "<span class='eot'><sup>E</sup>O<sub>T</sub></span>";
        } else if (str === 35) {
            tmp = "#<br>";
        } else if (str === 34) {
            tmp = '"';
        } else if (str === 39) {
            tmp = "'";
        } else if (str === 96) {
            tmp = "`";
        } else {
            if ((str >= 0 && str <= 32) || str === 127)
                tmp = "&lt;0x" + lpad(str.toString(16).toUpperCase(), 2) + "&gt;";
            else tmp = String.fromCharCode(str);
        }
        return tmp;
    }

    // 바코드 내용 검증
    function getDataCheckResult() {
        var result = true;
        _barcodeResultData = [];

        _barcodeDataList.forEach(function (rowData, rowIndex) {
            var ex_00 = false;
            var ex_10 = false, ex_11 = false, ex_12 = false, ex_13 = false;
            var ex_20 = false, ex_21 = false, ex_22 = false, ex_23 = false;
            var ex_30 = false, ex_31 = false;
            var ex_40 = false;
            var ex_50 = false;

            // Header 검사
            if (rowData.length >= 7) {
                if (
                    rowData[0] === 91 &&
                    rowData[1] === 41 &&
                    rowData[2] === 62 &&
                    rowData[3] === 30 &&
                    rowData[4] === 48 &&
                    rowData[5] === 54 &&
                    rowData[6] === 29
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
            getCheckArrayData(rowData).forEach(function (partData) {
                var code = partData[0];
                if (code === 86) { // V - 업체코드
                    ex_10 = true;
                    setAddDetail("10", partData.length === 5, partData.slice(1), rowIndex);
                } else if (code === 80) { // P - 부품번호
                    ex_11 = true;
                    var isOK = partData.length > 10 && partData.length < 17 && !chkHaveCode(partData, 45);
                    setAddDetail("11", isOK, partData.slice(1), rowIndex);
                } else if (code === 83) { // S - 서열코드
                    ex_12 = true;
                    setAddDetail("12", partData.length > 0 && partData.length < 10, partData.slice(1), rowIndex);
                } else if (code === 69) { // E - EO번호
                    ex_13 = true;
                    setAddDetail("13", partData.length > 8 && partData.length < 11, partData.slice(1), rowIndex);
                } else if (code === 84) { // T - 추적코드
                    if (partData.length > 6) {
                        ex_20 = true;
                        var okDate = chkValidDate(partData.slice(1, 7));
                        setAddDetail("20", okDate, partData.slice(1, 7), rowIndex);
                    }
                } else if (code === 67) { // C - 업체영역
                    ex_40 = true;
                    setAddDetail("40", partData.length > 0 && partData.length < 52, partData.slice(1), rowIndex);
                }
            });

            // 필수 항목 체크
            if (!ex_00) setAddDetail("00", false, null, rowIndex);
            if (!ex_10) setAddDetail("10", false, null, rowIndex);
            if (!ex_11) setAddDetail("11", false, null, rowIndex);
            if (!ex_20) setAddDetail("20", false, null, rowIndex);
            if (!ex_50) setAddDetail("50", false, null, rowIndex);
        });
        return result;
    }

    // 결과 데이터 추가
    function setAddDetail(type, okng, dispData, rowIndex) {
        if (_selectedIndex === rowIndex) {
            var strOKNG = okng ? "<span class='eot'>OK</span>" : "<span class='gs'>NG</span>";
            _barcodeResultData.push([
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
        arrData.forEach(function (v) {
            if (v === 29) {
                rtnData.push(rowData.slice(0));
                rowData = [];
            } else if (v !== 32) {
                rowData.push(v);
            }
        });
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
        var strDate = "";
        arrData.forEach(function (v) {
            strDate += String.fromCharCode(v);
        });
        var df = /^[0-9]{6}$/;
        if (!df.test(strDate)) return false;

        var year = Number("20" + strDate.substr(0, 2));
        var month = Number(strDate.substr(2, 2));
        var day = Number(strDate.substr(4, 2));

        if (month < 1 || month > 12 || day < 1 || day > 31) return false;
        return true;
    }

    // 왼쪽 0 채우기
    function lpad(n, width) {
        n = n + "";
        return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
    }
}
