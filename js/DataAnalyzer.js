function DataAnalyzer() {
    var _barcodeDataList = [], _barcodeResultData = [], _barcodeCount = 0, _selectedIndex = 0;
    this.setBarcodeData = function (strData) {
        console.log("=== 바코드 데이터 분석 시작 ==="); console.log("원본 데이터:", strData); console.log("데이터 길이:", strData.length);
        _barcodeDataList = []; _barcodeResultData = []; _barcodeCount = 0; _selectedIndex = 0;
        var cleanedData = strData.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\s+/g, '').trim();
        console.log("정제된 데이터:", cleanedData);
        if (cleanedData.length < 10) { console.warn("❌ 데이터가 너무 짧음:", cleanedData.length); return; }
        var blocks = extractBlocks(cleanedData); console.log("분리된 블록 개수:", blocks.length);
        if (blocks.length === 0) { console.warn("블록을 분리할 수 없음, 단일 블록으로 처리"); blocks = [cleanedData]; }
        blocks.forEach((block, index) => { if (block.trim().length > 5) { _barcodeDataList.push(block); _barcodeCount++; console.log(`블록 ${index} (${block.length}자):`, block.substring(0, 50) + (block.length > 50 ? "..." : "")); } });
        if (_barcodeCount === 0 && cleanedData.length > 10) { console.log("📦 단일 블록으로 처리"); _barcodeDataList.push(cleanedData); _barcodeCount = 1; }
        console.log("최종 블록 개수:", _barcodeCount);
        if (_barcodeCount > 0) analyzeAllBlocks(); else console.error("❌ 분석할 블록이 없음");
        console.log("=== 바코드 데이터 분석 완료 ===");
    };
    this.setSelectIndex = function (index) { if (index >= 0 && index < _barcodeCount) { _selectedIndex = index; console.log("선택된 블록 인덱스:", _selectedIndex); } };
    this.getFullViewData = function () { if (_barcodeDataList[_selectedIndex]) return formatForDisplay(_barcodeDataList[_selectedIndex]); return ""; };
    this.getCount = function () { return _barcodeCount; };
    this.getSelectedResultData = function () { if (_barcodeResultData[_selectedIndex]) return _barcodeResultData[_selectedIndex]; return []; };
    this.getSelectedIndex = function () { return _selectedIndex; };
    this.getCheckResult = function () { return true; };
    function extractBlocks(data) {
        var blocks = [];
        var hashBlocks = data.split('#').filter(block => block.trim().length > 0);
        if (hashBlocks.length > 1) { console.log("#으로 블록 분리 성공:", hashBlocks.length); blocks = hashBlocks.map((block, index) => index < hashBlocks.length - 1 ? block + '#' : block); return blocks; }
        var rsEotPattern = /\x1E\x04/g;
        if (rsEotPattern.test(data)) { var rsEotBlocks = data.split(rsEotPattern).filter(block => block.trim().length > 0); if (rsEotBlocks.length > 1) { console.log("RS+EOT 패턴으로 블록 분리 성공:", rsEotBlocks.length); blocks = rsEotBlocks.map((block, index) => index < rsEotBlocks.length - 1 ? block + '\x1E\x04' : block); return blocks; } }
        var headerPattern = /\[\)>\x1E06\x1D/g; var headerMatches = data.match(headerPattern);
        if (headerMatches && headerMatches.length > 1) { console.log("Header 패턴으로 블록 분리 시도:", headerMatches.length); var headerBlocks = data.split(headerPattern); if (headerBlocks.length > 1) { blocks = []; for (var i = 1; i < headerBlocks.length; i++) { var block = '[)>06' + headerBlocks[i]; if (block.length > 20) blocks.push(block); } if (blocks.length > 1) { console.log("Header 패턴으로 블록 분리 성공:", blocks.length); return blocks; } } }
        return blocks;
    }
    function analyzeAllBlocks() {
        _barcodeResultData = [];
        _barcodeDataList.forEach((blockData, blockIndex) => {
            console.log(`\n--- 블록 ${blockIndex} 분석 시작 ---`); console.log("블록 데이터:", blockData);
            var blockResult = []; var parts = splitByGS(blockData); console.log(`분할된 파트 개수: ${parts.length}`, parts);
            var headerValid = false; if (parts.length > 0 && parts[0].includes('[)>06')) { headerValid = true; blockResult.push(["00", "OK", "[)>06"]); console.log("Header: OK"); } else { blockResult.push(["00", "NG", ""]); console.log("Header: NG"); }
            for (let i = 1; i < parts.length; i++) { var part = parts[i]; if (part.length === 0) continue; var code = part.charAt(0); var data = part.substring(1); console.log(`파트 ${i} 분석: 코드=${code}, 데이터=${data}`);
                switch(code) {
                    case 'V': var valid = data.length === 4; blockResult.push(["10", valid ? "OK" : "NG", data]); console.log(`업체코드: ${valid ? "OK" : "NG"} (${data})`); break;
                    case 'P': var valid = data.length >= 10 && data.length <= 15; blockResult.push(["11", valid ? "OK" : "NG", data]); console.log(`부품번호: ${valid ? "OK" : "NG"} (${data})`); break;
                    case 'S': var valid = data.length > 0 && data.length < 10; blockResult.push(["12", valid ? "OK" : "NG", data]); console.log(`서열코드: ${valid ? "OK" : "NG"} (${data})`); break;
                    case 'E': var valid = data.length >= 8 && data.length <= 10; blockResult.push(["13", valid ? "OK" : "NG", data]); console.log(`EO번호: ${valid ? "OK" : "NG"} (${data})`); break;
                    case 'T': if (data.length >= 6) { var date = data.substring(0, 6); var dateValid = /^\d{6}$/.test(date); blockResult.push(["20", dateValid ? "OK" : "NG", date]); console.log(`생산일자: ${dateValid ? "OK" : "NG"} (${date})`);
                        if (data.length > 6) { var part4M = data.charAt(6); blockResult.push(["21", "OK", part4M]); console.log(`부품4M: OK (${part4M})`);
                        if (data.length > 7) { var aOrAt = data.charAt(7); blockResult.push(["22", "OK", aOrAt]); console.log(`A or @: OK (${aOrAt})`);
                        if (data.length > 8) { var trackNo = data.substring(8); blockResult.push(["23", "OK", trackNo]); console.log(`추적번호: OK (${trackNo})`); } } } } else { blockResult.push(["20", "NG", ""]); console.log("추적코드: NG (길이 부족)"); } break;
                    case 'M': blockResult.push(["30", "OK", data]); console.log(`특이정보: OK (${data})`); break;
                    case 'N': blockResult.push(["31", "OK", data]); console.log(`초도품구분: OK (${data})`); break;
                    case 'C': var valid = data.length > 0 && data.length < 52; blockResult.push(["40", valid ? "OK" : "NG", data]); console.log(`업체영역: ${valid ? "OK" : "NG"} (${data})`); break;
                }
            }
            var trailerValid = false; if (blockData.includes('#') || blockData.endsWith('#')) { trailerValid = true; blockResult.push(["50", "OK", "#"]); console.log("Trailer: OK"); } if (!trailerValid) { blockResult.push(["50", "NG", ""]); console.log("Trailer: NG"); }
            _barcodeResultData[blockIndex] = blockResult; console.log(`--- 블록 ${blockIndex} 분석 완료 (${blockResult.length}개 항목) ---`);
        });
    }
    function splitByGS(data) { return data.split('\x1D').filter(part => part.length > 0); }
    function formatForDisplay(data) {
        return data.replace(/\x1D/g, '<span class="gs">[GS]</span>').replace(/\x1E/g, '<span class="rs">[RS]</span>').replace(/\x04/g, '<span class="eot">[EOT]</span>').replace(/#/g, '<span class="sharp">[#]</span>');
    }
}
