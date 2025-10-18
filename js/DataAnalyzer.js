/******************************************
 * 데이터 분석 및 검증 모듈 - 강화된 블록 분리
 ******************************************/
function DataAnalyzer() {
    var _barcodeDataList = [];
    var _barcodeResultData = [];
    var _barcodeCount = 0;
    var _selectedIndex = 0;

    // 바코드 데이터 설정
    this.setBarcodeData = function (strData) {
        console.log("=== 바코드 데이터 분석 시작 ===");
        console.log("원본 바코드 데이터:", strData);
        console.log("데이터 길이:", strData.length);
        
        _barcodeDataList = [];
        _barcodeResultData = [];
        _barcodeCount = 0;
        _selectedIndex = 0;

        // 데이터 정제
        var cleanedData = cleanBarcodeData(strData);
        console.log("정제된 데이터:", cleanedData);
        
        // 블록 분리 시도 (여러 방법)
        var blocks = extractBlocks(cleanedData);
        
        console.log("분리된 블록 개수:", blocks.length);
        
        if (blocks.length === 0) {
            console.warn("블록을 분리할 수 없음, 단일 블록으로 처리");
            blocks = [cleanedData];
        }
        
        blocks.forEach((block, index) => {
            if (block.trim().length > 10) { // 의미 있는 최소 길이
                _barcodeDataList.push(block);
                _barcodeCount++;
                console.log(`블록 ${index} (${block.length}자):`, block.substring(0, 50) + "...");
            }
        });
        
        // 블록이 1개밖에 없지만 데이터가 길면 수동 분리 시도
        if (_barcodeCount === 1 && cleanedData.length > 100) {
            console.log("데이터가 길어 강제 분리 시도");
            var forcedBlocks = forceBlockSeparation(cleanedData);
            if (forcedBlocks.length > 1) {
                console.log("강제 블록 분리 성공:", forcedBlocks.length);
                _barcodeDataList = forcedBlocks;
                _barcodeCount = forcedBlocks.length;
            }
        }

        console.log("최종 블록 개수:", _barcodeCount);
        
        // 각 블록 분석
        if (_barcodeCount > 0) {
            analyzeAllBlocks();
        }
        
        console.log("=== 바코드 데이터 분석 완료 ===");
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

    // 데이터 정제 함수
    function cleanBarcodeData(data) {
        return data
            .replace(/\r\n/g, '') // 줄바꿈 제거
            .replace(/\n/g, '')   // 줄바꿈 제거
            .replace(/\s+/g, '') // 공백 제거
            .trim();
    }

    // 블록 추출 함수 (다양한 방법 시도)
    function extractBlocks(data) {
        var blocks = [];
        
        // 방법 1: #으로 분리 (기본)
        var hashBlocks = data.split('#').filter(block => block.trim().length > 0);
        if (hashBlocks.length > 1) {
            console.log("#으로 블록 분리 성공:", hashBlocks.length);
            // 각 블록에 # 다시 추가 (마지막 블록 제외)
            blocks = hashBlocks.map((block, index) => 
                index < hashBlocks.length - 1 ? block + '#' : block
            );
            return blocks;
        }
        
        // 방법 2: RS+EOT 패턴으로 분리
        var rsEotPattern = /\x1E\x04/g;
        if (rsEotPattern.test(data)) {
            var rsEotBlocks = data.split(rsEotPattern).filter(block => block.trim().length > 0);
            if (rsEotBlocks.length > 1) {
                console.log("RS+EOT 패턴으로 블록 분리 성공:", rsEotBlocks.length);
                blocks = rsEotBlocks.map((block, index) => 
                    index < rsEotBlocks.length - 1 ? block + '\x1E\x04' : block
                );
                return blocks;
            }
        }
        
        // 방법 3: Header 패턴으로 분리
        var headerPattern = /\[\)>\x1E06\x1D/g;
        var headerMatches = data.match(headerPattern);
        if (headerMatches && headerMatches.length > 1) {
            console.log("Header 패턴으로 블록 분리 시도:", headerMatches.length);
            var headerBlocks = data.split(headerPattern);
            if (headerBlocks.length > 1) {
                // 첫 번째 요소는 빈 문자열일 수 있음
                blocks = [];
                for (var i = 1; i < headerBlocks.length; i++) {
                    var block = '[)>06' + headerBlocks[i];
                    if (block.length > 20) {
                        blocks.push(block);
                    }
                }
                if (blocks.length > 1) {
                    console.log("Header 패턴으로 블록 분리 성공:", blocks.length);
                    return blocks;
                }
            }
        }
        
        return blocks;
    }

    // 강제 블록 분리 함수
    function forceBlockSeparation(data) {
        var blocks = [];
        var headerPattern = '[)>06';
        
        var positions = [];
        var pos = data.indexOf(headerPattern);
        
        // 모든 Header 위치 찾기
        while (pos !== -1) {
            positions.push(pos);
            pos = data.indexOf(headerPattern, pos + 1);
        }
        
        console.log("찾은 Header 위치:", positions);
        
        if (positions.length > 1) {
            for (var i = 0; i < positions.length; i++) {
                var start = positions[i];
                var end = (i < positions.length - 1) ? positions[i + 1] : data.length;
                var block = data.substring(start, end);
                if (block.length > 50) {
                    blocks.push(block);
                }
            }
        }
        
        return blocks;
    }

    // 모든 블록 분석
    function analyzeAllBlocks() {
        _barcodeResultData = [];
        
        _barcodeDataList.forEach((blockData, blockIndex) => {
            console.log(`\n--- 블록 ${blockIndex} 분석 시작 ---`);
            console.log("블록 데이터:", blockData);
            
            var blockResult = [];
            
            // 블록 데이터를 GS()로 분리
            var parts = splitByGS(blockData);
            console.log(`분할된 파트 개수: ${parts.length}`, parts);
            
            // Header 분석 [)>06
            var headerValid = false;
            if (parts.length > 0 && parts[0].includes('[)>06')) {
                headerValid = true;
                blockResult.push(["00", "OK", "[)>06"]);
                console.log("Header: OK");
            } else {
                blockResult.push(["00", "NG", ""]);
                console.log("Header: NG");
            }
            
            // 각 파트 분석 (첫 번째 파트는 Header이므로 1부터 시작)
            for (let i = 1; i < parts.length; i++) {
                var part = parts[i];
                if (part.length === 0) continue;
                
                var code = part.charAt(0);
                var data = part.substring(1);
                
                console.log(`파트 ${i} 분석: 코드=${code}, 데이터=${data}`);
                
                switch(code) {
                    case 'V': // 업체코드
                        var valid = data.length === 4; // V 다음 4자리 (KM54, SC89 등)
                        blockResult.push(["10", valid ? "OK" : "NG", data]);
                        console.log(`업체코드: ${valid ? "OK" : "NG"} (${data})`);
                        break;
                        
                    case 'P': // 부품번호
                        var valid = data.length >= 10 && data.length <= 15;
                        blockResult.push(["11", valid ? "OK" : "NG", data]);
                        console.log(`부품번호: ${valid ? "OK" : "NG"} (${data})`);
                        break;
                        
                    case 'S': // 서열코드
                        var valid = data.length > 0 && data.length < 10;
                        blockResult.push(["12", valid ? "OK" : "NG", data]);
                        console.log(`서열코드: ${valid ? "OK" : "NG"} (${data})`);
                        break;
                        
                    case 'E': // EO번호
                        var valid = data.length >= 8 && data.length <= 10;
                        blockResult.push(["13", valid ? "OK" : "NG", data]);
                        console.log(`EO번호: ${valid ? "OK" : "NG"} (${data})`);
                        break;
                        
                    case 'T': // 추적코드
                        if (data.length >= 6) {
                            var date = data.substring(0, 6);
                            var dateValid = /^\d{6}$/.test(date);
                            blockResult.push(["20", dateValid ? "OK" : "NG", date]);
                            console.log(`생산일자: ${dateValid ? "OK" : "NG"} (${date})`);
                            
                            // 부품4M (1문자)
                            if (data.length > 6) {
                                var part4M = data.charAt(6);
                                blockResult.push(["21", "OK", part4M]);
                                console.log(`부품4M: OK (${part4M})`);
                                
                                // A or @ (1문자)
                                if (data.length > 7) {
                                    var aOrAt = data.charAt(7);
                                    blockResult.push(["22", "OK", aOrAt]);
                                    console.log(`A or @: OK (${aOrAt})`);
                                    
                                    // 추적번호 (나머지)
                                    if (data.length > 8) {
                                        var trackNo = data.substring(8);
                                        blockResult.push(["23", "OK", trackNo]);
                                        console.log(`추적번호: OK (${trackNo})`);
                                    }
                                }
                            }
                        } else {
                            blockResult.push(["20", "NG", ""]);
                            console.log("추적코드: NG (길이 부족)");
                        }
                        break;
                        
                    case 'M': // 특이정보
                        blockResult.push(["30", "OK", data]);
                        console.log(`특이정보: OK (${data})`);
                        break;
                        
                    case 'N': // 초도품구분
                        blockResult.push(["31", "OK", data]);
                        console.log(`초도품구분: OK (${data})`);
                        break;
                        
                    case 'C': // 업체영역
                        var valid = data.length > 0 && data.length < 52;
                        blockResult.push(["40", valid ? "OK" : "NG", data]);
                        console.log(`업체영역: ${valid ? "OK" : "NG"} (${data})`);
                        break;
                }
            }
            
            // Trailer 분석
            var trailerValid = false;
            if (blockData.includes('#') || blockData.endsWith('#')) {
                trailerValid = true;
                blockResult.push(["50", "OK", "#"]);
                console.log("Trailer: OK");
            }
            if (!trailerValid) {
                blockResult.push(["50", "NG", ""]);
                console.log("Trailer: NG");
            }
            
            _barcodeResultData[blockIndex] = blockResult;
            console.log(`--- 블록 ${blockIndex} 분석 완료 (${blockResult.length}개 항목) ---`);
        });
    }

    // GS 문자()로 분리
    function splitByGS(data) {
        return data.split('\x1D').filter(part => part.length > 0);
    }

    // 표시용 포맷팅
    function formatForDisplay(data) {
        return data
            .replace(/\x1D/g, '<span class="gs">[GS]</span>')
            .replace(/\x1E/g, '<span class="rs">[RS]</span>')
            .replace(/\x04/g, '<span class="eot">[EOT]</span>')
            .replace(/#/g, '<span class="sharp">[#]</span>');
    }
}
