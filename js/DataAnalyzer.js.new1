/******************************************
*   데이터 분석 및 검증 + 시각화 모듈
******************************************/

function DataAnalyzer() {
    var _barcodeData = [];
    var _barcodeDataList = [];
    var _barcodeResultData = [];
    var _barcodeDataStr = "";
    var _fullViewData = "";
    var _barcodeCount = 0;
    var _selectedIndex = 0;

    // 바코드 데이터 설정
    this.setBarcodeData = function(strData) {
        _barcodeData = [];
        _barcodeDataList = [];
        _barcodeResultData = [];
        _barcodeData = 0;
        _selectedIndex = 0;
        _barcodeCount = 0;
        _barcodeDataStr = strData;
        setArrayFromString(strData);
        setSharpDivide();
    }
    // 선택된 index 번호 설정
    this.setSelectIndex = function(index) {
        _selectedIndex = index;
    }
    // View용 전체 String 문자열 리턴
    this.getFullViewData = function() {
        return getCodeFromArray();
    }
    // #으로 구분된 바코드셋트의 갯수 리턴
    this.getCount = function() {
        return _barcodeCount;
    }
    // 바코드 검증 결과 리턴(true / false)
    this.getCheckResult = function() {
        return getDataCheckResult();
    }
    // 바코드 검증결과 중 선택된 index의 상세 내용 리턴
    this.getResultData = function() {
        return _barcodeResultData;
    }
    // 선택된 index 번호 리턴
    this.getSelectedIndex = function() {
        return _selectedIndex;
    }
    // # 기준으로 바코드를 나눠서 보관
    function setSharpDivide(){
        var rowData = [];
        _barcodeData.forEach(function(v,i){
            rowData.push(v);
            if (v == 35) {  // # (DEC)
                _barcodeDataList.push(rowData);
                rowData = [];
                _barcodeCount += 1;
            }
        });
        if (rowData.length > 0) {
            _barcodeDataList.push(rowData);
            _barcodeCount += 1;
        }
        rowData = null;
    }
    // 배열 데이터(바이트)를 화면 표시용 String 데이터로 리턴
    function getCodeFromArray(){
        var rtnData = "";
        _barcodeDataList.forEach(function(valRow,indexRow){
            if (indexRow == _selectedIndex)
                rtnData += "<span class='selected'>";

            valRow.forEach(function(v,i){
                rtnData += getCodeToChar(v);
            });

            if (indexRow == _selectedIndex)
                rtnData += "</span>";
        });
        return rtnData;
    }
    // 입력받은 데이터(배열 바이트)를 화면 표시용 String 데이터로 리턴
    function getCodeFromArrayData(arrData){
        var rtnData = "";
        if (jQuery.type(arrData) == "number") {
            rtnData = getCodeToChar(arrData);
        } else {
            arrData.forEach(function(v,i){
                rtnData += getCodeToChar(v);
            });
        }
        return rtnData;
    }
    // String 데이터를 바이트 배열 데이터로 저장(_barcodeData)
    function setArrayFromString(str){
        _barcodeData = [];
        for (var i=0;i<str.length;i++){
            _barcodeData.push(str.charCodeAt(i));
        }
    }
    // 문자코드를 표시용 문자로 리턴
    function getCodeToChar(str){
        var tmp;
        if (str == 29){
            tmp = "<span class='gs'><sup>G</sup><sub>S</sub></span>";
        } else if (str == 30) {
            tmp = "<span class='rs'><sup>R</sup><sub>S</sub></span>";
        } else if (str == 4){
            tmp = "<span class='eot'><sup>E</sup>O<sub>T</sub></span>";
        } else if (str == 35) {
            tmp = "#<br>";
        } else if (str == 34) {
            tmp = "\"";
        } else if (str == 39) {
            tmp = "\"";
        } else if (str == 96) {
            tmp = "`";
        } else {
            if (str >= 0 && str <=32 || str == 127)
                tmp = "<0x" + lpad(str.toString(16).toUpperCase(),2) + ">";
            else
                tmp = String.fromCharCode(str);
        }
        return tmp;
    }
    // 바코드 내용 검증
    function getDataCheckResult() {
        var result = true;
        _barcodeResultData = [];
        _barcodeDataList.forEach(function(rowData,rowIndex){
            var ex_00 = false;
            var ex_10 = false, ex_11 = false, ex_12 = false, ex_13 = false;
            var ex_20 = false, ex_21 = false, ex_22 = false, ex_23 = false;
            var ex_30 = false; ex_31 = false;
            var ex_40 = false;
            var ex_50 = false;
            // header 있는지 검사
            if (rowData.length >= 7) {
                if (rowData[0] == 91 && rowData[1] == 41 && rowData[2] == 62 && rowData[3] == 30 && rowData[4] == 48 && rowData[5] == 54 && rowData[6] == 29) {
                    ex_00 = true;
                    setAddDetail("00", true, rowData.slice(0,6), rowIndex);
                } else if (rowData[0] == 91) {
                    var cutIndex = -1;
                    rowData.some(function(v,i){
                        if (v == 29){
                            cutIndex = i;
                            return true;
                        }
                    });

                    if (cutIndex > 0) {
                        ex_00 = true;
                        setAddDetail("00", false, rowData.slice(0, cutIndex), rowIndex);
                    }
                }
            } else {
                result = false;
            }

            // trailer 검사
            if (rowData[rowData.length-1] == 35 || rowData[rowData.length-1] == 4) {
                ex_50 = true;
                if (rowData[rowData.length-4] == 29 && rowData[rowData.length-3] == 30 && rowData[rowData.length-2] == 4 && rowData[rowData.length-1] == 35) {
                    setAddDetail("50", true, rowData.slice(rowData.length-3, rowData.length-1), rowIndex);
                } else if (rowData[rowData.length-3] == 29 && rowData[rowData.length-2] == 30 && rowData[rowData.length-1] == 4) {
                    setAddDetail("50", true, rowData.slice(rowData.length-2), rowIndex);
                } else {
                    result = false;
                    var cutIndex = -1;
                    for(var x = rowData.length; x > 0; x--){
                        if (rowData[x] == 29){
                            cutIndex = x+1;
                            break;
                        }
                    }
                    setAddDetail("50", false, rowData.slice(cutIndex), rowIndex);
                }
            }
            // 구분자 기준으로 나뉜 데이터들 개별 검증
            getCheckArrayData(rowData).forEach(function(partData, partIndex){
                if (partData[0] == 86) { // V    ==> 업체코드
                    ex_10 = true;
                    if (partData.length == 5) {
                        setAddDetail("10", true, partData.slice(1), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("10", false, partData.slice(1), rowIndex);
                    }
                } else if (partData[0] == 80) { // P    ==> 부품번호
                    ex_11 = true;
                    if (partData.length > 10 && partData.length < 17) {
                        if (!chkHaveCode(partData, 45)) {
                            setAddDetail("11", true, partData.slice(1), rowIndex);
                        } else {
                            setAddDetail("11", false, partData.slice(1), rowIndex);
                        }
                    } else {
                        result = false;
                        setAddDetail("10", false, partData.slice(1), rowIndex);
                    }
                } else if (partData[0] == 83) { // S    ==> 서열코드
                    ex_12 = true;
                    if (partData.length > 0 && partData.length < 10) {
                        setAddDetail("12", true, partData.slice(1), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("12", false, partData.slice(1), rowIndex);
                    }
                } else if (partData[0] == 69) { // E    ==> EO 번호
                    ex_13 = true;
                    if (partData.length > 8 && partData.length < 11) {
                        setAddDetail("13", true, partData.slice(1), rowIndex);
                    } else if (partData.length == 1) {
                        setAddDetail("13", true, partData.slice(1), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("13", false, partData.slice(1), rowIndex);
                    }
                } else if (partData[0] == 84) { // T    ==> 추적코드
                    // 생산일자
                    if (partData.length > 6) {
                        ex_20 = true;
                        if (chkValidDate(partData.slice(1, 7))) {
                            setAddDetail("20", true, partData.slice(1, 7), rowIndex);
                        } else {
                            result = false;
                            setAddDetail("20", false, partData.slice(1, 7), rowIndex);
                        }
                    }
                    // 부품4M
                    if (partData.length > 7) {
                        ex_21 = true;
                        if (partData.length > 10) {
                            setAddDetail("21", true, partData.slice(7, 11), rowIndex);
                        } else {
                            result = false;
                            setAddDetail("21", false, partData.slice(7), rowIndex);
                        }
                    }
                    // 시리얼 로트 구분
                    if (partData.length > 11) {
                        ex_22 = true;
                        if (partData[11] == 64 || partData[11] == 65) {
                            setAddDetail("22", true, partData[11], rowIndex);
                        } else {
                            result = false;
                            setAddDetail("22", false, partData[11], rowIndex);
                        }
                    }
                    // 시리얼 또는 로트 번호
                    if (partData.length > 12) {
                        ex_23 = true;
                        if (partData.length > 17 && partData.length < 43) {
                            setAddDetail("23", true, partData.slice(12), rowIndex);
                        } else {
                            setAddDetail("23", false, partData.slice(12), rowIndex);
                        }
                    }
                } else if (partData[0] == 68) { // D    ==> T:D : 생산일자 (6)
                    ex_20 = true;
                    if (chkValidDate(partData.slice(1,7))){
                        setAddDetail("20", true, partData.slice(1,7), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("20", false, partData.slice(1,7), rowIndex);
                    }
                } else if (partData[0] == 71) { // G    ==> T:G : 4M정보 (4)
                    ex_21 = true;
                    if (partData.length > 4) {
                        setAddDetail("21", true, partData.slice(1, 5), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("21", false, partData.slice(1), rowIndex);
                    }
                } else if (partData[0] == 66) { // B    ==> T:B : 로트생산 (1)
                    ex_22 = true;
                    if (partData[1] == 64 || partData[1] == 65) {
                        setAddDetail("22", true, partData[1], rowIndex);
                    } else {
                        result = false;
                        setAddDetail("22", false, partData[1], rowIndex);
                    }
                } else if (partData[0] == 72) { // H    ==> T:H : 부품시리얼 (7~30)
                    ex_23 = true;
                    if (partData.length > 7 && partData.length < 32) {
                        setAddDetail("23", true, partData.slice(1), rowIndex);
                    } else {
                        setAddDetail("23", false, partData.slice(1), rowIndex);
                    }
                } else if (partData[0] > 48 && partData[0] < 58) {  // 1 ~ 9 ==> 특이정보
                    ex_30 = true;
                    if (partData.length > 1 && partData.length < 42) {
                        setAddDetail("30", true, partData.slice(2), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("30", false, partData.slice(2), rowIndex);
                    }
                } else if (partData[0] == 77) { // M    ==> 초도품 구분
                    ex_31 = true;
                    if (partData.length == 1) {
                        setAddDetail("31", true, partData[1], rowIndex);
                    } else if (partData.length == 2) {
                        if (partData[1] == 89 || partData[1] == 78) {
                            setAddDetail("31", true, partData[1], rowIndex);
                        } else {
                            result = false;
                            setAddDetail("31", false, partData[1], rowIndex);
                        }
                    } else {
                        result = false;
                        setAddDetail("31", false, partData[1], rowIndex);
                    }
                } else if (partData[0] == 67) { // C    ==> 업체영역
                    ex_40 = true;
                    if (partData.length > 0 && partData.length < 52) {
                        setAddDetail("40", true, partData.slice(1), rowIndex);
                    } else {
                        result = false;
                        setAddDetail("40", false, partData.slice(1), rowIndex);
                    }
                }
            });

            // 필수 항목 체크
            if (!ex_00) {
                result = false;
                setAddDetail("00", false, getFirstBlockData(rowData), rowIndex);
            }
            if (!ex_10) {
                result = false;
                setAddDetail("10", false, null, rowIndex);
            }
            if (!ex_11) {
                result = false;
                setAddDetail("11", false, null, rowIndex);
            }
            if (!ex_12) {
                setAddDetail("12", true, null, rowIndex);
            }
            if (!ex_20) {
                result = false;
                setAddDetail("20", false, null, rowIndex);
            }
            if (!ex_21) {
                result = false;
                setAddDetail("21", false, null, rowIndex);
            }
            if (!ex_22) {
                result = false;
                setAddDetail("22", false, null, rowIndex);
            }
            if (!ex_23) {
                result = false;
                setAddDetail("23", false, null, rowIndex);
            }
            if (!ex_50) {
                result = false;
                setAddDetail("50", false, getLastBlockData(rowData), rowIndex);
            }
        });
        return result;
    }
    // 결과 저장 (선택된 인덱스의 결과만 _barcodeResultData에 push)
    function setAddDetail(type, okng, dispData, rowIndex) {
        if (_selectedIndex == rowIndex) {
            var strOKNG = "";
            if (type != "00" && type != "50" && type != "40"){
                if (chkBadASCIICode(dispData))
                    okng = false;
            }

            if (okng == true) {
                strOKNG = "<span class='eot'>OK</span>";
            } else {
                strOKNG = "<span class='gs'>NG</span>";
            }
            _barcodeResultData.push([type, strOKNG, dispData != null ? getCodeFromArrayData(dispData) : null]);
        }
    }
    // split by GS(29)
    function getCheckArrayData(arrData) {
        var rtnData = [];
        var rowData = [];
        arrData.forEach(function(v,i){
            if (v == 29) {
                rtnData.push(rowData.slice(0));
                rowData = [];
            } else {
                if (v != 32)
                    rowData.push(v);
            }
        });
        return rtnData;
    }
    function chkHaveCode(arrData, chkCode) {
        return arrData.some(function(v,i) {
            if (v == chkCode) return true;
        });
    }
    function chkValidDate(arrData) {
        var strDate = "";
        arrData.forEach(function(v){ strDate += String.fromCharCode(v); });
        var df = /[0-9]{2}[0-1]{1}[0-9]{1}[0-9]{2}/;
        var m_last_day = [31,28,31,30,31,30,31,31,30,31,30,31];
        if (!strDate.match(df)) return false;
        var year = Number("20"+strDate.substr(0,2));
        var month = Number(strDate.substr(2,2));
        var day = Number(strDate.substr(4,2));
        if (month > 12) return false;
        if (day == 0) return false;
        if ((year % 4 == 0) && ((year % 100 != 0) || (year % 400 == 0))) {
            if (month == 2) {
                if (day <= m_last_day[month-1] + 1) return true;
            } else {
                if (day <= m_last_day[month-1]) return true;
            }
        } else {
            if (day <= m_last_day[month-1]) return true;
        }
        return false;
    }
    function lpad(n, width) { n = n + ''; return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n; }
    function getFirstBlockData(arrData){
        var cutIndex = -1;
        arrData.some(function(v,i){ if (v == 29){ cutIndex = i; return true; } });
        return arrData.slice(0, cutIndex);
    }
    function getLastBlockData(arrData){
        var cutIndex = -1;
        for(var x = arrData.length; x > 0; x--){
            if (arrData[x] == 29){ cutIndex = x+1; break; }
        }
        return arrData.slice(cutIndex);
    }
    function chkBadASCIICode(arrData){
        if (arrData == null) return false;
        if (arrData.length == 0) return false;
        if (arrData.length == 1){
            if (arrData < 47) return true;
            if (arrData > 57 && arrData < 65) return true;
            if (arrData > 90 && arrData < 97) return true;
            if (arrData > 122) return true;
        } else {
            for(var i = 0; i < arrData.length; i++){
                var v = arrData[i];
                if (v < 47) return true;
                if (v > 57 && v < 65) return true;
                if (v > 90 && v < 97) return true;
                if (v > 122) return true;
            }
        }
    }
}
