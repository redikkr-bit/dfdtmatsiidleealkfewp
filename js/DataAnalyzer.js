function DataAnalyzer() {
    var _barcodeData = [];
    var _barcodeDataList = [];
    var _barcodeResultData = [];
    var _barcodeDataStr = "";
    var _barcodeCount = 0;
    var _selectedIndex = 0;

    this.setBarcodeData = function(strData) {
        console.log("=== 바코드 데이터 설정 ===");
        _barcodeData = [];
        _barcodeDataList = [];
        _barcodeResultData = [];
        _selectedIndex = 0;
        _barcodeCount = 0;
        _barcodeDataStr = strData;
        
        console.log("원본 데이터:", strData);
        console.log("데이터 길이:", strData.length);
        
        setArrayFromString(strData);
        setSharpDivide();
    }

    this.setSelectIndex = function(index) {
        _selectedIndex = index;
    }

    this.getFullViewData = function() {
        return getCodeFromArray();
    }

    this.getCount = function() {
        return _barcodeCount;
    }

    this.getCheckResult = function() {
        return getDataCheckResult();
    }

    this.getResultData = function() {
        return _barcodeResultData;
    }

    this.getSelectedIndex = function() {
        return _selectedIndex;
    }

    function setSharpDivide(){
        var rowData = [];
        console.log("블록 분리 시작, 데이터 길이:", _barcodeData.length);
        
        _barcodeData.forEach(function(v,i){
            rowData.push(v);
            if (v == 35) {  // # (DEC)
                _barcodeDataList.push(rowData);
                console.log("블록 발견:", rowData.length + " bytes");
                rowData = [];
                _barcodeCount += 1;
            }
        });
        
        if (rowData.length > 0) {
            _barcodeDataList.push(rowData);
            _barcodeCount += 1;
            console.log("마지막 블록:", rowData.length + " bytes");
        }
        
        console.log("총 블록 개수:", _barcodeCount);
    }

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

    function getCodeFromArrayData(arrData){
        var rtnData = "";
        if (typeof arrData === "number") {
            rtnData = getCodeToChar(arrData);
        } else {
            arrData.forEach(function(v,i){
                rtnData += getCodeToChar(v);
            });
        }
        return rtnData;
    }

    function setArrayFromString(str){
        _barcodeData = [];
        for (var i=0;i<str.length;i++){
            _barcodeData.push(str.charCodeAt(i));
        }
    }

    function getCodeToChar(str){
        var tmp;
        if (str == 29){
            tmp = "<span class='gs'>[GS]</span>";
        } else if (str == 30) {
            tmp = "<span class='rs'>[RS]</span>";
        } else if (str == 4){
            tmp = "<span class='eot'>[EOT]</span>";
        } else if (str == 35) {
            tmp = "#";
        } else if (str == 34) {
            tmp = "&#34;";
        } else if (str == 39) {
            tmp = "&#39;";
        } else if (str == 96) {
            tmp = "&#96;";
        } else {
            if (str >= 0 && str <=32 || str == 127)
                tmp = "&lt;0x" + lpad(str.toString(16).toUpperCase(),2) + "&gt;";
            else
                tmp = String.fromCharCode(str);
        }
        return tmp;
    }

    function getDataCheckResult() {
        var result = true;
        _barcodeResultData = [];
        
        _barcodeDataList.forEach(function(rowData,rowIndex){
            console.log(`블록 ${rowIndex} 검증 시작:`, rowData.length + " bytes");
            
            var ex_00 = false;
            var ex_10 = false, ex_11 = false, ex_12 = false, ex_13 = false;
            var ex_20 = false, ex_21 = false, ex_22 = false, ex_23 = false;
            var ex_30 = false, ex_31 = false;
            var ex_40 = false;
            var ex_50 = false;

            // Header 검사
            if (rowData.length >= 7) {
                if (rowData[0] == 91 && rowData[1] == 41 && rowData[2] == 62 && 
                    rowData[3] == 30 && rowData[4] == 48 && rowData[5] == 54 && rowData[6] == 29) {
                    ex_00 = true;
                    setAddDetail("00", true, rowData.slice(0,7), rowIndex);
                }
            }

            // Trailer 검사
            if (rowData[rowData.length-1] == 35 || rowData[rowData.length-1] == 4) {
                ex_50 = true;
                if (rowData[rowData.length-4] == 29 && rowData[rowData.length-3] == 30 && 
                    rowData[rowData.length-2] == 4 && rowData[rowData.length-1] == 35) {
                    setAddDetail("50", true, rowData.slice(rowData.length-4), rowIndex);
                } else {
                    setAddDetail("50", true, [rowData[rowData.length-1]], rowIndex);
                }
            }

            // 구분자 기준 분할 및 검증
            getCheckArrayData(rowData).forEach(function(partData, partIndex){
                if (partData[0] == 86) { // V - 업체코드
                    ex_10 = true;
                    setAddDetail("10", partData.length == 5, partData.slice(1), rowIndex);
                } else if (partData[0] == 80) { // P - 부품번호
                    ex_11 = true;
                    var isValid = partData.length > 10 && partData.length < 17 && !chkHaveCode(partData, 45);
                    setAddDetail("11", isValid, partData.slice(1), rowIndex);
                } else if (partData[0] == 83) { // S - 서열코드
                    ex_12 = true;
                    setAddDetail("12", partData.length > 0 && partData.length < 10, partData.slice(1), rowIndex);
                } else if (partData[0] == 69) { // E - EO번호
                    ex_13 = true;
                    setAddDetail("13", partData.length > 8 && partData.length < 11, partData.slice(1), rowIndex);
                } else if (partData[0] == 84) { // T - 추적코드
                    if (partData.length > 6) {
                        ex_20 = true;
                        var dateValid = chkValidDate(partData.slice(1, 7));
                        setAddDetail("20", dateValid, partData.slice(1, 7), rowIndex);
                        
                        // 부품4M
                        if (partData.length > 7) {
                            ex_21 = true;
                            setAddDetail("21", true, [partData[7]], rowIndex);
                        }
                        // A or @
                        if (partData.length > 8) {
                            ex_22 = true;
                            setAddDetail("22", true, [partData[8]], rowIndex);
                        }
                        // 추적번호
                        if (partData.length > 9) {
                            ex_23 = true;
                            setAddDetail("23", true, partData.slice(9), rowIndex);
                        }
                    }
                } else if (partData[0] == 77) { // M - 특이정보
                    ex_30 = true;
                    setAddDetail("30", true, partData.slice(1), rowIndex);
                } else if (partData[0] == 78) { // N - 초도품구분
                    ex_31 = true;
                    setAddDetail("31", true, partData.slice(1), rowIndex);
                } else if (partData[0] == 67) { // C - 업체영역
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

    function setAddDetail(type, okng, dispData, rowIndex) {
        if (_selectedIndex == rowIndex) {
            var strOKNG = okng ? "<span class='eot'>OK</span>" : "<span class='gs'>NG</span>";
            _barcodeResultData.push([type, strOKNG, dispData != null ? getCodeFromArrayData(dispData) : null]);
        }
    }

    function getCheckArrayData(arrData) {
        var rtnData = [];
        var rowData = [];
        arrData.forEach(function(v,i){
            if (v == 29) {
                if (rowData.length > 0) {
                    rtnData.push(rowData.slice(0));
                }
                rowData = [];
            } else {
                if (v != 32)
                    rowData.push(v);
            }
        });
        if (rowData.length > 0) {
            rtnData.push(rowData.slice(0));
        }
        return rtnData;
    }

    function chkHaveCode(arrData, chkCode) {
        return arrData.some(function(v,i) {
            return v == chkCode;
        });
    }

    function chkValidDate(arrData) {
        if (!arrData || arrData.length != 6) return false;
        
        var strDate = "";
        arrData.forEach(function(v){
            strDate += String.fromCharCode(v);
        });
        
        var df = /^[0-9]{6}$/;
        if (!df.test(strDate)) return false;
        
        var year = Number("20" + strDate.substr(0,2));
        var month = Number(strDate.substr(2,2));
        var day = Number(strDate.substr(4,2));
        
        if (month < 1 || month > 12 || day < 1 || day > 31) return false;
        
        return true;
    }

    function lpad(n, width) {
      n = n + '';
      return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
    }
}
