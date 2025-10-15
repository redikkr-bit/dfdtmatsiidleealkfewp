/******************************************
 * DataAnalyzer.js (멀티 블록 + 폰트 안전)
 ******************************************/

function DataAnalyzer() {
    var _barcodeData = [];
    var _barcodeDataList = [];
    var _barcodeResultData = [];
    var _barcodeDataStr = "";
    var _barcodeCount = 0;

    this.setBarcodeData = function (strData) {
        _barcodeData = [];
        _barcodeDataList = [];
        _barcodeResultData = [];
        _barcodeDataStr = strData;
        _barcodeCount = 0;
        setArrayFromString(strData);
        divideBySharp();
    };

    this.getFullViewData = function () {
        return getCodeFromArray();
    };

    this.getAllBlocksResult = function () {
        return analyzeAllBlocks();
    };

    /* ------------ 내부 함수 ------------ */

    function setArrayFromString(str) {
        _barcodeData = Array.from(str).map(c => c.charCodeAt(0));
    }

    function divideBySharp() {
        let temp = [];
        _barcodeData.forEach(v => {
            temp.push(v);
            if (v === 35) { // #
                _barcodeDataList.push(temp);
                temp = [];
                _barcodeCount++;
            }
        });
        if (temp.length > 0) {
            _barcodeDataList.push(temp);
            _barcodeCount++;
        }
    }

    function getCodeFromArray() {
        let html = "";
        _barcodeDataList.forEach(block => {
            html += block.map(v => getCodeToChar(v)).join("") + "<hr>";
        });
        return html;
    }

    function getCodeToChar(str) {
        const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
        const safe = ch => entities[ch] || ch;

        if (str === 29) return "<span class='gs'><sup>G</sup><sub>S</sub></span>";
        if (str === 30) return "<span class='rs'><sup>R</sup><sub>S</sub></span>";
        if (str === 4)  return "<span class='eot'><sup>E</sup>O<sub>T</sub></span>";
        if (str === 35) return "#<br>";
        if ((str >= 0 && str < 32) || str === 127)
            return "&lt;0x" + str.toString(16).padStart(2, "0").toUpperCase() + "&gt;";
        return safe(String.fromCharCode(str));
    }

    function analyzeAllBlocks() {
        let results = [];
        _barcodeDataList.forEach((block, idx) => {
            results.push(analyzeBlock(block));
        });
        return results;
    }

    function analyzeBlock(rowData) {
        let result = [];
        let sections = splitByGS(rowData);
        const add = (t, ok, d) => result.push([t, ok?"<span class='eot'>OK</span>":"<span class='gs'>NG</span>", d]);

        // Header
        if (rowData[0] === 91 && rowData[1] === 41) add("00", true, getPart(rowData,0,7));
        // Trailer
        if (rowData[rowData.length-1]===35 || rowData[rowData.length-1]===4) add("50", true, "끝");

        sections.forEach(part=>{
            const c=part[0];
            if(c===86)add("10",true,toStr(part.slice(1)));
            else if(c===80)add("11",true,toStr(part.slice(1)));
            else if(c===83)add("12",true,toStr(part.slice(1)));
            else if(c===69)add("13",true,toStr(part.slice(1)));
            else if(c===84)add("20",true,toStr(part.slice(1)));
            else if(c===67)add("40",true,toStr(part.slice(1)));
        });

        return result;
    }

    function splitByGS(arr) {
        let res=[],tmp=[];
        arr.forEach(v=>{
            if(v===29){res.push(tmp);tmp=[];}
            else tmp.push(v);
        });
        if(tmp.length>0)res.push(tmp);
        return res;
    }

    function toStr(arr){
        return arr.map(v=>String.fromCharCode(v)).join("");
    }

    function getPart(arr,s,e){
        return arr.slice(s,e).map(v=>String.fromCharCode(v)).join("");
    }
}
