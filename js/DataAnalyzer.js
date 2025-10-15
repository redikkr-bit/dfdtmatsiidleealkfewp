/******************************************
 *   DataAnalyzer.js (멀티 블록 대응)
 ******************************************/

function DataAnalyzer() {
    var _barcodeData = [];
    var _barcodeDataList = [];
    var _barcodeResultData = [];
    var _barcodeDataStr = "";
    var _barcodeCount = 0;
    var _selectedIndex = -1; // ✅ 모든 블록 표시 모드

    this.setBarcodeData = function (strData) {
        _barcodeData = [];
        _barcodeDataList = [];
        _barcodeResultData = [];
        _selectedIndex = -1;
        _barcodeCount = 0;
        _barcodeDataStr = strData;
        setArrayFromString(strData);
        setSharpDivide();
    };

    this.getFullViewData = function () {
        return getCodeFromArray();
    };

    this.getResultData = function () {
        getDataCheckResult();
        return _barcodeResultData;
    };

    /* ---------------- 내부 처리 ---------------- */

    function setArrayFromString(str) {
        _barcodeData = [];
        for (let i = 0; i < str.length; i++) {
            _barcodeData.push(str.charCodeAt(i));
        }
    }

    function setSharpDivide() {
        var rowData = [];
        _barcodeData.forEach(function (v) {
            rowData.push(v);
            if (v === 35) { // '#'
                _barcodeDataList.push(rowData);
                rowData = [];
                _barcodeCount++;
            }
        });
        if (rowData.length > 0) {
            _barcodeDataList.push(rowData);
            _barcodeCount++;
        }
    }

    function getCodeFromArray() {
        var rtn = "";
        _barcodeDataList.forEach((block, idx) => {
            block.forEach(v => rtn += getCodeToChar(v));
            rtn += "<hr>"; // 블록 구분선
        });
        return rtn;
    }

    function getCodeToChar(str) {
        if (str === 29) return "<span class='gs'><sup>G</sup><sub>S</sub></span>";
        if (str === 30) return "<span class='rs'><sup>R</sup><sub>S</sub></span>";
        if (str === 4)  return "<span class='eot'><sup>E</sup>O<sub>T</sub></span>";
        if (str === 35) return "#<br>";
        if ((str >= 0 && str <= 32) || str === 127)
            return "&lt;0x" + str.toString(16).toUpperCase().padStart(2,"0") + "&gt;";
        return String.fromCharCode(str);
    }

    function getDataCheckResult() {
        _barcodeResultData = [];
        _barcodeDataList.forEach(function (block, blockIndex) {
            analyzeBlock(block, blockIndex);
        });
    }

    function analyzeBlock(rowData, rowIndex) {
        var sections = getSplitSections(rowData);
        var ex_00=false, ex_10=false, ex_11=false, ex_12=false, ex_13=false, ex_20=false, ex_40=false, ex_50=false;

        // Header
        if (rowData.length >= 7 &&
            rowData[0]===91 && rowData[1]===41 && rowData[2]===62 &&
            rowData[3]===30 && rowData[4]===48 && rowData[5]===54 && rowData[6]===29) {
            ex_00 = true;
            setAddDetail("00", true, rowData.slice(0,7), rowIndex);
        }

        // Trailer
        if (rowData[rowData.length-1]===35 || rowData[rowData.length-1]===4) {
            ex_50 = true;
            setAddDetail("50", true, rowData.slice(-4), rowIndex);
        }

        // 내부 구분자 기준 split
        sections.forEach(function (part) {
            const code = part[0];
            if (code===86){ ex_10=true; setAddDetail("10", true, part.slice(1), rowIndex);}
            else if (code===80){ ex_11=true; setAddDetail("11", true, part.slice(1), rowIndex);}
            else if (code===83){ ex_12=true; setAddDetail("12", true, part.slice(1), rowIndex);}
            else if (code===69){ ex_13=true; setAddDetail("13", true, part.slice(1), rowIndex);}
            else if (code===84){ ex_20=true; setAddDetail("20", true, part.slice(1,7), rowIndex);}
            else if (code===67){ ex_40=true; setAddDetail("40", true, part.slice(1), rowIndex);}
        });

        // 필수값 누락 시 표시
        if (!ex_00) setAddDetail("00", false, null, rowIndex);
        if (!ex_10) setAddDetail("10", false, null, rowIndex);
        if (!ex_11) setAddDetail("11", false, null, rowIndex);
        if (!ex_20) setAddDetail("20", false, null, rowIndex);
        if (!ex_50) setAddDetail("50", false, null, rowIndex);
    }

    function getSplitSections(arr) {
        var result=[], temp=[];
        arr.forEach(v=>{
            if (v===29){ result.push(temp); temp=[]; }
            else temp.push(v);
        });
        if (temp.length>0) result.push(temp);
        return result;
    }

    function setAddDetail(type, okng, data, idx) {
        if (_selectedIndex===-1 || _selectedIndex===idx){
            _barcodeResultData.push([type, okng ? "<span class='eot'>OK</span>" : "<span class='gs'>NG</span>", 
                                     data ? convertToString(data) : null]);
        }
    }

    function convertToString(arr){
        return arr.map(c=>String.fromCharCode(c)).join("");
    }
}
