/******************************************
 * 데이터 분석 및 검증 모듈 - 완전 재작성
 ******************************************/
function DataAnalyzer() {
    var _barcodeDataList = [];
    var _barcodeResultData = [];
    var _barcodeCount = 0;
    var _selectedIndex = 0;

    // 바코드 데이터 설정
    this.setBarcodeData = function (strData) {
        console.log("원본 바코드 데이터:", strData);
        
        _barcodeDataList = [];
        _barcodeResultData = [];
        _barcodeCount = 0;
        _selectedIndex = 0;

        // #으로 블록 분리
        var blocks = strData.split('#').filter(block => block.trim().length > 0);
        console.log("분리된 블록들:", blocks);
        
        blocks.forEach((block, index) => {
            if (block.trim().length > 0) {
                _barcodeDataList.push(block.trim() + '#');
                _barcodeCount++;
            }
        });
        
        console.log("총 블록 개수:", _barcodeCount);
        console.log("블록 데이터:", _barcodeDataList);

        // 각 블록 분석
        analyzeAllBlocks();
    };

    // 선택된 index 번호 설정
    this.setSelectIndex = function (index) {
        if (index >= 0 && index < _barcodeCount) {
            _selectedIndex = index;
        }
    };

    // View용 전체 문자열 리턴 - 선택된 블록만 표시
    this.getFullViewData = function () {
        if (_barcodeDataList[_selectedIndex]) {
            return formatForDisplay(_barcodeDataList[_selectedIndex]);
        }
        return "";
    };

    // #으로 구분된 바코드 세트 개수 리턴
    this.getCount = function () {
        return _barcodeCount;
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
        return true; // 분석은 이미 완료됨
    };

    // 모든 블록 분석
    function analyzeAllBlocks() {
        _barcodeResultData = [];
        
        _barcodeDataList.forEach((blockData, blockIndex) => {
            console.log(`블록 ${blockIndex} 분석 시작:`, blockData);
            var blockResult = [];
            
            // 블록 데이터를 GS(29)로 분리
            var parts = splitByGS(blockData);
            console.log(`블록 ${blockIndex} 분할된 파트:`, parts);
            
            // Header 분석 [)>06
            var headerValid = false;
            if (parts.length > 0 && parts[0].startsWith('[)>06')) {
                headerValid = true;
                blockResult.push(["00", "OK", "[)>06"]);
            } else {
                blockResult.push(["00", "NG", ""]);
            }
            
            // 각 파트 분석
            for (let i = 1; i < parts.length - 1; i++) {
                var part = parts[i];
                if (part.length === 0) continue;
                
                var code = part.charAt(0);
                var data = part.substring(1);
                
                console.log(`파트 분석: 코드=${code}, 데이터=${data}`);
                
                switch(code) {
                    case 'V': // 업체코드
                        var valid = data.length === 5; // KM54, SC89 등
                        blockResult.push(["10", valid ? "OK" : "NG", data]);
                        break;
                        
                    case 'P': // 부품번호
                        var valid = data.length >= 10 && data.length <= 16;
                        blockResult.push(["11", valid ? "OK" : "NG", data]);
                        break;
                        
                    case 'S': // 서열코드
                        var valid = data.length > 0 && data.length < 10;
                        blockResult.push(["12", valid ? "OK" : "NG", data]);
                        break;
                        
                    case 'E': // EO번호
                        var valid = data.length >= 8 && data.length <= 10;
                        blockResult.push(["13", valid ? "OK" : "NG", data]);
                        break;
                        
                    case 'T': // 추적코드
                        // 생산일자 (6자리)
                        if (data.length >= 6) {
                            var date = data.substring(0, 6);
                            var dateValid = /^\d{6}$/.test(date);
                            blockResult.push(["20", dateValid ? "OK" : "NG", date]);
                            
                            // 부품4M (1문자)
                            if (data.length > 6) {
                                var part4M = data.charAt(6);
                                blockResult.push(["21", "OK", part4M]);
                                
                                // A or @ (1문자)
                                if (data.length > 7) {
                                    var aOrAt = data.charAt(7);
                                    blockResult.push(["22", "OK", aOrAt]);
                                    
                                    // 추적번호 (나머지)
                                    if (data.length > 8) {
                                        var trackNo = data.substring(8);
                                        blockResult.push(["23", "OK", trackNo]);
                                    }
                                }
                            }
                        } else {
                            blockResult.push(["20", "NG", ""]);
                        }
                        break;
                        
                    case 'M': // 특이정보
                        blockResult.push(["30", "OK", data]);
                        break;
                        
                    case 'N': // 초도품구분
                        blockResult.push(["31", "OK", data]);
                        break;
                        
                    case 'C': // 업체영역
                        var valid = data.length > 0 && data.length < 52;
                        blockResult.push(["40", valid ? "OK" : "NG", data]);
                        break;
                }
            }
            
            // Trailer 분석
            var trailerValid = false;
            if (parts.length > 0) {
                var lastPart = parts[parts.length - 1];
                if (lastPart.includes('') || blockData.endsWith('#')) {
                    trailerValid = true;
                    blockResult.push(["50", "OK", "#"]);
                }
            }
            if (!trailerValid) {
                blockResult.push(["50", "NG", ""]);
            }
            
            _barcodeResultData[blockIndex] = blockResult;
            console.log(`블록 ${blockIndex} 분석 완료:`, blockResult);
        });
    }

    // GS 문자()로 분리
    function splitByGS(data) {
        // GS 문자를 구분자로 사용
        return data.split('\x1D').filter(part => part.length > 0);
    }

    // 표시용 포맷팅
    function formatForDisplay(data) {
        // 특수 문자를 시각적으로 표시
        return data
            .replace(/\x1D/g, '<span class="gs">[GS]</span>')
            .replace(/\x1E/g, '<span class="rs">[RS]</span>')
            .replace(/\x04/g, '<span class="eot">[EOT]</span>')
            .replace(/#/g, '<span class="sharp">[#]</span>');
    }
}
