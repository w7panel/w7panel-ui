
window.formatDate = function(date) { 
    if(!date&&date!==0){return ''}
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),  
        day = '' + d.getDate(),  
        year = d.getFullYear();  

    month = month.length < 2? '0' + month : month;
    day = day.length < 2? '0' + day : day;

    var hours = String(d.getHours());  
    var minutes = String(d.getMinutes());  
    var seconds = String(d.getSeconds());  

    hours = hours.length < 2? '0' + hours : hours;
    minutes = minutes.length < 2? '0' + minutes : minutes;
    seconds = seconds.length < 2? '0' + seconds : seconds;
    return [year, month, day].join('-') + ' ' + [hours, minutes, seconds].join(':');  
}
window.evTheme = (function(){
    const ivory = "#abb2bf",
    stone = "#7d8799", 
    darkBackground = "#21252b",
    highlightBackground = "#2c313a",
    background = "#282c34",
    tooltipBackground = "#353a42",
    selection = "#3E4451",
    cursor = "#528bff";

    return {
        "&": {
            color: ivory,
            backgroundColor: background,
            height: "500px"
        },
        ".cm-content": { caretColor: cursor },
        ".cm-cursor, .cm-dropCursor": {borderLeftColor: cursor},
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {backgroundColor: selection},
    
        ".cm-panels": {backgroundColor: darkBackground, color: ivory},
        ".cm-panels.cm-panels-top": {borderBottom: "2px solid black"},
        ".cm-panels.cm-panels-bottom": {borderTop: "2px solid black"},
    
        ".cm-searchMatch": { backgroundColor: "#72a1ff59", outline: "1px solid #457dff" },
        ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#6199ff2f" },
    
        ".cm-activeLine": {backgroundColor: highlightBackground},
        ".cm-selectionMatch": {backgroundColor: "#aafe661a"},
    
        "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": { backgroundColor: "#bad0f847", outline: "1px solid #515a6b"},
    
        ".cm-gutters": { backgroundColor: background, color: stone, border: "none" },
    
        ".cm-activeLineGutter": { backgroundColor: highlightBackground },
    
        ".cm-foldPlaceholder": { backgroundColor: "transparent", border: "none", color: "#ddd" },
    
        ".cm-tooltip": { border: "none", backgroundColor: tooltipBackground },
        ".cm-tooltip .cm-tooltip-arrow:before": { borderTopColor: "transparent", borderBottomColor: "transparent" },
        ".cm-tooltip .cm-tooltip-arrow:after": { borderTopColor: tooltipBackground, borderBottomColor: tooltipBackground },
        ".cm-tooltip-autocomplete": {
            "& > ul > li[aria-selected]": {
                backgroundColor: highlightBackground,
                color: ivory
            }
        },
        ".cm-scroller": {overflow: "auto"},
        ".cm-content, .cm-gutter": {minHeight: "500px"},
    }
})()