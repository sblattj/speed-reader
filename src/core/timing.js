// Dwell-time math: how long a chunk should stay on screen at a given wpm,
// plus the small duration formatter used by the end-of-session card. Pure
// logic, no DOM.

function isHeavyPunctEnd(word) {
  return /[.!?;:]["'’”)\]]*$/.test(word);
}

function hasComma(word) {
  return word.indexOf(",") !== -1;
}

function isLongWord(word) {
  return word.replace(/[^A-Za-z]/g, "").length >= 9;
}

export function computeDwellMs(doc, chunkIndices, wpm) {
  var msPerWord = 60000 / wpm;
  var mult = 1;
  var lastWord = doc.words[chunkIndices[chunkIndices.length - 1]];
  if (isHeavyPunctEnd(lastWord)) mult *= 1.5;

  var anyComma = false;
  var anyLong = false;
  var anyParaEnd = false;
  for (var k = 0; k < chunkIndices.length; k++) {
    var w = doc.words[chunkIndices[k]];
    if (hasComma(w)) anyComma = true;
    if (isLongWord(w)) anyLong = true;
    if (doc.paragraphEndIndices.has(chunkIndices[k])) anyParaEnd = true;
  }
  if (anyComma) mult *= 1.25;
  if (anyLong) mult *= 1.3;
  if (anyParaEnd) mult *= 2;
  mult = Math.min(mult, 3);

  return msPerWord * chunkIndices.length * mult;
}

export function formatDuration(ms) {
  var totalSec = Math.round(ms / 1000);
  var m = Math.floor(totalSec / 60);
  var s = totalSec % 60;
  return String(m) + ":" + String(s).padStart(2, "0");
}
