// Pure text tokenization: splits raw text into paragraphs, words, and
// sentence-start indices. No DOM access, so this module runs the same in
// the standalone page, a service worker, or a content-script world.

export function splitWords(text) {
  return text.split(/\s+/).filter(function (w) { return w.length > 0; });
}

export function isSentenceEnd(word) {
  return /[.!?]["'’”)\]]*$/.test(word);
}

export function tokenizeText(raw) {
  var normalized = raw.replace(/\r\n?/g, "\n");
  var rawParagraphs = normalized.split(/\n\s*\n+/);
  var paragraphs = [];
  rawParagraphs.forEach(function (p) {
    var t = p.trim();
    if (t.length) paragraphs.push(t);
  });

  var words = [];
  var paragraphEndIndices = new Set();
  paragraphs.forEach(function (paraText) {
    var ws = splitWords(paraText);
    ws.forEach(function (w, i) {
      words.push(w);
      if (i === ws.length - 1) paragraphEndIndices.add(words.length - 1);
    });
  });

  var sentenceStarts = [0];
  for (var i = 0; i < words.length; i++) {
    if (isSentenceEnd(words[i]) && i + 1 < words.length) sentenceStarts.push(i + 1);
  }

  return {
    words: words,
    paragraphs: paragraphs,
    paragraphEndIndices: paragraphEndIndices,
    sentenceStarts: sentenceStarts
  };
}
