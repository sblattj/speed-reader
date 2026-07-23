(() => {
  var __create = Object.create;
  var __getProtoOf = Object.getPrototypeOf;
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toESMCache_node;
  var __toESMCache_esm;
  var __toESM = (mod, isNodeMode, target) => {
    var canCache = mod != null && typeof mod === "object";
    if (canCache) {
      var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
      var cached = cache.get(mod);
      if (cached)
        return cached;
    }
    target = mod != null ? __create(__getProtoOf(mod)) : {};
    const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
    if (canCache)
      cache.set(mod, to);
    return to;
  };
  var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

  // extension/vendor/readability.js
  var require_readability = __commonJS((exports, module) => {
    function Readability(doc, options) {
      if (options && options.documentElement) {
        doc = options;
        options = arguments[2];
      } else if (!doc || !doc.documentElement) {
        throw new Error("First argument to Readability constructor should be a document object.");
      }
      options = options || {};
      this._doc = doc;
      this._docJSDOMParser = this._doc.firstChild.__JSDOMParser__;
      this._articleTitle = null;
      this._articleByline = null;
      this._articleDir = null;
      this._articleSiteName = null;
      this._attempts = [];
      this._metadata = {};
      this._debug = !!options.debug;
      this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
      this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
      this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
      this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(options.classesToPreserve || []);
      this._keepClasses = !!options.keepClasses;
      this._serializer = options.serializer || function(el) {
        return el.innerHTML;
      };
      this._disableJSONLD = !!options.disableJSONLD;
      this._allowedVideoRegex = options.allowedVideoRegex || this.REGEXPS.videos;
      this._linkDensityModifier = options.linkDensityModifier || 0;
      this._flags = this.FLAG_STRIP_UNLIKELYS | this.FLAG_WEIGHT_CLASSES | this.FLAG_CLEAN_CONDITIONALLY;
      if (this._debug) {
        let logNode = function(node) {
          if (node.nodeType == node.TEXT_NODE) {
            return `${node.nodeName} ("${node.textContent}")`;
          }
          let attrPairs = Array.from(node.attributes || [], function(attr) {
            return `${attr.name}="${attr.value}"`;
          }).join(" ");
          return `<${node.localName} ${attrPairs}>`;
        };
        this.log = function() {
          if (typeof console !== "undefined") {
            let args = Array.from(arguments, (arg) => {
              if (arg && arg.nodeType == this.ELEMENT_NODE) {
                return logNode(arg);
              }
              return arg;
            });
            args.unshift("Reader: (Readability)");
            console.log(...args);
          } else if (typeof dump !== "undefined") {
            var msg = Array.prototype.map.call(arguments, function(x) {
              return x && x.nodeName ? logNode(x) : x;
            }).join(" ");
            dump("Reader: (Readability) " + msg + `
`);
          }
        };
      } else {
        this.log = function() {};
      }
    }
    Readability.prototype = {
      FLAG_STRIP_UNLIKELYS: 1,
      FLAG_WEIGHT_CLASSES: 2,
      FLAG_CLEAN_CONDITIONALLY: 4,
      ELEMENT_NODE: 1,
      TEXT_NODE: 3,
      DEFAULT_MAX_ELEMS_TO_PARSE: 0,
      DEFAULT_N_TOP_CANDIDATES: 5,
      DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),
      DEFAULT_CHAR_THRESHOLD: 500,
      REGEXPS: {
        unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
        okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,
        positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
        negative: /-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|footer|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|widget/i,
        extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
        byline: /byline|author|dateline|writtenby|p-author/i,
        replaceFonts: /<(\/?)font[^>]*>/gi,
        normalize: /\s{2,}/g,
        videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
        shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
        nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
        prevLink: /(prev|earl|old|new|<|«)/i,
        tokenize: /\W+/g,
        whitespace: /^\s*$/,
        hasContent: /\S$/,
        hashUrl: /^#.+/,
        srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
        b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
        commas: /\u002C|\u060C|\uFE50|\uFE10|\uFE11|\u2E41|\u2E34|\u2E32|\uFF0C/g,
        jsonLdArticleTypes: /^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/,
        adWords: /^(ad(vertising|vertisement)?|pub(licité)?|werb(ung)?|广告|Реклама|Anuncio)$/iu,
        loadingWords: /^((loading|正在加载|Загрузка|chargement|cargando)(…|\.\.\.)?)$/iu
      },
      UNLIKELY_ROLES: [
        "menu",
        "menubar",
        "complementary",
        "navigation",
        "alert",
        "alertdialog",
        "dialog"
      ],
      DIV_TO_P_ELEMS: new Set([
        "BLOCKQUOTE",
        "DL",
        "DIV",
        "IMG",
        "OL",
        "P",
        "PRE",
        "TABLE",
        "UL"
      ]),
      ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P", "OL", "UL"],
      PRESENTATIONAL_ATTRIBUTES: [
        "align",
        "background",
        "bgcolor",
        "border",
        "cellpadding",
        "cellspacing",
        "frame",
        "hspace",
        "rules",
        "style",
        "valign",
        "vspace"
      ],
      DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ["TABLE", "TH", "TD", "HR", "PRE"],
      PHRASING_ELEMS: [
        "ABBR",
        "AUDIO",
        "B",
        "BDO",
        "BR",
        "BUTTON",
        "CITE",
        "CODE",
        "DATA",
        "DATALIST",
        "DFN",
        "EM",
        "EMBED",
        "I",
        "IMG",
        "INPUT",
        "KBD",
        "LABEL",
        "MARK",
        "MATH",
        "METER",
        "NOSCRIPT",
        "OBJECT",
        "OUTPUT",
        "PROGRESS",
        "Q",
        "RUBY",
        "SAMP",
        "SCRIPT",
        "SELECT",
        "SMALL",
        "SPAN",
        "STRONG",
        "SUB",
        "SUP",
        "TEXTAREA",
        "TIME",
        "VAR",
        "WBR"
      ],
      CLASSES_TO_PRESERVE: ["page"],
      HTML_ESCAPE_MAP: {
        lt: "<",
        gt: ">",
        amp: "&",
        quot: '"',
        apos: "'"
      },
      _postProcessContent(articleContent) {
        this._fixRelativeUris(articleContent);
        this._simplifyNestedElements(articleContent);
        if (!this._keepClasses) {
          this._cleanClasses(articleContent);
        }
      },
      _removeNodes(nodeList, filterFn) {
        if (this._docJSDOMParser && nodeList._isLiveNodeList) {
          throw new Error("Do not pass live node lists to _removeNodes");
        }
        for (var i = nodeList.length - 1;i >= 0; i--) {
          var node = nodeList[i];
          var parentNode = node.parentNode;
          if (parentNode) {
            if (!filterFn || filterFn.call(this, node, i, nodeList)) {
              parentNode.removeChild(node);
            }
          }
        }
      },
      _replaceNodeTags(nodeList, newTagName) {
        if (this._docJSDOMParser && nodeList._isLiveNodeList) {
          throw new Error("Do not pass live node lists to _replaceNodeTags");
        }
        for (const node of nodeList) {
          this._setNodeTag(node, newTagName);
        }
      },
      _forEachNode(nodeList, fn) {
        Array.prototype.forEach.call(nodeList, fn, this);
      },
      _findNode(nodeList, fn) {
        return Array.prototype.find.call(nodeList, fn, this);
      },
      _someNode(nodeList, fn) {
        return Array.prototype.some.call(nodeList, fn, this);
      },
      _everyNode(nodeList, fn) {
        return Array.prototype.every.call(nodeList, fn, this);
      },
      _getAllNodesWithTag(node, tagNames) {
        if (node.querySelectorAll) {
          return node.querySelectorAll(tagNames.join(","));
        }
        return [].concat.apply([], tagNames.map(function(tag) {
          var collection = node.getElementsByTagName(tag);
          return Array.isArray(collection) ? collection : Array.from(collection);
        }));
      },
      _cleanClasses(node) {
        var classesToPreserve = this._classesToPreserve;
        var className = (node.getAttribute("class") || "").split(/\s+/).filter((cls) => classesToPreserve.includes(cls)).join(" ");
        if (className) {
          node.setAttribute("class", className);
        } else {
          node.removeAttribute("class");
        }
        for (node = node.firstElementChild;node; node = node.nextElementSibling) {
          this._cleanClasses(node);
        }
      },
      _isUrl(str) {
        try {
          new URL(str);
          return true;
        } catch {
          return false;
        }
      },
      _fixRelativeUris(articleContent) {
        var baseURI = this._doc.baseURI;
        var documentURI = this._doc.documentURI;
        function toAbsoluteURI(uri) {
          if (baseURI == documentURI && uri.charAt(0) == "#") {
            return uri;
          }
          try {
            return new URL(uri, baseURI).href;
          } catch (ex) {}
          return uri;
        }
        var links = this._getAllNodesWithTag(articleContent, ["a"]);
        this._forEachNode(links, function(link) {
          var href = link.getAttribute("href");
          if (href) {
            if (href.indexOf("javascript:") === 0) {
              if (link.childNodes.length === 1 && link.childNodes[0].nodeType === this.TEXT_NODE) {
                var text = this._doc.createTextNode(link.textContent);
                link.parentNode.replaceChild(text, link);
              } else {
                var container = this._doc.createElement("span");
                while (link.firstChild) {
                  container.appendChild(link.firstChild);
                }
                link.parentNode.replaceChild(container, link);
              }
            } else {
              link.setAttribute("href", toAbsoluteURI(href));
            }
          }
        });
        var medias = this._getAllNodesWithTag(articleContent, [
          "img",
          "picture",
          "figure",
          "video",
          "audio",
          "source"
        ]);
        this._forEachNode(medias, function(media) {
          var src = media.getAttribute("src");
          var poster = media.getAttribute("poster");
          var srcset = media.getAttribute("srcset");
          if (src) {
            media.setAttribute("src", toAbsoluteURI(src));
          }
          if (poster) {
            media.setAttribute("poster", toAbsoluteURI(poster));
          }
          if (srcset) {
            var newSrcset = srcset.replace(this.REGEXPS.srcsetUrl, function(_, p1, p2, p3) {
              return toAbsoluteURI(p1) + (p2 || "") + p3;
            });
            media.setAttribute("srcset", newSrcset);
          }
        });
      },
      _simplifyNestedElements(articleContent) {
        var node = articleContent;
        while (node) {
          if (node.parentNode && ["DIV", "SECTION"].includes(node.tagName) && !(node.id && node.id.startsWith("readability"))) {
            if (this._isElementWithoutContent(node)) {
              node = this._removeAndGetNext(node);
              continue;
            } else if (this._hasSingleTagInsideElement(node, "DIV") || this._hasSingleTagInsideElement(node, "SECTION")) {
              var child = node.children[0];
              for (var i = 0;i < node.attributes.length; i++) {
                child.setAttributeNode(node.attributes[i].cloneNode());
              }
              node.parentNode.replaceChild(child, node);
              node = child;
              continue;
            }
          }
          node = this._getNextNode(node);
        }
      },
      _getArticleTitle() {
        var doc = this._doc;
        var curTitle = "";
        var origTitle = "";
        try {
          curTitle = origTitle = doc.title.trim();
          if (typeof curTitle !== "string") {
            curTitle = origTitle = this._getInnerText(doc.getElementsByTagName("title")[0]);
          }
        } catch (e) {}
        var titleHadHierarchicalSeparators = false;
        function wordCount(str) {
          return str.split(/\s+/).length;
        }
        if (/ [\|\-\\\/>»] /.test(curTitle)) {
          titleHadHierarchicalSeparators = / [\\\/>»] /.test(curTitle);
          let allSeparators = Array.from(origTitle.matchAll(/ [\|\-\\\/>»] /gi));
          curTitle = origTitle.substring(0, allSeparators.pop().index);
          if (wordCount(curTitle) < 3) {
            curTitle = origTitle.replace(/^[^\|\-\\\/>»]*[\|\-\\\/>»]/gi, "");
          }
        } else if (curTitle.includes(": ")) {
          var headings = this._getAllNodesWithTag(doc, ["h1", "h2"]);
          var trimmedTitle = curTitle.trim();
          var match = this._someNode(headings, function(heading) {
            return heading.textContent.trim() === trimmedTitle;
          });
          if (!match) {
            curTitle = origTitle.substring(origTitle.lastIndexOf(":") + 1);
            if (wordCount(curTitle) < 3) {
              curTitle = origTitle.substring(origTitle.indexOf(":") + 1);
            } else if (wordCount(origTitle.substr(0, origTitle.indexOf(":"))) > 5) {
              curTitle = origTitle;
            }
          }
        } else if (curTitle.length > 150 || curTitle.length < 15) {
          var hOnes = doc.getElementsByTagName("h1");
          if (hOnes.length === 1) {
            curTitle = this._getInnerText(hOnes[0]);
          }
        }
        curTitle = curTitle.trim().replace(this.REGEXPS.normalize, " ");
        var curTitleWordCount = wordCount(curTitle);
        if (curTitleWordCount <= 4 && (!titleHadHierarchicalSeparators || curTitleWordCount != wordCount(origTitle.replace(/[\|\-\\\/>»]+/g, "")) - 1)) {
          curTitle = origTitle;
        }
        return curTitle;
      },
      _prepDocument() {
        var doc = this._doc;
        this._removeNodes(this._getAllNodesWithTag(doc, ["style"]));
        if (doc.body) {
          this._replaceBrs(doc.body);
        }
        this._replaceNodeTags(this._getAllNodesWithTag(doc, ["font"]), "SPAN");
      },
      _nextNode(node) {
        var next = node;
        while (next && next.nodeType != this.ELEMENT_NODE && this.REGEXPS.whitespace.test(next.textContent)) {
          next = next.nextSibling;
        }
        return next;
      },
      _replaceBrs(elem) {
        this._forEachNode(this._getAllNodesWithTag(elem, ["br"]), function(br) {
          var next = br.nextSibling;
          var replaced = false;
          while ((next = this._nextNode(next)) && next.tagName == "BR") {
            replaced = true;
            var brSibling = next.nextSibling;
            next.remove();
            next = brSibling;
          }
          if (replaced) {
            var p = this._doc.createElement("p");
            br.parentNode.replaceChild(p, br);
            next = p.nextSibling;
            while (next) {
              if (next.tagName == "BR") {
                var nextElem = this._nextNode(next.nextSibling);
                if (nextElem && nextElem.tagName == "BR") {
                  break;
                }
              }
              if (!this._isPhrasingContent(next)) {
                break;
              }
              var sibling = next.nextSibling;
              p.appendChild(next);
              next = sibling;
            }
            while (p.lastChild && this._isWhitespace(p.lastChild)) {
              p.lastChild.remove();
            }
            if (p.parentNode.tagName === "P") {
              this._setNodeTag(p.parentNode, "DIV");
            }
          }
        });
      },
      _setNodeTag(node, tag) {
        this.log("_setNodeTag", node, tag);
        if (this._docJSDOMParser) {
          node.localName = tag.toLowerCase();
          node.tagName = tag.toUpperCase();
          return node;
        }
        var replacement = node.ownerDocument.createElement(tag);
        while (node.firstChild) {
          replacement.appendChild(node.firstChild);
        }
        node.parentNode.replaceChild(replacement, node);
        if (node.readability) {
          replacement.readability = node.readability;
        }
        for (var i = 0;i < node.attributes.length; i++) {
          replacement.setAttributeNode(node.attributes[i].cloneNode());
        }
        return replacement;
      },
      _prepArticle(articleContent) {
        this._cleanStyles(articleContent);
        this._markDataTables(articleContent);
        this._fixLazyImages(articleContent);
        this._cleanConditionally(articleContent, "form");
        this._cleanConditionally(articleContent, "fieldset");
        this._clean(articleContent, "object");
        this._clean(articleContent, "embed");
        this._clean(articleContent, "footer");
        this._clean(articleContent, "link");
        this._clean(articleContent, "aside");
        var shareElementThreshold = this.DEFAULT_CHAR_THRESHOLD;
        this._forEachNode(articleContent.children, function(topCandidate) {
          this._cleanMatchedNodes(topCandidate, function(node, matchString) {
            return this.REGEXPS.shareElements.test(matchString) && node.textContent.length < shareElementThreshold;
          });
        });
        this._clean(articleContent, "iframe");
        this._clean(articleContent, "input");
        this._clean(articleContent, "textarea");
        this._clean(articleContent, "select");
        this._clean(articleContent, "button");
        this._cleanHeaders(articleContent);
        this._cleanConditionally(articleContent, "table");
        this._cleanConditionally(articleContent, "ul");
        this._cleanConditionally(articleContent, "div");
        this._replaceNodeTags(this._getAllNodesWithTag(articleContent, ["h1"]), "h2");
        this._removeNodes(this._getAllNodesWithTag(articleContent, ["p"]), function(paragraph) {
          var contentElementCount = this._getAllNodesWithTag(paragraph, [
            "img",
            "embed",
            "object",
            "iframe"
          ]).length;
          return contentElementCount === 0 && !this._getInnerText(paragraph, false);
        });
        this._forEachNode(this._getAllNodesWithTag(articleContent, ["br"]), function(br) {
          var next = this._nextNode(br.nextSibling);
          if (next && next.tagName == "P") {
            br.remove();
          }
        });
        this._forEachNode(this._getAllNodesWithTag(articleContent, ["table"]), function(table) {
          var tbody = this._hasSingleTagInsideElement(table, "TBODY") ? table.firstElementChild : table;
          if (this._hasSingleTagInsideElement(tbody, "TR")) {
            var row = tbody.firstElementChild;
            if (this._hasSingleTagInsideElement(row, "TD")) {
              var cell = row.firstElementChild;
              cell = this._setNodeTag(cell, this._everyNode(cell.childNodes, this._isPhrasingContent) ? "P" : "DIV");
              table.parentNode.replaceChild(cell, table);
            }
          }
        });
      },
      _initializeNode(node) {
        node.readability = { contentScore: 0 };
        switch (node.tagName) {
          case "DIV":
            node.readability.contentScore += 5;
            break;
          case "PRE":
          case "TD":
          case "BLOCKQUOTE":
            node.readability.contentScore += 3;
            break;
          case "ADDRESS":
          case "OL":
          case "UL":
          case "DL":
          case "DD":
          case "DT":
          case "LI":
          case "FORM":
            node.readability.contentScore -= 3;
            break;
          case "H1":
          case "H2":
          case "H3":
          case "H4":
          case "H5":
          case "H6":
          case "TH":
            node.readability.contentScore -= 5;
            break;
        }
        node.readability.contentScore += this._getClassWeight(node);
      },
      _removeAndGetNext(node) {
        var nextNode = this._getNextNode(node, true);
        node.remove();
        return nextNode;
      },
      _getNextNode(node, ignoreSelfAndKids) {
        if (!ignoreSelfAndKids && node.firstElementChild) {
          return node.firstElementChild;
        }
        if (node.nextElementSibling) {
          return node.nextElementSibling;
        }
        do {
          node = node.parentNode;
        } while (node && !node.nextElementSibling);
        return node && node.nextElementSibling;
      },
      _textSimilarity(textA, textB) {
        var tokensA = textA.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
        var tokensB = textB.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
        if (!tokensA.length || !tokensB.length) {
          return 0;
        }
        var uniqTokensB = tokensB.filter((token) => !tokensA.includes(token));
        var distanceB = uniqTokensB.join(" ").length / tokensB.join(" ").length;
        return 1 - distanceB;
      },
      _isValidByline(node, matchString) {
        var rel = node.getAttribute("rel");
        var itemprop = node.getAttribute("itemprop");
        var bylineLength = node.textContent.trim().length;
        return (rel === "author" || itemprop && itemprop.includes("author") || this.REGEXPS.byline.test(matchString)) && !!bylineLength && bylineLength < 100;
      },
      _getNodeAncestors(node, maxDepth) {
        maxDepth = maxDepth || 0;
        var i = 0, ancestors = [];
        while (node.parentNode) {
          ancestors.push(node.parentNode);
          if (maxDepth && ++i === maxDepth) {
            break;
          }
          node = node.parentNode;
        }
        return ancestors;
      },
      _grabArticle(page) {
        this.log("**** grabArticle ****");
        var doc = this._doc;
        var isPaging = page !== null;
        page = page ? page : this._doc.body;
        if (!page) {
          this.log("No body found in document. Abort.");
          return null;
        }
        var pageCacheHtml = page.innerHTML;
        while (true) {
          this.log("Starting grabArticle loop");
          var stripUnlikelyCandidates = this._flagIsActive(this.FLAG_STRIP_UNLIKELYS);
          var elementsToScore = [];
          var node = this._doc.documentElement;
          let shouldRemoveTitleHeader = true;
          while (node) {
            if (node.tagName === "HTML") {
              this._articleLang = node.getAttribute("lang");
            }
            var matchString = node.className + " " + node.id;
            if (!this._isProbablyVisible(node)) {
              this.log("Removing hidden node - " + matchString);
              node = this._removeAndGetNext(node);
              continue;
            }
            if (node.getAttribute("aria-modal") == "true" && node.getAttribute("role") == "dialog") {
              node = this._removeAndGetNext(node);
              continue;
            }
            if (!this._articleByline && !this._metadata.byline && this._isValidByline(node, matchString)) {
              var endOfSearchMarkerNode = this._getNextNode(node, true);
              var next = this._getNextNode(node);
              var itemPropNameNode = null;
              while (next && next != endOfSearchMarkerNode) {
                var itemprop = next.getAttribute("itemprop");
                if (itemprop && itemprop.includes("name")) {
                  itemPropNameNode = next;
                  break;
                } else {
                  next = this._getNextNode(next);
                }
              }
              this._articleByline = (itemPropNameNode ?? node).textContent.trim();
              node = this._removeAndGetNext(node);
              continue;
            }
            if (shouldRemoveTitleHeader && this._headerDuplicatesTitle(node)) {
              this.log("Removing header: ", node.textContent.trim(), this._articleTitle.trim());
              shouldRemoveTitleHeader = false;
              node = this._removeAndGetNext(node);
              continue;
            }
            if (stripUnlikelyCandidates) {
              if (this.REGEXPS.unlikelyCandidates.test(matchString) && !this.REGEXPS.okMaybeItsACandidate.test(matchString) && !this._hasAncestorTag(node, "table") && !this._hasAncestorTag(node, "code") && node.tagName !== "BODY" && node.tagName !== "A") {
                this.log("Removing unlikely candidate - " + matchString);
                node = this._removeAndGetNext(node);
                continue;
              }
              if (this.UNLIKELY_ROLES.includes(node.getAttribute("role"))) {
                this.log("Removing content with role " + node.getAttribute("role") + " - " + matchString);
                node = this._removeAndGetNext(node);
                continue;
              }
            }
            if ((node.tagName === "DIV" || node.tagName === "SECTION" || node.tagName === "HEADER" || node.tagName === "H1" || node.tagName === "H2" || node.tagName === "H3" || node.tagName === "H4" || node.tagName === "H5" || node.tagName === "H6") && this._isElementWithoutContent(node)) {
              node = this._removeAndGetNext(node);
              continue;
            }
            if (this.DEFAULT_TAGS_TO_SCORE.includes(node.tagName)) {
              elementsToScore.push(node);
            }
            if (node.tagName === "DIV") {
              var p = null;
              var childNode = node.firstChild;
              while (childNode) {
                var nextSibling = childNode.nextSibling;
                if (this._isPhrasingContent(childNode)) {
                  if (p !== null) {
                    p.appendChild(childNode);
                  } else if (!this._isWhitespace(childNode)) {
                    p = doc.createElement("p");
                    node.replaceChild(p, childNode);
                    p.appendChild(childNode);
                  }
                } else if (p !== null) {
                  while (p.lastChild && this._isWhitespace(p.lastChild)) {
                    p.lastChild.remove();
                  }
                  p = null;
                }
                childNode = nextSibling;
              }
              if (this._hasSingleTagInsideElement(node, "P") && this._getLinkDensity(node) < 0.25) {
                var newNode = node.children[0];
                node.parentNode.replaceChild(newNode, node);
                node = newNode;
                elementsToScore.push(node);
              } else if (!this._hasChildBlockElement(node)) {
                node = this._setNodeTag(node, "P");
                elementsToScore.push(node);
              }
            }
            node = this._getNextNode(node);
          }
          var candidates = [];
          this._forEachNode(elementsToScore, function(elementToScore) {
            if (!elementToScore.parentNode || typeof elementToScore.parentNode.tagName === "undefined") {
              return;
            }
            var innerText = this._getInnerText(elementToScore);
            if (innerText.length < 25) {
              return;
            }
            var ancestors2 = this._getNodeAncestors(elementToScore, 5);
            if (ancestors2.length === 0) {
              return;
            }
            var contentScore = 0;
            contentScore += 1;
            contentScore += innerText.split(this.REGEXPS.commas).length;
            contentScore += Math.min(Math.floor(innerText.length / 100), 3);
            this._forEachNode(ancestors2, function(ancestor, level) {
              if (!ancestor.tagName || !ancestor.parentNode || typeof ancestor.parentNode.tagName === "undefined") {
                return;
              }
              if (typeof ancestor.readability === "undefined") {
                this._initializeNode(ancestor);
                candidates.push(ancestor);
              }
              if (level === 0) {
                var scoreDivider = 1;
              } else if (level === 1) {
                scoreDivider = 2;
              } else {
                scoreDivider = level * 3;
              }
              ancestor.readability.contentScore += contentScore / scoreDivider;
            });
          });
          var topCandidates = [];
          for (var c = 0, cl = candidates.length;c < cl; c += 1) {
            var candidate = candidates[c];
            var candidateScore = candidate.readability.contentScore * (1 - this._getLinkDensity(candidate));
            candidate.readability.contentScore = candidateScore;
            this.log("Candidate:", candidate, "with score " + candidateScore);
            for (var t = 0;t < this._nbTopCandidates; t++) {
              var aTopCandidate = topCandidates[t];
              if (!aTopCandidate || candidateScore > aTopCandidate.readability.contentScore) {
                topCandidates.splice(t, 0, candidate);
                if (topCandidates.length > this._nbTopCandidates) {
                  topCandidates.pop();
                }
                break;
              }
            }
          }
          var topCandidate = topCandidates[0] || null;
          var neededToCreateTopCandidate = false;
          var parentOfTopCandidate;
          if (topCandidate === null || topCandidate.tagName === "BODY") {
            topCandidate = doc.createElement("DIV");
            neededToCreateTopCandidate = true;
            while (page.firstChild) {
              this.log("Moving child out:", page.firstChild);
              topCandidate.appendChild(page.firstChild);
            }
            page.appendChild(topCandidate);
            this._initializeNode(topCandidate);
          } else if (topCandidate) {
            var alternativeCandidateAncestors = [];
            for (var i = 1;i < topCandidates.length; i++) {
              if (topCandidates[i].readability.contentScore / topCandidate.readability.contentScore >= 0.75) {
                alternativeCandidateAncestors.push(this._getNodeAncestors(topCandidates[i]));
              }
            }
            var MINIMUM_TOPCANDIDATES = 3;
            if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
              parentOfTopCandidate = topCandidate.parentNode;
              while (parentOfTopCandidate.tagName !== "BODY") {
                var listsContainingThisAncestor = 0;
                for (var ancestorIndex = 0;ancestorIndex < alternativeCandidateAncestors.length && listsContainingThisAncestor < MINIMUM_TOPCANDIDATES; ancestorIndex++) {
                  listsContainingThisAncestor += Number(alternativeCandidateAncestors[ancestorIndex].includes(parentOfTopCandidate));
                }
                if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
                  topCandidate = parentOfTopCandidate;
                  break;
                }
                parentOfTopCandidate = parentOfTopCandidate.parentNode;
              }
            }
            if (!topCandidate.readability) {
              this._initializeNode(topCandidate);
            }
            parentOfTopCandidate = topCandidate.parentNode;
            var lastScore = topCandidate.readability.contentScore;
            var scoreThreshold = lastScore / 3;
            while (parentOfTopCandidate.tagName !== "BODY") {
              if (!parentOfTopCandidate.readability) {
                parentOfTopCandidate = parentOfTopCandidate.parentNode;
                continue;
              }
              var parentScore = parentOfTopCandidate.readability.contentScore;
              if (parentScore < scoreThreshold) {
                break;
              }
              if (parentScore > lastScore) {
                topCandidate = parentOfTopCandidate;
                break;
              }
              lastScore = parentOfTopCandidate.readability.contentScore;
              parentOfTopCandidate = parentOfTopCandidate.parentNode;
            }
            parentOfTopCandidate = topCandidate.parentNode;
            while (parentOfTopCandidate.tagName != "BODY" && parentOfTopCandidate.children.length == 1) {
              topCandidate = parentOfTopCandidate;
              parentOfTopCandidate = topCandidate.parentNode;
            }
            if (!topCandidate.readability) {
              this._initializeNode(topCandidate);
            }
          }
          var articleContent = doc.createElement("DIV");
          if (isPaging) {
            articleContent.id = "readability-content";
          }
          var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
          parentOfTopCandidate = topCandidate.parentNode;
          var siblings = parentOfTopCandidate.children;
          for (var s = 0, sl = siblings.length;s < sl; s++) {
            var sibling = siblings[s];
            var append = false;
            this.log("Looking at sibling node:", sibling, sibling.readability ? "with score " + sibling.readability.contentScore : "");
            this.log("Sibling has score", sibling.readability ? sibling.readability.contentScore : "Unknown");
            if (sibling === topCandidate) {
              append = true;
            } else {
              var contentBonus = 0;
              if (sibling.className === topCandidate.className && topCandidate.className !== "") {
                contentBonus += topCandidate.readability.contentScore * 0.2;
              }
              if (sibling.readability && sibling.readability.contentScore + contentBonus >= siblingScoreThreshold) {
                append = true;
              } else if (sibling.nodeName === "P") {
                var linkDensity = this._getLinkDensity(sibling);
                var nodeContent = this._getInnerText(sibling);
                var nodeLength = nodeContent.length;
                if (nodeLength > 80 && linkDensity < 0.25) {
                  append = true;
                } else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1) {
                  append = true;
                }
              }
            }
            if (append) {
              this.log("Appending node:", sibling);
              if (!this.ALTER_TO_DIV_EXCEPTIONS.includes(sibling.nodeName)) {
                this.log("Altering sibling:", sibling, "to div.");
                sibling = this._setNodeTag(sibling, "DIV");
              }
              articleContent.appendChild(sibling);
              siblings = parentOfTopCandidate.children;
              s -= 1;
              sl -= 1;
            }
          }
          if (this._debug) {
            this.log("Article content pre-prep: " + articleContent.innerHTML);
          }
          this._prepArticle(articleContent);
          if (this._debug) {
            this.log("Article content post-prep: " + articleContent.innerHTML);
          }
          if (neededToCreateTopCandidate) {
            topCandidate.id = "readability-page-1";
            topCandidate.className = "page";
          } else {
            var div = doc.createElement("DIV");
            div.id = "readability-page-1";
            div.className = "page";
            while (articleContent.firstChild) {
              div.appendChild(articleContent.firstChild);
            }
            articleContent.appendChild(div);
          }
          if (this._debug) {
            this.log("Article content after paging: " + articleContent.innerHTML);
          }
          var parseSuccessful = true;
          var textLength = this._getInnerText(articleContent, true).length;
          if (textLength < this._charThreshold) {
            parseSuccessful = false;
            page.innerHTML = pageCacheHtml;
            this._attempts.push({
              articleContent,
              textLength
            });
            if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
              this._removeFlag(this.FLAG_STRIP_UNLIKELYS);
            } else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
              this._removeFlag(this.FLAG_WEIGHT_CLASSES);
            } else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
              this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY);
            } else {
              this._attempts.sort(function(a, b) {
                return b.textLength - a.textLength;
              });
              if (!this._attempts[0].textLength) {
                return null;
              }
              articleContent = this._attempts[0].articleContent;
              parseSuccessful = true;
            }
          }
          if (parseSuccessful) {
            var ancestors = [parentOfTopCandidate, topCandidate].concat(this._getNodeAncestors(parentOfTopCandidate));
            this._someNode(ancestors, function(ancestor) {
              if (!ancestor.tagName) {
                return false;
              }
              var articleDir = ancestor.getAttribute("dir");
              if (articleDir) {
                this._articleDir = articleDir;
                return true;
              }
              return false;
            });
            return articleContent;
          }
        }
      },
      _unescapeHtmlEntities(str) {
        if (!str) {
          return str;
        }
        var htmlEscapeMap = this.HTML_ESCAPE_MAP;
        return str.replace(/&(quot|amp|apos|lt|gt);/g, function(_, tag) {
          return htmlEscapeMap[tag];
        }).replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, function(_, hex, numStr) {
          var num = parseInt(hex || numStr, hex ? 16 : 10);
          if (num == 0 || num > 1114111 || num >= 55296 && num <= 57343) {
            num = 65533;
          }
          return String.fromCodePoint(num);
        });
      },
      _getJSONLD(doc) {
        var scripts = this._getAllNodesWithTag(doc, ["script"]);
        var metadata;
        this._forEachNode(scripts, function(jsonLdElement) {
          if (!metadata && jsonLdElement.getAttribute("type") === "application/ld+json") {
            try {
              var content = jsonLdElement.textContent.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
              var parsed = JSON.parse(content);
              if (Array.isArray(parsed)) {
                parsed = parsed.find((it) => {
                  return it["@type"] && it["@type"].match(this.REGEXPS.jsonLdArticleTypes);
                });
                if (!parsed) {
                  return;
                }
              }
              var schemaDotOrgRegex = /^https?\:\/\/schema\.org\/?$/;
              var matches = typeof parsed["@context"] === "string" && parsed["@context"].match(schemaDotOrgRegex) || typeof parsed["@context"] === "object" && typeof parsed["@context"]["@vocab"] == "string" && parsed["@context"]["@vocab"].match(schemaDotOrgRegex);
              if (!matches) {
                return;
              }
              if (!parsed["@type"] && Array.isArray(parsed["@graph"])) {
                parsed = parsed["@graph"].find((it) => {
                  return (it["@type"] || "").match(this.REGEXPS.jsonLdArticleTypes);
                });
              }
              if (!parsed || !parsed["@type"] || !parsed["@type"].match(this.REGEXPS.jsonLdArticleTypes)) {
                return;
              }
              metadata = {};
              if (typeof parsed.name === "string" && typeof parsed.headline === "string" && parsed.name !== parsed.headline) {
                var title = this._getArticleTitle();
                var nameMatches = this._textSimilarity(parsed.name, title) > 0.75;
                var headlineMatches = this._textSimilarity(parsed.headline, title) > 0.75;
                if (headlineMatches && !nameMatches) {
                  metadata.title = parsed.headline;
                } else {
                  metadata.title = parsed.name;
                }
              } else if (typeof parsed.name === "string") {
                metadata.title = parsed.name.trim();
              } else if (typeof parsed.headline === "string") {
                metadata.title = parsed.headline.trim();
              }
              if (parsed.author) {
                if (typeof parsed.author.name === "string") {
                  metadata.byline = parsed.author.name.trim();
                } else if (Array.isArray(parsed.author) && parsed.author[0] && typeof parsed.author[0].name === "string") {
                  metadata.byline = parsed.author.filter(function(author) {
                    return author && typeof author.name === "string";
                  }).map(function(author) {
                    return author.name.trim();
                  }).join(", ");
                }
              }
              if (typeof parsed.description === "string") {
                metadata.excerpt = parsed.description.trim();
              }
              if (parsed.publisher && typeof parsed.publisher.name === "string") {
                metadata.siteName = parsed.publisher.name.trim();
              }
              if (typeof parsed.datePublished === "string") {
                metadata.datePublished = parsed.datePublished.trim();
              }
            } catch (err) {
              this.log(err.message);
            }
          }
        });
        return metadata ? metadata : {};
      },
      _getArticleMetadata(jsonld) {
        var metadata = {};
        var values = {};
        var metaElements = this._doc.getElementsByTagName("meta");
        var propertyPattern = /\s*(article|dc|dcterm|og|twitter)\s*:\s*(author|creator|description|published_time|title|site_name)\s*/gi;
        var namePattern = /^\s*(?:(dc|dcterm|og|twitter|parsely|weibo:(article|webpage))\s*[-\.:]\s*)?(author|creator|pub-date|description|title|site_name)\s*$/i;
        this._forEachNode(metaElements, function(element) {
          var elementName = element.getAttribute("name");
          var elementProperty = element.getAttribute("property");
          var content = element.getAttribute("content");
          if (!content) {
            return;
          }
          var matches = null;
          var name = null;
          if (elementProperty) {
            matches = elementProperty.match(propertyPattern);
            if (matches) {
              name = matches[0].toLowerCase().replace(/\s/g, "");
              values[name] = content.trim();
            }
          }
          if (!matches && elementName && namePattern.test(elementName)) {
            name = elementName;
            if (content) {
              name = name.toLowerCase().replace(/\s/g, "").replace(/\./g, ":");
              values[name] = content.trim();
            }
          }
        });
        metadata.title = jsonld.title || values["dc:title"] || values["dcterm:title"] || values["og:title"] || values["weibo:article:title"] || values["weibo:webpage:title"] || values.title || values["twitter:title"] || values["parsely-title"];
        if (!metadata.title) {
          metadata.title = this._getArticleTitle();
        }
        const articleAuthor = typeof values["article:author"] === "string" && !this._isUrl(values["article:author"]) ? values["article:author"] : undefined;
        metadata.byline = jsonld.byline || values["dc:creator"] || values["dcterm:creator"] || values.author || values["parsely-author"] || articleAuthor;
        metadata.excerpt = jsonld.excerpt || values["dc:description"] || values["dcterm:description"] || values["og:description"] || values["weibo:article:description"] || values["weibo:webpage:description"] || values.description || values["twitter:description"];
        metadata.siteName = jsonld.siteName || values["og:site_name"];
        metadata.publishedTime = jsonld.datePublished || values["article:published_time"] || values["parsely-pub-date"] || null;
        metadata.title = this._unescapeHtmlEntities(metadata.title);
        metadata.byline = this._unescapeHtmlEntities(metadata.byline);
        metadata.excerpt = this._unescapeHtmlEntities(metadata.excerpt);
        metadata.siteName = this._unescapeHtmlEntities(metadata.siteName);
        metadata.publishedTime = this._unescapeHtmlEntities(metadata.publishedTime);
        return metadata;
      },
      _isSingleImage(node) {
        while (node) {
          if (node.tagName === "IMG") {
            return true;
          }
          if (node.children.length !== 1 || node.textContent.trim() !== "") {
            return false;
          }
          node = node.children[0];
        }
        return false;
      },
      _unwrapNoscriptImages(doc) {
        var imgs = Array.from(doc.getElementsByTagName("img"));
        this._forEachNode(imgs, function(img) {
          for (var i = 0;i < img.attributes.length; i++) {
            var attr = img.attributes[i];
            switch (attr.name) {
              case "src":
              case "srcset":
              case "data-src":
              case "data-srcset":
                return;
            }
            if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
              return;
            }
          }
          img.remove();
        });
        var noscripts = Array.from(doc.getElementsByTagName("noscript"));
        this._forEachNode(noscripts, function(noscript) {
          if (!this._isSingleImage(noscript)) {
            return;
          }
          var tmp = doc.createElement("div");
          tmp.innerHTML = noscript.innerHTML;
          var prevElement = noscript.previousElementSibling;
          if (prevElement && this._isSingleImage(prevElement)) {
            var prevImg = prevElement;
            if (prevImg.tagName !== "IMG") {
              prevImg = prevElement.getElementsByTagName("img")[0];
            }
            var newImg = tmp.getElementsByTagName("img")[0];
            for (var i = 0;i < prevImg.attributes.length; i++) {
              var attr = prevImg.attributes[i];
              if (attr.value === "") {
                continue;
              }
              if (attr.name === "src" || attr.name === "srcset" || /\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                if (newImg.getAttribute(attr.name) === attr.value) {
                  continue;
                }
                var attrName = attr.name;
                if (newImg.hasAttribute(attrName)) {
                  attrName = "data-old-" + attrName;
                }
                newImg.setAttribute(attrName, attr.value);
              }
            }
            noscript.parentNode.replaceChild(tmp.firstElementChild, prevElement);
          }
        });
      },
      _removeScripts(doc) {
        this._removeNodes(this._getAllNodesWithTag(doc, ["script", "noscript"]));
      },
      _hasSingleTagInsideElement(element, tag) {
        if (element.children.length != 1 || element.children[0].tagName !== tag) {
          return false;
        }
        return !this._someNode(element.childNodes, function(node) {
          return node.nodeType === this.TEXT_NODE && this.REGEXPS.hasContent.test(node.textContent);
        });
      },
      _isElementWithoutContent(node) {
        return node.nodeType === this.ELEMENT_NODE && !node.textContent.trim().length && (!node.children.length || node.children.length == node.getElementsByTagName("br").length + node.getElementsByTagName("hr").length);
      },
      _hasChildBlockElement(element) {
        return this._someNode(element.childNodes, function(node) {
          return this.DIV_TO_P_ELEMS.has(node.tagName) || this._hasChildBlockElement(node);
        });
      },
      _isPhrasingContent(node) {
        return node.nodeType === this.TEXT_NODE || this.PHRASING_ELEMS.includes(node.tagName) || (node.tagName === "A" || node.tagName === "DEL" || node.tagName === "INS") && this._everyNode(node.childNodes, this._isPhrasingContent);
      },
      _isWhitespace(node) {
        return node.nodeType === this.TEXT_NODE && node.textContent.trim().length === 0 || node.nodeType === this.ELEMENT_NODE && node.tagName === "BR";
      },
      _getInnerText(e, normalizeSpaces) {
        normalizeSpaces = typeof normalizeSpaces === "undefined" ? true : normalizeSpaces;
        var textContent = e.textContent.trim();
        if (normalizeSpaces) {
          return textContent.replace(this.REGEXPS.normalize, " ");
        }
        return textContent;
      },
      _getCharCount(e, s) {
        s = s || ",";
        return this._getInnerText(e).split(s).length - 1;
      },
      _cleanStyles(e) {
        if (!e || e.tagName.toLowerCase() === "svg") {
          return;
        }
        for (var i = 0;i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
          e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i]);
        }
        if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.includes(e.tagName)) {
          e.removeAttribute("width");
          e.removeAttribute("height");
        }
        var cur = e.firstElementChild;
        while (cur !== null) {
          this._cleanStyles(cur);
          cur = cur.nextElementSibling;
        }
      },
      _getLinkDensity(element) {
        var textLength = this._getInnerText(element).length;
        if (textLength === 0) {
          return 0;
        }
        var linkLength = 0;
        this._forEachNode(element.getElementsByTagName("a"), function(linkNode) {
          var href = linkNode.getAttribute("href");
          var coefficient = href && this.REGEXPS.hashUrl.test(href) ? 0.3 : 1;
          linkLength += this._getInnerText(linkNode).length * coefficient;
        });
        return linkLength / textLength;
      },
      _getClassWeight(e) {
        if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
          return 0;
        }
        var weight = 0;
        if (typeof e.className === "string" && e.className !== "") {
          if (this.REGEXPS.negative.test(e.className)) {
            weight -= 25;
          }
          if (this.REGEXPS.positive.test(e.className)) {
            weight += 25;
          }
        }
        if (typeof e.id === "string" && e.id !== "") {
          if (this.REGEXPS.negative.test(e.id)) {
            weight -= 25;
          }
          if (this.REGEXPS.positive.test(e.id)) {
            weight += 25;
          }
        }
        return weight;
      },
      _clean(e, tag) {
        var isEmbed = ["object", "embed", "iframe"].includes(tag);
        this._removeNodes(this._getAllNodesWithTag(e, [tag]), function(element) {
          if (isEmbed) {
            for (var i = 0;i < element.attributes.length; i++) {
              if (this._allowedVideoRegex.test(element.attributes[i].value)) {
                return false;
              }
            }
            if (element.tagName === "object" && this._allowedVideoRegex.test(element.innerHTML)) {
              return false;
            }
          }
          return true;
        });
      },
      _hasAncestorTag(node, tagName, maxDepth, filterFn) {
        maxDepth = maxDepth || 3;
        tagName = tagName.toUpperCase();
        var depth = 0;
        while (node.parentNode) {
          if (maxDepth > 0 && depth > maxDepth) {
            return false;
          }
          if (node.parentNode.tagName === tagName && (!filterFn || filterFn(node.parentNode))) {
            return true;
          }
          node = node.parentNode;
          depth++;
        }
        return false;
      },
      _getRowAndColumnCount(table) {
        var rows = 0;
        var columns = 0;
        var trs = table.getElementsByTagName("tr");
        for (var i = 0;i < trs.length; i++) {
          var rowspan = trs[i].getAttribute("rowspan") || 0;
          if (rowspan) {
            rowspan = parseInt(rowspan, 10);
          }
          rows += rowspan || 1;
          var columnsInThisRow = 0;
          var cells = trs[i].getElementsByTagName("td");
          for (var j = 0;j < cells.length; j++) {
            var colspan = cells[j].getAttribute("colspan") || 0;
            if (colspan) {
              colspan = parseInt(colspan, 10);
            }
            columnsInThisRow += colspan || 1;
          }
          columns = Math.max(columns, columnsInThisRow);
        }
        return { rows, columns };
      },
      _markDataTables(root) {
        var tables = root.getElementsByTagName("table");
        for (var i = 0;i < tables.length; i++) {
          var table = tables[i];
          var role = table.getAttribute("role");
          if (role == "presentation") {
            table._readabilityDataTable = false;
            continue;
          }
          var datatable = table.getAttribute("datatable");
          if (datatable == "0") {
            table._readabilityDataTable = false;
            continue;
          }
          var summary = table.getAttribute("summary");
          if (summary) {
            table._readabilityDataTable = true;
            continue;
          }
          var caption = table.getElementsByTagName("caption")[0];
          if (caption && caption.childNodes.length) {
            table._readabilityDataTable = true;
            continue;
          }
          var dataTableDescendants = ["col", "colgroup", "tfoot", "thead", "th"];
          var descendantExists = function(tag) {
            return !!table.getElementsByTagName(tag)[0];
          };
          if (dataTableDescendants.some(descendantExists)) {
            this.log("Data table because found data-y descendant");
            table._readabilityDataTable = true;
            continue;
          }
          if (table.getElementsByTagName("table")[0]) {
            table._readabilityDataTable = false;
            continue;
          }
          var sizeInfo = this._getRowAndColumnCount(table);
          if (sizeInfo.columns == 1 || sizeInfo.rows == 1) {
            table._readabilityDataTable = false;
            continue;
          }
          if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
            table._readabilityDataTable = true;
            continue;
          }
          table._readabilityDataTable = sizeInfo.rows * sizeInfo.columns > 10;
        }
      },
      _fixLazyImages(root) {
        this._forEachNode(this._getAllNodesWithTag(root, ["img", "picture", "figure"]), function(elem) {
          if (elem.src && this.REGEXPS.b64DataUrl.test(elem.src)) {
            var parts = this.REGEXPS.b64DataUrl.exec(elem.src);
            if (parts[1] === "image/svg+xml") {
              return;
            }
            var srcCouldBeRemoved = false;
            for (var i = 0;i < elem.attributes.length; i++) {
              var attr = elem.attributes[i];
              if (attr.name === "src") {
                continue;
              }
              if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                srcCouldBeRemoved = true;
                break;
              }
            }
            if (srcCouldBeRemoved) {
              var b64starts = parts[0].length;
              var b64length = elem.src.length - b64starts;
              if (b64length < 133) {
                elem.removeAttribute("src");
              }
            }
          }
          if ((elem.src || elem.srcset && elem.srcset != "null") && !elem.className.toLowerCase().includes("lazy")) {
            return;
          }
          for (var j = 0;j < elem.attributes.length; j++) {
            attr = elem.attributes[j];
            if (attr.name === "src" || attr.name === "srcset" || attr.name === "alt") {
              continue;
            }
            var copyTo = null;
            if (/\.(jpg|jpeg|png|webp)\s+\d/.test(attr.value)) {
              copyTo = "srcset";
            } else if (/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(attr.value)) {
              copyTo = "src";
            }
            if (copyTo) {
              if (elem.tagName === "IMG" || elem.tagName === "PICTURE") {
                elem.setAttribute(copyTo, attr.value);
              } else if (elem.tagName === "FIGURE" && !this._getAllNodesWithTag(elem, ["img", "picture"]).length) {
                var img = this._doc.createElement("img");
                img.setAttribute(copyTo, attr.value);
                elem.appendChild(img);
              }
            }
          }
        });
      },
      _getTextDensity(e, tags) {
        var textLength = this._getInnerText(e, true).length;
        if (textLength === 0) {
          return 0;
        }
        var childrenLength = 0;
        var children = this._getAllNodesWithTag(e, tags);
        this._forEachNode(children, (child) => childrenLength += this._getInnerText(child, true).length);
        return childrenLength / textLength;
      },
      _cleanConditionally(e, tag) {
        if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
          return;
        }
        this._removeNodes(this._getAllNodesWithTag(e, [tag]), function(node) {
          var isDataTable = function(t) {
            return t._readabilityDataTable;
          };
          var isList = tag === "ul" || tag === "ol";
          if (!isList) {
            var listLength = 0;
            var listNodes = this._getAllNodesWithTag(node, ["ul", "ol"]);
            this._forEachNode(listNodes, (list) => listLength += this._getInnerText(list).length);
            isList = listLength / this._getInnerText(node).length > 0.9;
          }
          if (tag === "table" && isDataTable(node)) {
            return false;
          }
          if (this._hasAncestorTag(node, "table", -1, isDataTable)) {
            return false;
          }
          if (this._hasAncestorTag(node, "code")) {
            return false;
          }
          if ([...node.getElementsByTagName("table")].some((tbl) => tbl._readabilityDataTable)) {
            return false;
          }
          var weight = this._getClassWeight(node);
          this.log("Cleaning Conditionally", node);
          var contentScore = 0;
          if (weight + contentScore < 0) {
            return true;
          }
          if (this._getCharCount(node, ",") < 10) {
            var p = node.getElementsByTagName("p").length;
            var img = node.getElementsByTagName("img").length;
            var li = node.getElementsByTagName("li").length - 100;
            var input = node.getElementsByTagName("input").length;
            var headingDensity = this._getTextDensity(node, [
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6"
            ]);
            var embedCount = 0;
            var embeds = this._getAllNodesWithTag(node, [
              "object",
              "embed",
              "iframe"
            ]);
            for (var i = 0;i < embeds.length; i++) {
              for (var j = 0;j < embeds[i].attributes.length; j++) {
                if (this._allowedVideoRegex.test(embeds[i].attributes[j].value)) {
                  return false;
                }
              }
              if (embeds[i].tagName === "object" && this._allowedVideoRegex.test(embeds[i].innerHTML)) {
                return false;
              }
              embedCount++;
            }
            var innerText = this._getInnerText(node);
            if (this.REGEXPS.adWords.test(innerText) || this.REGEXPS.loadingWords.test(innerText)) {
              return true;
            }
            var contentLength = innerText.length;
            var linkDensity = this._getLinkDensity(node);
            var textishTags = ["SPAN", "LI", "TD"].concat(Array.from(this.DIV_TO_P_ELEMS));
            var textDensity = this._getTextDensity(node, textishTags);
            var isFigureChild = this._hasAncestorTag(node, "figure");
            const shouldRemoveNode = () => {
              const errs = [];
              if (!isFigureChild && img > 1 && p / img < 0.5) {
                errs.push(`Bad p to img ratio (img=${img}, p=${p})`);
              }
              if (!isList && li > p) {
                errs.push(`Too many li's outside of a list. (li=${li} > p=${p})`);
              }
              if (input > Math.floor(p / 3)) {
                errs.push(`Too many inputs per p. (input=${input}, p=${p})`);
              }
              if (!isList && !isFigureChild && headingDensity < 0.9 && contentLength < 25 && (img === 0 || img > 2) && linkDensity > 0) {
                errs.push(`Suspiciously short. (headingDensity=${headingDensity}, img=${img}, linkDensity=${linkDensity})`);
              }
              if (!isList && weight < 25 && linkDensity > 0.2 + this._linkDensityModifier) {
                errs.push(`Low weight and a little linky. (linkDensity=${linkDensity})`);
              }
              if (weight >= 25 && linkDensity > 0.5 + this._linkDensityModifier) {
                errs.push(`High weight and mostly links. (linkDensity=${linkDensity})`);
              }
              if (embedCount === 1 && contentLength < 75 || embedCount > 1) {
                errs.push(`Suspicious embed. (embedCount=${embedCount}, contentLength=${contentLength})`);
              }
              if (img === 0 && textDensity === 0) {
                errs.push(`No useful content. (img=${img}, textDensity=${textDensity})`);
              }
              if (errs.length) {
                this.log("Checks failed", errs);
                return true;
              }
              return false;
            };
            var haveToRemove = shouldRemoveNode();
            if (isList && haveToRemove) {
              for (var x = 0;x < node.children.length; x++) {
                let child = node.children[x];
                if (child.children.length > 1) {
                  return haveToRemove;
                }
              }
              let li_count = node.getElementsByTagName("li").length;
              if (img == li_count) {
                return false;
              }
            }
            return haveToRemove;
          }
          return false;
        });
      },
      _cleanMatchedNodes(e, filter) {
        var endOfSearchMarkerNode = this._getNextNode(e, true);
        var next = this._getNextNode(e);
        while (next && next != endOfSearchMarkerNode) {
          if (filter.call(this, next, next.className + " " + next.id)) {
            next = this._removeAndGetNext(next);
          } else {
            next = this._getNextNode(next);
          }
        }
      },
      _cleanHeaders(e) {
        let headingNodes = this._getAllNodesWithTag(e, ["h1", "h2"]);
        this._removeNodes(headingNodes, function(node) {
          let shouldRemove = this._getClassWeight(node) < 0;
          if (shouldRemove) {
            this.log("Removing header with low class weight:", node);
          }
          return shouldRemove;
        });
      },
      _headerDuplicatesTitle(node) {
        if (node.tagName != "H1" && node.tagName != "H2") {
          return false;
        }
        var heading = this._getInnerText(node, false);
        this.log("Evaluating similarity of header:", heading, this._articleTitle);
        return this._textSimilarity(this._articleTitle, heading) > 0.75;
      },
      _flagIsActive(flag) {
        return (this._flags & flag) > 0;
      },
      _removeFlag(flag) {
        this._flags = this._flags & ~flag;
      },
      _isProbablyVisible(node) {
        return (!node.style || node.style.display != "none") && (!node.style || node.style.visibility != "hidden") && !node.hasAttribute("hidden") && (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || node.className && node.className.includes && node.className.includes("fallback-image"));
      },
      parse() {
        if (this._maxElemsToParse > 0) {
          var numTags = this._doc.getElementsByTagName("*").length;
          if (numTags > this._maxElemsToParse) {
            throw new Error("Aborting parsing document; " + numTags + " elements found");
          }
        }
        this._unwrapNoscriptImages(this._doc);
        var jsonLd = this._disableJSONLD ? {} : this._getJSONLD(this._doc);
        this._removeScripts(this._doc);
        this._prepDocument();
        var metadata = this._getArticleMetadata(jsonLd);
        this._metadata = metadata;
        this._articleTitle = metadata.title;
        var articleContent = this._grabArticle();
        if (!articleContent) {
          return null;
        }
        this.log("Grabbed: " + articleContent.innerHTML);
        this._postProcessContent(articleContent);
        if (!metadata.excerpt) {
          var paragraphs = articleContent.getElementsByTagName("p");
          if (paragraphs.length) {
            metadata.excerpt = paragraphs[0].textContent.trim();
          }
        }
        var textContent = articleContent.textContent;
        return {
          title: this._articleTitle,
          byline: metadata.byline || this._articleByline,
          dir: this._articleDir,
          lang: this._articleLang,
          content: this._serializer(articleContent),
          textContent,
          length: textContent.length,
          excerpt: metadata.excerpt,
          siteName: metadata.siteName || this._articleSiteName,
          publishedTime: metadata.publishedTime
        };
      }
    };
    if (typeof module === "object") {
      module.exports = Readability;
    }
  });

  // src/core/tokenize.js
  function splitWords(text) {
    return text.split(/\s+/).filter(function(w) {
      return w.length > 0;
    });
  }
  function isSentenceEnd(word) {
    return /[.!?]["'’”)\]]*$/.test(word);
  }
  function tokenizeText(raw) {
    var normalized = raw.replace(/\r\n?/g, `
`);
    var rawParagraphs = normalized.split(/\n\s*\n+/);
    var paragraphs = [];
    rawParagraphs.forEach(function(p) {
      var t = p.trim();
      if (t.length)
        paragraphs.push(t);
    });
    var words = [];
    var paragraphEndIndices = new Set;
    paragraphs.forEach(function(paraText) {
      var ws = splitWords(paraText);
      ws.forEach(function(w, i2) {
        words.push(w);
        if (i2 === ws.length - 1)
          paragraphEndIndices.add(words.length - 1);
      });
    });
    var sentenceStarts = [0];
    for (var i = 0;i < words.length; i++) {
      if (isSentenceEnd(words[i]) && i + 1 < words.length)
        sentenceStarts.push(i + 1);
    }
    return {
      words,
      paragraphs,
      paragraphEndIndices,
      sentenceStarts
    };
  }

  // src/core/chunk.js
  function getOrpIndex(len) {
    if (len <= 1)
      return 0;
    if (len <= 5)
      return 1;
    if (len <= 9)
      return 2;
    if (len <= 13)
      return 3;
    return 4;
  }
  function getChunkIndices(doc, startIndex, chunkSize) {
    var indices = [];
    var total = doc.words.length;
    for (var i = 0;i < chunkSize && startIndex + i < total; i++) {
      indices.push(startIndex + i);
    }
    return indices;
  }
  function isClauseBreak(word) {
    return /[,;:]$/.test(word);
  }
  function findNextHardBoundary(doc, fromIndex) {
    for (var k = fromIndex;k < doc.words.length; k++) {
      if (doc.paragraphEndIndices.has(k) || isSentenceEnd(doc.words[k]))
        return k;
    }
    return doc.words.length - 1;
  }
  function chunkPhrases(doc) {
    var words = doc.words;
    var n = words.length;
    var chunks = [];
    var i = 0;
    while (i < n) {
      var h = findNextHardBoundary(doc, i);
      var remaining = h - i + 1;
      var effectiveCap = remaining === 6 ? 3 : 5;
      var end = i;
      for (var k = i;k < n; k++) {
        end = k;
        var len = k - i + 1;
        var word = words[k];
        var mustStop = doc.paragraphEndIndices.has(k) || isSentenceEnd(word);
        var mayStop = isClauseBreak(word) && len >= 2;
        var atCap = len >= effectiveCap;
        if (mustStop || mayStop || atCap)
          break;
      }
      chunks.push({ start: i, end });
      i = end + 1;
    }
    return chunks;
  }
  function findPhraseChunkIndexAt(chunks, idx) {
    for (var i = 0;i < chunks.length; i++) {
      if (idx >= chunks[i].start && idx <= chunks[i].end)
        return i;
    }
    return -1;
  }

  // src/core/timing.js
  function isHeavyPunctEnd(word) {
    return /[.!?;:]["'’”)\]]*$/.test(word);
  }
  function hasComma(word) {
    return word.indexOf(",") !== -1;
  }
  function isLongWord(word) {
    return word.replace(/[^A-Za-z]/g, "").length >= 9;
  }
  function computeDwellMs(doc, chunkIndices, wpm) {
    var msPerWord = 60000 / wpm;
    var mult = 1;
    var lastWord = doc.words[chunkIndices[chunkIndices.length - 1]];
    if (isHeavyPunctEnd(lastWord))
      mult *= 1.5;
    var anyComma = false;
    var anyLong = false;
    var anyParaEnd = false;
    for (var k = 0;k < chunkIndices.length; k++) {
      var w = doc.words[chunkIndices[k]];
      if (hasComma(w))
        anyComma = true;
      if (isLongWord(w))
        anyLong = true;
      if (doc.paragraphEndIndices.has(chunkIndices[k]))
        anyParaEnd = true;
    }
    if (anyComma)
      mult *= 1.25;
    if (anyLong)
      mult *= 1.3;
    if (anyParaEnd)
      mult *= 2;
    mult = Math.min(mult, 3);
    return msPerWord * chunkIndices.length * mult;
  }
  function formatDuration(ms) {
    var totalSec = Math.round(ms / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return String(m) + ":" + String(s).padStart(2, "0");
  }

  // src/core/player.js
  var COUNTDOWN_BEATS = ["3", "2", "1"];
  var COUNTDOWN_STEP_MS = 350;
  var WPM_MIN = 100;
  var WPM_MAX = 900;
  var WPM_STEP = 25;
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }
  function createPlayer(options) {
    var storage = options.storage;
    var callbacks = options.callbacks || {};
    var initial = options.initial || {};
    var state = {
      doc: null,
      mode: initial.mode || "rsvp",
      chunkSize: initial.chunkSize || 1,
      wpm: initial.wpm || 300,
      currentIndex: 0,
      playing: false,
      counting: false,
      timerId: null,
      countdownTimerId: null,
      chunkStartedAt: null,
      currentChunkDwell: 0,
      activePlayMs: 0,
      phraseChunks: []
    };
    function persist(key, value) {
      if (storage && typeof storage.set === "function")
        storage.set(key, value);
    }
    function currentChunkIndicesAt(idx) {
      if (state.mode === "chunk") {
        var ci = findPhraseChunkIndexAt(state.phraseChunks, idx);
        if (ci === -1)
          return [];
        var pc = state.phraseChunks[ci];
        var arr = [];
        for (var k = pc.start;k <= pc.end; k++)
          arr.push(k);
        return arr;
      }
      return getChunkIndices(state.doc, idx, state.chunkSize);
    }
    function emitProgress() {
      if (!state.doc || !callbacks.onProgress)
        return;
      var total = state.doc.words.length;
      var current = Math.min(state.currentIndex + 1, total);
      callbacks.onProgress({ current, total });
    }
    function emitRender(chunkIndices) {
      if (!chunkIndices || !chunkIndices.length)
        return;
      if (callbacks.onRender) {
        callbacks.onRender(chunkIndices, { mode: state.mode, chunkSize: state.chunkSize });
      }
      emitProgress();
    }
    function hideEndCard() {
      var hasWords = !!(state.doc && state.doc.words.length);
      if (callbacks.onHideEndCard)
        callbacks.onHideEndCard(hasWords);
    }
    function updatePlayButton() {
      if (callbacks.onPlayStateChange)
        callbacks.onPlayStateChange(state.playing);
    }
    function clearCountdown() {
      if (state.countdownTimerId) {
        clearTimeout(state.countdownTimerId);
        state.countdownTimerId = null;
        if (callbacks.onCountdownDone)
          callbacks.onCountdownDone();
        state.counting = false;
      }
    }
    function runCountdown(onDone) {
      state.counting = true;
      var i = 0;
      if (callbacks.onCountdownTick)
        callbacks.onCountdownTick(COUNTDOWN_BEATS[0]);
      function tick() {
        i++;
        if (i < COUNTDOWN_BEATS.length) {
          if (callbacks.onCountdownTick)
            callbacks.onCountdownTick(COUNTDOWN_BEATS[i]);
          state.countdownTimerId = setTimeout(tick, COUNTDOWN_STEP_MS);
        } else {
          if (callbacks.onCountdownDone)
            callbacks.onCountdownDone();
          state.counting = false;
          state.countdownTimerId = null;
          onDone();
        }
      }
      state.countdownTimerId = setTimeout(tick, COUNTDOWN_STEP_MS);
    }
    function startPlaybackLoop() {
      if (!state.doc)
        return;
      if (state.currentIndex >= state.doc.words.length) {
        finishSession();
        return;
      }
      var chunkIndices = currentChunkIndicesAt(state.currentIndex);
      if (!chunkIndices.length) {
        finishSession();
        return;
      }
      emitRender(chunkIndices);
      var dwell = computeDwellMs(state.doc, chunkIndices, state.wpm);
      state.chunkStartedAt = performance.now();
      state.currentChunkDwell = dwell;
      state.timerId = setTimeout(function() {
        state.activePlayMs += dwell;
        state.chunkStartedAt = null;
        state.currentIndex = chunkIndices[chunkIndices.length - 1] + 1;
        startPlaybackLoop();
      }, dwell);
    }
    function resumePlayback() {
      if (!state.doc || !state.doc.words.length)
        return;
      if (state.playing || state.counting)
        return;
      if (state.currentIndex >= state.doc.words.length)
        return;
      runCountdown(function() {
        state.playing = true;
        updatePlayButton();
        startPlaybackLoop();
      });
    }
    function pausePlayback() {
      clearCountdown();
      if (!state.playing)
        return;
      state.playing = false;
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      if (state.chunkStartedAt !== null) {
        var elapsed = performance.now() - state.chunkStartedAt;
        state.activePlayMs += Math.min(elapsed, state.currentChunkDwell || 0);
        state.chunkStartedAt = null;
      }
      updatePlayButton();
    }
    function togglePlay() {
      if (!state.doc || !state.doc.words.length)
        return;
      if (state.playing) {
        pausePlayback();
      } else {
        resumePlayback();
      }
    }
    function finishSession() {
      state.playing = false;
      state.timerId = null;
      state.chunkStartedAt = null;
      updatePlayButton();
      var totalWords = state.doc.words.length;
      var minutes = state.activePlayMs / 60000;
      var effectiveWpm = minutes > 0 ? Math.round(totalWords / minutes) : 0;
      if (callbacks.onFinish) {
        callbacks.onFinish({
          totalWords,
          activePlayMs: state.activePlayMs,
          effectiveWpm
        });
      }
    }
    function restart() {
      if (!state.doc || !state.doc.words.length)
        return;
      pausePlayback();
      hideEndCard();
      state.currentIndex = 0;
      state.activePlayMs = 0;
      emitRender(currentChunkIndicesAt(0));
    }
    function setWpm(wpm) {
      state.wpm = wpm;
      persist("sr_wpm", String(state.wpm));
      if (callbacks.onWpmChange)
        callbacks.onWpmChange(state.wpm);
    }
    function adjustWpm(delta) {
      var next = clamp(state.wpm + delta, WPM_MIN, WPM_MAX);
      next = Math.round(next / WPM_STEP) * WPM_STEP;
      setWpm(next);
    }
    function rerunFromStart(newWpm) {
      hideEndCard();
      if (typeof newWpm === "number") {
        setWpm(clamp(newWpm, WPM_MIN, WPM_MAX));
      }
      state.currentIndex = 0;
      state.activePlayMs = 0;
      emitRender(currentChunkIndicesAt(0));
      resumePlayback();
    }
    function jumpToIndex(idx) {
      if (!state.doc || !state.doc.words.length)
        return;
      clearCountdown();
      var total = state.doc.words.length;
      idx = Math.max(0, Math.min(idx, total - 1));
      if (state.mode === "chunk" && state.phraseChunks.length) {
        var snapIdx = findPhraseChunkIndexAt(state.phraseChunks, idx);
        if (snapIdx !== -1)
          idx = state.phraseChunks[snapIdx].start;
      }
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      state.currentIndex = idx;
      hideEndCard();
      if (state.playing) {
        startPlaybackLoop();
      } else {
        emitRender(currentChunkIndicesAt(idx));
      }
    }
    function forwardSentence() {
      if (!state.doc || !state.doc.words.length)
        return;
      var starts = state.doc.sentenceStarts;
      var next;
      for (var i = 0;i < starts.length; i++) {
        if (starts[i] > state.currentIndex) {
          next = starts[i];
          break;
        }
      }
      var target = next !== undefined ? next : Math.max(0, state.doc.words.length - 1);
      jumpToIndex(target);
    }
    function backSentence() {
      if (!state.doc || !state.doc.words.length)
        return;
      var starts = state.doc.sentenceStarts;
      var currentStart = 0;
      for (var i = 0;i < starts.length; i++) {
        if (starts[i] <= state.currentIndex) {
          currentStart = starts[i];
        } else {
          break;
        }
      }
      var target;
      if (state.currentIndex > currentStart) {
        target = currentStart;
      } else {
        var prev = 0;
        for (var j = 0;j < starts.length; j++) {
          if (starts[j] < currentStart) {
            prev = starts[j];
          } else {
            break;
          }
        }
        target = prev;
      }
      jumpToIndex(target);
    }
    function setMode(m) {
      if (m === state.mode)
        return;
      if (m === "chunk" && state.doc && state.phraseChunks.length) {
        var ci = findPhraseChunkIndexAt(state.phraseChunks, state.currentIndex);
        if (ci !== -1)
          state.currentIndex = state.phraseChunks[ci].start;
      }
      state.mode = m;
      persist("sr_mode", m);
      if (callbacks.onModeChange)
        callbacks.onModeChange(m);
      if (state.doc && state.doc.words.length) {
        if (state.playing) {
          if (state.timerId) {
            clearTimeout(state.timerId);
            state.timerId = null;
          }
          startPlaybackLoop();
        } else {
          emitRender(currentChunkIndicesAt(state.currentIndex));
        }
      }
    }
    function setChunkSize(n) {
      if (state.mode === "chunk")
        return;
      state.chunkSize = n;
      persist("sr_chunk", String(n));
      if (callbacks.onChunkSizeChange)
        callbacks.onChunkSizeChange(n);
      if (!state.doc || !state.doc.words.length)
        return;
      if (state.playing) {
        if (state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
        }
        startPlaybackLoop();
      } else {
        emitRender(currentChunkIndicesAt(state.currentIndex));
      }
    }
    function loadText(raw) {
      pausePlayback();
      hideEndCard();
      var doc = tokenizeText(raw);
      state.doc = doc;
      state.currentIndex = 0;
      state.activePlayMs = 0;
      state.phraseChunks = chunkPhrases(doc);
      var hasWords = doc.words.length > 0;
      if (callbacks.onDocLoaded)
        callbacks.onDocLoaded(doc, hasWords);
      if (hasWords) {
        emitRender(currentChunkIndicesAt(0));
      } else {
        emitProgress();
      }
      return doc;
    }
    return {
      loadText,
      setMode,
      setChunkSize,
      setWpm,
      adjustWpm,
      togglePlay,
      restart,
      rerunFromStart,
      jumpToIndex,
      forwardSentence,
      backSentence,
      getWpm: function() {
        return state.wpm;
      }
    };
  }

  // src/ui/reader.js
  var WPM_MIN2 = 100;
  var WPM_MAX2 = 900;
  var STAGE_TEMPLATE = "" + `<div class="mode-row">
` + `  <div class="segmented" id="modeSwitch" role="group" aria-label="Reading mode">
` + `    <button type="button" data-mode="rsvp" class="active" aria-pressed="true">RSVP</button>
` + `    <button type="button" data-mode="chunk" aria-pressed="false">Chunk</button>
` + `    <button type="button" data-mode="pacer" aria-pressed="false">Pacer</button>
` + `  </div>
` + `</div>
` + `
` + `<section class="card stage-card">
` + `  <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
` + `
` + `  <div class="stage" id="stage">
` + `    <p class="stage-hint" id="stageHint" hidden>Add some text below and press Load text to begin.</p>
` + `
` + `    <div class="rsvp-view" id="rsvpView">
` + `      <div class="crosshair top"></div>
` + `      <div class="crosshair bottom"></div>
` + `      <div class="pivot-grid" id="pivotGrid">
` + `        <span class="pivot-cell before" id="pivotBefore"></span><span class="pivot-cell pivot" id="pivotPivot"></span><span class="pivot-cell after" id="pivotAfter"></span>
` + `      </div>
` + `      <div class="multi-word" id="multiWord" hidden></div>
` + `    </div>
` + `
` + `    <div class="chunk-view" id="chunkView" hidden>
` + `      <div class="chunk-phrase" id="chunkPhraseText"></div>
` + `    </div>
` + `
` + `    <div class="pacer-wrap" id="pacerWrap" hidden>
` + `      <div class="pacer-text" id="pacerText"></div>
` + `    </div>
` + `
` + `    <div class="countdown-overlay" id="countdownOverlay" hidden>3</div>
` + `
` + `    <div class="end-card" id="endCard" hidden>
` + `      <div class="end-card-inner">
` + `        <h2>Session complete</h2>
` + `        <div class="end-stats">
` + `          <div class="end-stat"><span class="value" id="endWords">0</span><span class="label">Words</span></div>
` + `          <div class="end-stat"><span class="value" id="endTime">0:00</span><span class="label">Reading time</span></div>
` + `          <div class="end-stat"><span class="value" id="endWpm">0</span><span class="label">Effective wpm</span></div>
` + `        </div>
` + `        <p class="end-nudge">Before you rate the speed, say out loud in two sentences what the text argued. If you cannot, drop the wpm by 50 and rerun.</p>
` + `        <div class="end-actions">
` + `          <button type="button" class="btn-primary" id="btnReadAgain">Read again</button>
` + `          <button type="button" class="btn-secondary" id="btnSlowerRerun">Slower rerun</button>
` + `        </div>
` + `      </div>
` + `    </div>
` + `  </div>
` + `
` + `  <div class="word-readout" id="wordReadout" aria-live="polite">Word 0 / 0</div>
` + `</section>
` + `
` + `<section class="card control-bar">
` + `  <div class="transport">
` + `    <button type="button" class="icon-btn" id="btnRestart" title="Restart" aria-label="Restart">&#8634;</button>
` + `    <button type="button" class="icon-btn" id="btnBack" title="Back one sentence" aria-label="Back one sentence">&#9664;&#9664;</button>
` + `    <button type="button" class="icon-btn play-btn" id="btnPlay" title="Play" aria-label="Play">&#9654;</button>
` + `    <button type="button" class="icon-btn" id="btnForward" title="Forward one sentence" aria-label="Forward one sentence">&#9654;&#9654;</button>
` + `  </div>
` + `
` + `  <div class="chunk-size-group">
` + `    <div class="segmented" id="chunkSwitch" role="group" aria-label="Chunk size">
` + `      <button type="button" data-chunk="1" class="active" aria-pressed="true">1</button>
` + `      <button type="button" data-chunk="2" aria-pressed="false">2</button>
` + `      <button type="button" data-chunk="3" aria-pressed="false">3</button>
` + `    </div>
` + `    <span class="chunk-size-note" id="chunkSizeNote" hidden>3 to 5 by phrase</span>
` + `  </div>
` + `
` + `  <div class="wpm-control">
` + `    <input type="range" id="wpmSlider" min="100" max="900" step="25" value="300" aria-label="Words per minute">
` + `    <span class="wpm-label" id="wpmValue">300 wpm</span>
` + `  </div>
` + "</section>";
  function readSavedWpm(raw) {
    var n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= WPM_MIN2 && n <= WPM_MAX2 ? n : 300;
  }
  function readSavedChunkSize(raw) {
    var n = parseInt(raw, 10);
    return n === 1 || n === 2 || n === 3 ? n : 1;
  }
  function readSavedMode(raw) {
    return raw === "rsvp" || raw === "chunk" || raw === "pacer" ? raw : "rsvp";
  }
  function splitWordsForPacer(text) {
    return text.split(/\s+/).filter(function(w) {
      return w.length > 0;
    });
  }
  async function mount(container, options) {
    var storage = options.storage;
    var keyEventTarget = options.keyEventTarget;
    var initialText = options.initialText || {};
    container.innerHTML = STAGE_TEMPLATE;
    var modeSwitchEl = container.querySelector("#modeSwitch");
    var chunkSwitchEl = container.querySelector("#chunkSwitch");
    var progressFillEl = container.querySelector("#progressFill");
    var stageHintEl = container.querySelector("#stageHint");
    var rsvpViewEl = container.querySelector("#rsvpView");
    var pivotGridEl = container.querySelector("#pivotGrid");
    var pivotBeforeEl = container.querySelector("#pivotBefore");
    var pivotPivotEl = container.querySelector("#pivotPivot");
    var pivotAfterEl = container.querySelector("#pivotAfter");
    var multiWordEl = container.querySelector("#multiWord");
    var chunkViewEl = container.querySelector("#chunkView");
    var chunkPhraseTextEl = container.querySelector("#chunkPhraseText");
    var chunkSizeNoteEl = container.querySelector("#chunkSizeNote");
    var pacerWrapEl = container.querySelector("#pacerWrap");
    var pacerTextEl = container.querySelector("#pacerText");
    var countdownOverlayEl = container.querySelector("#countdownOverlay");
    var endCardEl = container.querySelector("#endCard");
    var endWordsEl = container.querySelector("#endWords");
    var endTimeEl = container.querySelector("#endTime");
    var endWpmEl = container.querySelector("#endWpm");
    var btnReadAgain = container.querySelector("#btnReadAgain");
    var btnSlowerRerun = container.querySelector("#btnSlowerRerun");
    var wordReadoutEl = container.querySelector("#wordReadout");
    var btnRestart = container.querySelector("#btnRestart");
    var btnBack = container.querySelector("#btnBack");
    var btnPlay = container.querySelector("#btnPlay");
    var btnForward = container.querySelector("#btnForward");
    var wpmSlider = container.querySelector("#wpmSlider");
    var wpmValueEl = container.querySelector("#wpmValue");
    var modeButtons = modeSwitchEl.querySelectorAll("button");
    var chunkButtons = chunkSwitchEl.querySelectorAll("button");
    var pacerSpans = [];
    var highlightedEls = [];
    var currentDoc = null;
    function onPacerWordClick(e) {
      var idx = Number(e.currentTarget.dataset.idx);
      player.jumpToIndex(idx);
    }
    function buildPacerDom(doc) {
      pacerTextEl.textContent = "";
      pacerSpans = new Array(doc.words.length);
      highlightedEls = [];
      var idx = 0;
      doc.paragraphs.forEach(function(paraText) {
        var p = document.createElement("p");
        var ws = splitWordsForPacer(paraText);
        ws.forEach(function(w, i) {
          var span = document.createElement("span");
          span.className = "pw";
          span.textContent = w;
          span.dataset.idx = String(idx);
          span.addEventListener("click", onPacerWordClick);
          p.appendChild(span);
          pacerSpans[idx] = span;
          idx++;
          if (i < ws.length - 1)
            p.appendChild(document.createTextNode(" "));
        });
        pacerTextEl.appendChild(p);
      });
    }
    function ensureVisible(firstEl, lastEl) {
      var wrapRect = pacerWrapEl.getBoundingClientRect();
      var firstRect = firstEl.getBoundingClientRect();
      var lastRect = lastEl.getBoundingClientRect();
      var relTop = firstRect.top - wrapRect.top;
      var relBottom = lastRect.bottom - wrapRect.top;
      var third = wrapRect.height / 3;
      if (relTop < third || relBottom > third * 2) {
        var mid = relTop + (relBottom - relTop) / 2;
        var targetScrollTop = pacerWrapEl.scrollTop + mid - wrapRect.height / 2;
        pacerWrapEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
      }
    }
    function renderRsvpChunk(chunkIndices, view) {
      var word = currentDoc.words[chunkIndices[0]];
      if (view.chunkSize === 1) {
        var orpIdx = getOrpIndex(word.length);
        pivotBeforeEl.textContent = word.slice(0, orpIdx);
        pivotPivotEl.textContent = word.charAt(orpIdx) || "";
        pivotAfterEl.textContent = word.slice(orpIdx + 1);
        pivotGridEl.hidden = false;
        multiWordEl.hidden = true;
      } else {
        var text = chunkIndices.map(function(i) {
          return currentDoc.words[i];
        }).join(" ");
        multiWordEl.textContent = text;
        pivotGridEl.hidden = true;
        multiWordEl.hidden = false;
      }
    }
    function renderPhraseChunk(chunkIndices) {
      var text = chunkIndices.map(function(i) {
        return currentDoc.words[i];
      }).join(" ");
      chunkPhraseTextEl.textContent = text;
    }
    function renderPacerChunk(chunkIndices) {
      highlightedEls.forEach(function(el) {
        el.classList.remove("current");
      });
      highlightedEls = chunkIndices.map(function(i) {
        return pacerSpans[i];
      }).filter(Boolean);
      highlightedEls.forEach(function(el) {
        el.classList.add("current");
      });
      if (highlightedEls.length) {
        ensureVisible(highlightedEls[0], highlightedEls[highlightedEls.length - 1]);
      }
    }
    function showActiveView(mode) {
      rsvpViewEl.hidden = mode !== "rsvp";
      chunkViewEl.hidden = mode !== "chunk";
      pacerWrapEl.hidden = mode !== "pacer";
    }
    function updateChunkControlsForMode(mode) {
      var isChunkMode = mode === "chunk";
      chunkButtons.forEach(function(b) {
        b.disabled = isChunkMode;
        b.setAttribute("aria-disabled", isChunkMode ? "true" : "false");
      });
      chunkSizeNoteEl.hidden = !isChunkMode;
    }
    function updateWpmLabel(wpm) {
      wpmValueEl.textContent = wpm + " wpm";
    }
    var savedMode = readSavedMode(await storage.get("sr_mode"));
    var savedChunkSize = readSavedChunkSize(await storage.get("sr_chunk"));
    var savedWpm = readSavedWpm(await storage.get("sr_wpm"));
    var player = createPlayer({
      storage,
      initial: { mode: savedMode, chunkSize: savedChunkSize, wpm: savedWpm },
      callbacks: {
        onDocLoaded: function(doc, hasWords) {
          currentDoc = doc;
          buildPacerDom(doc);
          btnPlay.disabled = !hasWords;
          btnBack.disabled = !hasWords;
          btnForward.disabled = !hasWords;
          btnRestart.disabled = !hasWords;
          stageHintEl.hidden = hasWords;
        },
        onRender: function(chunkIndices, view) {
          if (view.mode === "rsvp") {
            renderRsvpChunk(chunkIndices, view);
          } else if (view.mode === "chunk") {
            renderPhraseChunk(chunkIndices);
          } else {
            renderPacerChunk(chunkIndices);
          }
        },
        onProgress: function(progress) {
          var total = progress.total;
          var current = progress.current;
          progressFillEl.style.width = (total ? current / total * 100 : 0) + "%";
          wordReadoutEl.textContent = "Word " + current.toLocaleString() + " / " + total.toLocaleString();
        },
        onPlayStateChange: function(playing) {
          btnPlay.textContent = playing ? "❚❚" : "▶";
          btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
          btnPlay.title = playing ? "Pause" : "Play";
        },
        onCountdownTick: function(text) {
          countdownOverlayEl.hidden = false;
          countdownOverlayEl.textContent = text;
        },
        onCountdownDone: function() {
          countdownOverlayEl.hidden = true;
        },
        onModeChange: function(mode) {
          modeButtons.forEach(function(b) {
            var active = b.dataset.mode === mode;
            b.classList.toggle("active", active);
            b.setAttribute("aria-pressed", active ? "true" : "false");
          });
          showActiveView(mode);
          updateChunkControlsForMode(mode);
        },
        onChunkSizeChange: function(n) {
          chunkButtons.forEach(function(b) {
            var active = Number(b.dataset.chunk) === n;
            b.classList.toggle("active", active);
            b.setAttribute("aria-pressed", active ? "true" : "false");
          });
        },
        onWpmChange: function(wpm) {
          wpmSlider.value = String(wpm);
          updateWpmLabel(wpm);
        },
        onHideEndCard: function(hasWords) {
          endCardEl.hidden = true;
          btnPlay.disabled = !hasWords;
        },
        onFinish: function(stats) {
          endWordsEl.textContent = stats.totalWords.toLocaleString();
          endTimeEl.textContent = formatDuration(stats.activePlayMs);
          endWpmEl.textContent = stats.effectiveWpm.toLocaleString();
          endCardEl.hidden = false;
          btnPlay.disabled = true;
          progressFillEl.style.width = "100%";
          wordReadoutEl.textContent = "Word " + stats.totalWords.toLocaleString() + " / " + stats.totalWords.toLocaleString();
        }
      }
    });
    modeButtons.forEach(function(b) {
      var active = b.dataset.mode === savedMode;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    chunkButtons.forEach(function(b) {
      var active = Number(b.dataset.chunk) === savedChunkSize;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    showActiveView(savedMode);
    updateChunkControlsForMode(savedMode);
    wpmSlider.value = String(savedWpm);
    updateWpmLabel(savedWpm);
    modeButtons.forEach(function(b) {
      b.addEventListener("click", function() {
        player.setMode(b.dataset.mode);
        b.blur();
      });
    });
    chunkButtons.forEach(function(b) {
      b.addEventListener("click", function() {
        player.setChunkSize(Number(b.dataset.chunk));
        b.blur();
      });
    });
    btnPlay.addEventListener("click", function() {
      player.togglePlay();
      btnPlay.blur();
    });
    btnRestart.addEventListener("click", function() {
      player.restart();
      btnRestart.blur();
    });
    btnBack.addEventListener("click", function() {
      player.backSentence();
      btnBack.blur();
    });
    btnForward.addEventListener("click", function() {
      player.forwardSentence();
      btnForward.blur();
    });
    wpmSlider.addEventListener("input", function() {
      player.setWpm(Number(wpmSlider.value));
    });
    wpmSlider.addEventListener("change", function() {
      wpmSlider.blur();
    });
    btnReadAgain.addEventListener("click", function() {
      player.rerunFromStart();
      btnReadAgain.blur();
    });
    btnSlowerRerun.addEventListener("click", function() {
      player.rerunFromStart(player.getWpm() - 50);
      btnSlowerRerun.blur();
    });
    keyEventTarget.addEventListener("keydown", function(e) {
      var ae = keyEventTarget.activeElement;
      if (ae && ae.tagName === "TEXTAREA")
        return;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        player.togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.backSentence();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        player.forwardSentence();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        player.adjustWpm(25);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        player.adjustWpm(-25);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        player.restart();
      }
    });
    player.loadText(initialText.text || "");
    return {
      loadText: function(text) {
        return player.loadText(text);
      },
      getTitle: function() {
        return initialText.title || null;
      }
    };
  }

  // src/extension/content-main.js
  var import_readability = __toESM(require_readability(), 1);

  // src/ui/reader.css
  var reader_default = `:root {
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-serif: Georgia, "Iowan Old Style", serif;
  --radius: 14px;
  --radius-sm: 9px;
  color-scheme: light dark;
}

html, html[data-theme="light"] {
  --bg: #f7f5f0;
  --bg-elev: #ffffff;
  --bg-card: #ffffff;
  --text: #201d1a;
  --text-dim: #635e55;
  --border: #e2ddd3;
  --accent-pivot: #cf4520;
  --accent-control: #147888;
  --accent-control-ink: #ffffff;
  --shadow: rgba(20, 16, 10, 0.10);
  --highlight-bg: rgba(20, 120, 136, 0.16);
  --overlay-bg: rgba(247, 245, 240, 0.92);
  --end-card-bg: #f7f5f0;
}

@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) {
    --bg: #14161a;
    --bg-elev: #1b1e24;
    --bg-card: #1f232a;
    --text: #eae7e0;
    --text-dim: #9ea4ae;
    --border: #2c313a;
    --accent-pivot: #ff6f47;
    --accent-control: #4fb8c4;
    --accent-control-ink: #08282c;
    --shadow: rgba(0, 0, 0, 0.45);
    --highlight-bg: rgba(79, 184, 196, 0.20);
    --overlay-bg: rgba(20, 22, 26, 0.90);
    --end-card-bg: #14161a;
  }
}

html[data-theme="dark"] {
  --bg: #14161a;
  --bg-elev: #1b1e24;
  --bg-card: #1f232a;
  --text: #eae7e0;
  --text-dim: #9ea4ae;
  --border: #2c313a;
  --accent-pivot: #ff6f47;
  --accent-control: #4fb8c4;
  --accent-control-ink: #08282c;
  --shadow: rgba(0, 0, 0, 0.45);
  --highlight-bg: rgba(79, 184, 196, 0.20);
  --overlay-bg: rgba(20, 22, 26, 0.90);
  --end-card-bg: #14161a;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  transition: background-color 0.2s ease, color 0.2s ease;
}

button, input {
  font-family: inherit;
  color: inherit;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.app-header h1 {
  font-size: 1.15rem;
  margin: 0;
  letter-spacing: 0.01em;
  font-weight: 700;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, transform 0.1s ease;
}
.icon-btn:hover { background: var(--bg-card); }
.icon-btn:active { transform: scale(0.94); }

.app-main {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 1px 3px var(--shadow);
  padding: 1.1rem 1.25rem;
}

.segmented {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 999px;
}

.segmented button {
  border: none;
  background: transparent;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.segmented button.active {
  background: var(--accent-control);
  color: var(--accent-control-ink);
}
.segmented button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chunk-size-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.chunk-size-note {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.mode-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-card {
  padding: 0;
  overflow: hidden;
}

.progress-track {
  height: 3px;
  background: var(--border);
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: var(--accent-control);
  transition: width 0.1s linear;
}

.stage {
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.25rem;
}

.stage-hint {
  color: var(--text-dim);
  font-size: 0.95rem;
  text-align: center;
  max-width: 32ch;
}

/* RSVP view */
.rsvp-view {
  width: 100%;
  height: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.rsvp-view[hidden] { display: none; }

.crosshair {
  position: absolute;
  left: 50%;
  width: 2px;
  background: var(--text-dim);
  opacity: 0.45;
  transform: translateX(-50%);
}
.crosshair.top { top: 14px; height: 16px; }
.crosshair.bottom { bottom: 14px; height: 16px; }

.pivot-grid {
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: clamp(1.8rem, 5vw, 3rem);
}
.pivot-cell {
  white-space: nowrap;
  overflow: visible;
}
.pivot-cell.before { width: 12ch; text-align: right; }
.pivot-cell.pivot {
  width: 1.15ch;
  text-align: center;
  color: var(--accent-pivot);
  font-weight: 700;
}
.pivot-cell.after { width: 12ch; text-align: left; }

.multi-word {
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 4.5vw, 2.5rem);
  text-align: center;
  padding: 0 0.5rem;
}

/* Chunk view */
.chunk-view {
  width: 100%;
  height: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
}
.chunk-view[hidden] { display: none; }

.chunk-phrase {
  font-family: var(--font-serif);
  font-size: clamp(1.8rem, 4.2vw, 2.2rem);
  text-align: center;
  line-height: 1.35;
  max-width: 34ch;
}

/* Pacer view */
.pacer-wrap {
  width: 100%;
  max-height: 360px;
  overflow-y: auto;
  padding: 0.25rem 0.25rem 0.25rem 0;
}
.pacer-wrap[hidden] { display: none; }

.pacer-text {
  max-width: 65ch;
  margin: 0 auto;
  font-family: var(--font-serif);
  font-size: 1.15rem;
  line-height: 1.75;
  padding: 0.5rem 0.75rem;
}
.pacer-text p { margin: 0 0 1.2em; }
.pacer-text p:last-child { margin-bottom: 0; }

.pw {
  cursor: pointer;
  border-radius: 4px;
  padding: 0.03em 0.05em;
  transition: background-color 0.12s ease;
}
.pw:hover { background: var(--border); }
.pw.current {
  background: var(--highlight-bg);
  box-shadow: 0 0 0 1px var(--accent-control);
}

/* Countdown */
.countdown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-bg);
  font-family: var(--font-serif);
  font-size: 3.5rem;
  font-weight: 700;
  color: var(--accent-control);
}
.countdown-overlay[hidden] { display: none; }

/* End card */
.end-card {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--end-card-bg);
  padding: 1.5rem;
}
.end-card[hidden] { display: none; }
.end-card-inner {
  max-width: 40ch;
  text-align: center;
}
.end-card-inner h2 {
  margin: 0 0 0.75rem;
  font-size: 1.3rem;
}
.end-stats {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 1rem 0;
}
.end-stat { display: flex; flex-direction: column; }
.end-stat .value { font-size: 1.4rem; font-weight: 700; color: var(--accent-control); }
.end-stat .label { font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; }
.end-nudge {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 1rem 0;
  line-height: 1.5;
}
.end-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
  flex-wrap: wrap;
}

.word-readout {
  padding: 0.5rem 1.25rem 0.9rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
}

/* Control bar */
.control-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  justify-content: space-between;
}

.transport {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.transport .icon-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

.transport .play-btn {
  width: 48px;
  height: 48px;
  background: var(--accent-control);
  color: var(--accent-control-ink);
  border-color: var(--accent-control);
  font-size: 1.2rem;
}

.wpm-control {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1 1 220px;
  min-width: 180px;
}
.wpm-control input[type="range"] {
  flex: 1;
  accent-color: var(--accent-control);
}
.wpm-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-dim);
  min-width: 6.5ch;
  text-align: right;
}

/* Text panel */
.text-panel summary {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
}
.text-panel summary::-webkit-details-marker { display: none; }
.text-panel summary .chev {
  display: inline-block;
  transition: transform 0.15s ease;
  color: var(--text-dim);
}
.text-panel[open] summary .chev { transform: rotate(90deg); }

.text-panel-body {
  margin-top: 0.9rem;
}

textarea {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: 0.75rem;
  font-size: 0.92rem;
  line-height: 1.5;
}

.text-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.6rem;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.word-count {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.btn-primary {
  border: 1px solid var(--accent-control);
  background: var(--accent-control);
  color: var(--accent-control-ink);
  border-radius: 999px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-primary:hover { filter: brightness(1.05); }

.btn-secondary {
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--text);
  border-radius: 999px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-secondary:hover { background: var(--bg-card); }

@media (max-width: 480px) {
  .app-header { padding: 0.85rem 1rem; }
  .app-main { padding: 1rem 0.75rem 2.5rem; gap: 1rem; }
  .card { padding: 0.9rem; }
  .pivot-cell.before, .pivot-cell.after { width: 7ch; }
  .pivot-grid { font-size: clamp(1.4rem, 8vw, 2rem); }
  .multi-word { font-size: clamp(1.2rem, 6.5vw, 1.8rem); }
  .chunk-phrase { font-size: clamp(1.3rem, 6.5vw, 1.7rem); }
  .control-bar { justify-content: center; }
  .wpm-control { flex-basis: 100%; }
  .end-stats { gap: 0.9rem; }
}
`;

  // src/extension/overlay.css
  var overlay_default = `/* Extension-only overlay chrome, injected into the closed shadow root
   alongside src/ui/reader.css (which is imported as text and injected
   unmodified). reader.css themes itself through selectors on the real
   page's html/body element, which do not exist inside a shadow tree, so
   this file re-declares the same theme variables scoped to :host, then
   supplies the scrim, card, and header chrome that only the overlay
   needs. Nothing here changes reader.css or src/ui behavior. */

:host {
  all: initial;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: block;
  font-family: var(--font-ui);
  color-scheme: light dark;

  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-serif: Georgia, "Iowan Old Style", serif;
  --radius: 14px;
  --radius-sm: 9px;
}

:host,
:host([data-theme="light"]) {
  --bg: #f7f5f0;
  --bg-elev: #ffffff;
  --bg-card: #ffffff;
  --text: #201d1a;
  --text-dim: #635e55;
  --border: #e2ddd3;
  --accent-pivot: #cf4520;
  --accent-control: #147888;
  --accent-control-ink: #ffffff;
  --shadow: rgba(20, 16, 10, 0.10);
  --highlight-bg: rgba(20, 120, 136, 0.16);
  --overlay-bg: rgba(247, 245, 240, 0.92);
  --end-card-bg: #f7f5f0;
}

@media (prefers-color-scheme: dark) {
  :host(:not([data-theme="light"])) {
    --bg: #14161a;
    --bg-elev: #1b1e24;
    --bg-card: #1f232a;
    --text: #eae7e0;
    --text-dim: #9ea4ae;
    --border: #2c313a;
    --accent-pivot: #ff6f47;
    --accent-control: #4fb8c4;
    --accent-control-ink: #08282c;
    --shadow: rgba(0, 0, 0, 0.45);
    --highlight-bg: rgba(79, 184, 196, 0.20);
    --overlay-bg: rgba(20, 22, 26, 0.90);
    --end-card-bg: #14161a;
  }
}

:host([data-theme="dark"]) {
  --bg: #14161a;
  --bg-elev: #1b1e24;
  --bg-card: #1f232a;
  --text: #eae7e0;
  --text-dim: #9ea4ae;
  --border: #2c313a;
  --accent-pivot: #ff6f47;
  --accent-control: #4fb8c4;
  --accent-control-ink: #08282c;
  --shadow: rgba(0, 0, 0, 0.45);
  --highlight-bg: rgba(79, 184, 196, 0.20);
  --overlay-bg: rgba(20, 22, 26, 0.90);
  --end-card-bg: #14161a;
}

*, *::before, *::after { box-sizing: border-box; }

.sr-ext-scrim {
  position: fixed;
  inset: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 4vh 1rem;
}

.sr-ext-card {
  width: 100%;
  max-width: 900px;
  margin: auto;
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 40px var(--shadow);
  font-family: var(--font-ui);
  overflow: hidden;
}
.sr-ext-card:focus { outline: none; }

.sr-ext-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.1rem;
  border-bottom: 1px solid var(--border);
}

.sr-ext-header-main {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.sr-ext-rung {
  display: inline-block;
  align-self: flex-start;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent-control-ink);
  background: var(--accent-control);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

.sr-ext-title {
  font-size: 1rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sr-ext-meta {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.sr-ext-header-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.sr-ext-pick {
  min-height: 34px;
  padding: 0.45rem 0.8rem;
  border: 1px solid var(--accent-control);
  border-radius: 999px;
  background: var(--accent-control);
  color: var(--accent-control-ink);
  font: 700 0.78rem/1 var(--font-ui);
  cursor: pointer;
  transition: filter 0.15s ease;
}
.sr-ext-pick:hover { filter: brightness(1.08); }
.sr-ext-pick:focus-visible {
  outline: 2px solid var(--accent-pivot);
  outline-offset: 2px;
}

.sr-ext-close {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--text);
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}
.sr-ext-close:hover { background: var(--bg-card); }

.sr-ext-empty {
  padding: 2.75rem 1.5rem;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.98rem;
  line-height: 1.5;
}
.sr-ext-empty[hidden] { display: none; }

.sr-ext-reader-root {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.1rem 1.1rem 1.35rem;
}
.sr-ext-reader-root[hidden] { display: none; }

@media (max-width: 480px) {
  .sr-ext-scrim { padding: 0; }
  .sr-ext-card { max-width: 100%; border-radius: 0; min-height: 100vh; }
  .sr-ext-header { gap: 0.65rem; }
  .sr-ext-pick { padding-inline: 0.65rem; }
}
`;

  // src/extension/content-main.js
  (function() {
    if (window.__SPEED_READER_CONTENT_LOADED__) {
      return;
    }
    window.__SPEED_READER_CONTENT_LOADED__ = true;
    var WPM_MIN3 = 100;
    var WPM_MAX3 = 900;
    var READER_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1 };
    var BLOCK_TAGS = {
      P: 1,
      H1: 1,
      H2: 1,
      H3: 1,
      H4: 1,
      H5: 1,
      H6: 1,
      LI: 1,
      BLOCKQUOTE: 1,
      PRE: 1
    };
    var SKIP_TAGS = { NAV: 1, FOOTER: 1, ASIDE: 1, SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };
    var hostEl = null;
    var shadow = null;
    var cardEl = null;
    var overlayRefs = null;
    var readerHandle = null;
    var readerMountPromise = null;
    var prevOverflow = null;
    var docKeydownGuard = null;
    var picking = false;
    var pickerHadOverlay = false;
    var pickerHostEl = null;
    var pickerHighlightEl = null;
    var pickerTagEl = null;
    var currentTarget = null;
    var pickerResumePlayback = false;
    var lifecycleVersion = 0;
    function isReaderKey(e) {
      if (e.key === " " || e.key === "Spacebar")
        return true;
      if (e.key === "r" || e.key === "R")
        return true;
      if (e.key === "Escape" || e.key === "Esc")
        return true;
      return !!READER_KEYS[e.key];
    }
    function collapseWhitespace(s) {
      return s.replace(/\s+/g, " ").trim();
    }
    function paragraphsFromHtml(html) {
      var container = document.createElement("div");
      container.innerHTML = html;
      var paras = [];
      function walk(node) {
        var children = node.children;
        for (var i = 0;i < children.length; i++) {
          var el = children[i];
          if (BLOCK_TAGS[el.tagName]) {
            var t = collapseWhitespace(el.textContent || "");
            if (t)
              paras.push(t);
          } else {
            walk(el);
          }
        }
      }
      walk(container);
      if (paras.length)
        return paras.join(`

`);
      return collapseWhitespace(container.textContent || "");
    }
    function collectParagraphs(root) {
      if (!root)
        return "";
      if (SKIP_TAGS[root.tagName])
        return "";
      var paras = [];
      function collect(el) {
        if (SKIP_TAGS[el.tagName])
          return;
        if (BLOCK_TAGS[el.tagName]) {
          var t = collapseWhitespace(el.innerText || el.textContent || "");
          if (t)
            paras.push(t);
          return;
        }
        var children = el.children;
        for (var i = 0;i < children.length; i++)
          collect(children[i]);
      }
      collect(root);
      if (paras.length)
        return paras.join(`

`);
      return collapseWhitespace(root.innerText || root.textContent || "");
    }
    function extractFallbackText() {
      var root = document.querySelector("main") || document.querySelector("article") || document.querySelector("[role=main]") || document.body;
      return collectParagraphs(root);
    }
    function extractFromElement(el) {
      return {
        rung: 4,
        rungLabel: "Element",
        title: document.title || null,
        text: collectParagraphs(el)
      };
    }
    function runExtraction() {
      var sel = window.getSelection();
      var selText = sel && !sel.isCollapsed ? sel.toString() : "";
      if (selText && selText.trim()) {
        return { rung: 1, rungLabel: "Selection", title: document.title || null, text: selText };
      }
      try {
        var cloneDoc = document.cloneNode(true);
        var article = new import_readability.default(cloneDoc).parse();
        if (article && article.textContent && collapseWhitespace(article.textContent).length > 0) {
          var text = paragraphsFromHtml(article.content || "") || collapseWhitespace(article.textContent);
          return {
            rung: 2,
            rungLabel: "Readability",
            title: article.title || document.title || null,
            text
          };
        }
      } catch (err) {}
      var fallbackText = extractFallbackText();
      if (fallbackText && fallbackText.trim()) {
        return { rung: 3, rungLabel: "Fallback", title: document.title || null, text: fallbackText };
      }
      return { rung: 0, rungLabel: null, title: null, text: "" };
    }
    function createChromeStorageAdapter() {
      return {
        get: function(key) {
          return new Promise(function(resolve) {
            try {
              chrome.storage.sync.get([key], function(result) {
                if (chrome.runtime.lastError || !result) {
                  resolve(null);
                  return;
                }
                resolve(Object.prototype.hasOwnProperty.call(result, key) ? result[key] : null);
              });
            } catch (err) {
              resolve(null);
            }
          });
        },
        set: function(key, value) {
          try {
            var obj = {};
            obj[key] = value;
            chrome.storage.sync.set(obj);
          } catch (err) {}
        }
      };
    }
    function readStoredWpm() {
      return new Promise(function(resolve) {
        try {
          chrome.storage.sync.get(["sr_wpm"], function(result) {
            var n = result && parseInt(result.sr_wpm, 10);
            resolve(typeof n === "number" && Number.isFinite(n) && n >= WPM_MIN3 && n <= WPM_MAX3 ? n : 300);
          });
        } catch (err) {
          resolve(300);
        }
      });
    }
    function readStoredTheme() {
      return new Promise(function(resolve) {
        try {
          chrome.storage.sync.get(["sr_theme"], function(result) {
            var t = result && result.sr_theme;
            resolve(t === "light" || t === "dark" ? t : null);
          });
        } catch (err) {
          resolve(null);
        }
      });
    }
    function formatMeta(wordCount, wpm) {
      var minutes = wpm > 0 ? wordCount / wpm : 0;
      var rounded = Math.max(1, Math.round(minutes));
      var wordLabel = wordCount.toLocaleString() + (wordCount === 1 ? " word" : " words");
      var minuteLabel = rounded + (rounded === 1 ? " minute" : " minutes");
      return wordLabel + ", about " + minuteLabel + " at " + wpm + " wpm";
    }
    function teardownOverlay(restoreScroll) {
      if (docKeydownGuard) {
        document.removeEventListener("keydown", docKeydownGuard, true);
        docKeydownGuard = null;
      }
      if (restoreScroll && prevOverflow !== null) {
        document.documentElement.style.overflow = prevOverflow;
        prevOverflow = null;
      }
      if (hostEl) {
        hostEl.remove();
      }
      hostEl = null;
      shadow = null;
      cardEl = null;
      overlayRefs = null;
      readerHandle = null;
      readerMountPromise = null;
    }
    function closeOverlay() {
      lifecycleVersion++;
      teardownOverlay(true);
    }
    function buildOverlayDom() {
      hostEl = document.createElement("div");
      hostEl.setAttribute("data-speed-reader-overlay", "");
      hostEl.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647;";
      document.documentElement.appendChild(hostEl);
      shadow = hostEl.attachShadow({ mode: "closed" });
      var styleEl = document.createElement("style");
      styleEl.textContent = reader_default + `
` + overlay_default;
      shadow.appendChild(styleEl);
      var scrimEl = document.createElement("div");
      scrimEl.className = "sr-ext-scrim";
      cardEl = document.createElement("div");
      cardEl.className = "sr-ext-card";
      cardEl.tabIndex = -1;
      var headerEl = document.createElement("div");
      headerEl.className = "sr-ext-header";
      var headerMainEl = document.createElement("div");
      headerMainEl.className = "sr-ext-header-main";
      var rungEl = document.createElement("span");
      rungEl.className = "sr-ext-rung";
      var titleEl = document.createElement("span");
      titleEl.className = "sr-ext-title";
      var metaEl = document.createElement("span");
      metaEl.className = "sr-ext-meta";
      headerMainEl.appendChild(rungEl);
      headerMainEl.appendChild(titleEl);
      headerMainEl.appendChild(metaEl);
      var headerActionsEl = document.createElement("div");
      headerActionsEl.className = "sr-ext-header-actions";
      var pickBtn = document.createElement("button");
      pickBtn.type = "button";
      pickBtn.className = "sr-ext-pick";
      pickBtn.setAttribute("aria-label", "Pick an element to speed read");
      pickBtn.title = "Pick an element";
      pickBtn.textContent = "Pick element";
      pickBtn.addEventListener("click", startElementPicker);
      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "sr-ext-close";
      closeBtn.setAttribute("aria-label", "Close speed reader");
      closeBtn.title = "Close";
      closeBtn.textContent = String.fromCharCode(215);
      closeBtn.addEventListener("click", closeOverlay);
      headerActionsEl.appendChild(pickBtn);
      headerActionsEl.appendChild(closeBtn);
      headerEl.appendChild(headerMainEl);
      headerEl.appendChild(headerActionsEl);
      var emptyEl = document.createElement("div");
      emptyEl.className = "sr-ext-empty";
      emptyEl.hidden = true;
      emptyEl.textContent = "Nothing readable found, select text instead.";
      var readerRootEl = document.createElement("div");
      readerRootEl.className = "sr-ext-reader-root";
      cardEl.appendChild(headerEl);
      cardEl.appendChild(emptyEl);
      cardEl.appendChild(readerRootEl);
      scrimEl.appendChild(cardEl);
      shadow.appendChild(scrimEl);
      return { rungEl, titleEl, metaEl, emptyEl, readerRootEl };
    }
    function installKeydownGuard() {
      docKeydownGuard = function(e) {
        if (picking)
          return;
        if (!isReaderKey(e))
          return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.key === "Escape" || e.key === "Esc") {
          closeOverlay();
          return;
        }
        if (!shadow)
          return;
        var forwarded = new KeyboardEvent("keydown", {
          key: e.key,
          code: e.code,
          bubbles: true,
          cancelable: true
        });
        shadow.dispatchEvent(forwarded);
      };
      document.addEventListener("keydown", docKeydownGuard, true);
    }
    async function renderExtraction(refs, extraction, renderVersion) {
      var hasText = !!(extraction.text && extraction.text.trim());
      refs.emptyEl.hidden = hasText;
      refs.readerRootEl.hidden = !hasText;
      if (!hasText) {
        if (readerHandle)
          readerHandle.loadText("");
        if (hostEl) {
          hostEl.setAttribute("data-rung", extraction.rungLabel || "Nothing found");
          hostEl.setAttribute("data-word-count", "0");
        }
        refs.rungEl.textContent = extraction.rungLabel || "Nothing found";
        refs.titleEl.textContent = document.title || "";
        refs.metaEl.textContent = "";
        refs.emptyEl.textContent = extraction.rung === 4 ? "Nothing readable in that element, pick another." : "Nothing readable found, select text instead.";
        return;
      }
      var doc = tokenizeText(extraction.text);
      var wpm = await readStoredWpm();
      if (renderVersion !== lifecycleVersion || refs !== overlayRefs)
        return;
      if (hostEl) {
        hostEl.setAttribute("data-rung", extraction.rungLabel);
        hostEl.setAttribute("data-word-count", String(doc.words.length));
      }
      refs.rungEl.textContent = extraction.rungLabel;
      refs.titleEl.textContent = extraction.title || document.title || "Untitled page";
      refs.metaEl.textContent = formatMeta(doc.words.length, wpm);
      if (readerHandle) {
        readerHandle.loadText(extraction.text);
      } else {
        var mountPromise = readerMountPromise;
        if (!mountPromise) {
          var mountShadow = shadow;
          mountPromise = mount(refs.readerRootEl, {
            storage: createChromeStorageAdapter(),
            keyEventTarget: mountShadow,
            initialText: { text: extraction.text, title: extraction.title || document.title || null }
          }).then(function(handle) {
            return { handle, refs, shadow: mountShadow };
          });
          readerMountPromise = mountPromise;
        }
        var mounted = await mountPromise;
        if (readerMountPromise === mountPromise)
          readerMountPromise = null;
        if (mounted.refs !== overlayRefs || mounted.shadow !== shadow) {
          mounted.handle.loadText("");
          return;
        }
        if (renderVersion !== lifecycleVersion || refs !== overlayRefs)
          return;
        readerHandle = mounted.handle;
        readerHandle.loadText(extraction.text);
      }
    }
    async function renderIntoOverlay(extraction) {
      var renderVersion = ++lifecycleVersion;
      var reuseHiddenOverlay = !!(hostEl && hostEl.style.display === "none" && overlayRefs);
      if (hostEl && !reuseHiddenOverlay) {
        teardownOverlay(false);
      }
      if (prevOverflow === null) {
        prevOverflow = document.documentElement.style.overflow;
      }
      document.documentElement.style.overflow = "hidden";
      if (reuseHiddenOverlay) {
        hostEl.style.display = "";
      } else {
        overlayRefs = buildOverlayDom();
        var theme = await readStoredTheme();
        if (renderVersion !== lifecycleVersion)
          return;
        if (theme && hostEl)
          hostEl.setAttribute("data-theme", theme);
      }
      if (!docKeydownGuard)
        installKeydownGuard();
      if (cardEl)
        cardEl.focus({ preventScroll: true });
      await renderExtraction(overlayRefs, extraction, renderVersion);
    }
    function openOverlay() {
      return renderIntoOverlay(runExtraction());
    }
    function pickerLayerCss() {
      return "" + ":host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;" + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}' + "*,*::before,*::after{box-sizing:border-box;}" + ".highlight{display:none;position:fixed;pointer-events:none;border:2px solid #147888;" + "background:rgba(20,120,136,.16);border-radius:3px;}" + ".tag{position:absolute;left:-2px;top:0;transform:translateY(calc(-100% - 4px));" + "max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" + "padding:3px 7px;border-radius:999px;background:#147888;color:#fff;" + 'font:700 11px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' + "letter-spacing:.04em;text-transform:uppercase;box-shadow:0 2px 8px rgba(0,0,0,.22);}" + ".banner{position:fixed;top:16px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 32px);" + "padding:9px 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;" + "background:#173238;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.28);" + 'font:600 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' + "text-align:center;white-space:nowrap;}";
    }
    function buildPickerLayer() {
      pickerHostEl = document.createElement("div");
      pickerHostEl.setAttribute("data-speed-reader-picker", "");
      pickerHostEl.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;";
      document.documentElement.appendChild(pickerHostEl);
      var pickerShadow = pickerHostEl.attachShadow({ mode: "open" });
      var styleEl = document.createElement("style");
      styleEl.textContent = pickerLayerCss();
      pickerHighlightEl = document.createElement("div");
      pickerHighlightEl.className = "highlight";
      pickerHighlightEl.setAttribute("data-speed-reader-highlight", "");
      pickerTagEl = document.createElement("span");
      pickerTagEl.className = "tag";
      pickerHighlightEl.appendChild(pickerTagEl);
      var bannerEl = document.createElement("div");
      bannerEl.className = "banner";
      bannerEl.setAttribute("role", "status");
      bannerEl.textContent = "Click an element to read it. Esc to cancel.";
      pickerShadow.appendChild(styleEl);
      pickerShadow.appendChild(pickerHighlightEl);
      pickerShadow.appendChild(bannerEl);
    }
    function isPickerOwnedElement(el) {
      return !!(!el || el === pickerHostEl || el === hostEl || pickerHostEl && pickerHostEl.contains(el) || hostEl && hostEl.contains(el));
    }
    function updatePickerHighlight(el) {
      if (isPickerOwnedElement(el) || !el.isConnected) {
        currentTarget = null;
        if (pickerHighlightEl)
          pickerHighlightEl.style.display = "none";
        if (pickerHostEl)
          pickerHostEl.removeAttribute("data-target-tag");
        return;
      }
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        currentTarget = null;
        if (pickerHighlightEl)
          pickerHighlightEl.style.display = "none";
        if (pickerHostEl)
          pickerHostEl.removeAttribute("data-target-tag");
        return;
      }
      currentTarget = el;
      var tagName = el.tagName ? el.tagName.toLowerCase() : "element";
      if (pickerTagEl) {
        pickerTagEl.textContent = tagName;
        pickerTagEl.style.top = rect.top < 28 ? "100%" : "0";
        pickerTagEl.style.transform = rect.top < 28 ? "translateY(4px)" : "translateY(calc(-100% - 4px))";
      }
      if (pickerHostEl)
        pickerHostEl.setAttribute("data-target-tag", tagName);
      if (pickerHighlightEl) {
        pickerHighlightEl.style.display = "block";
        pickerHighlightEl.style.left = rect.left + "px";
        pickerHighlightEl.style.top = rect.top + "px";
        pickerHighlightEl.style.width = rect.width + "px";
        pickerHighlightEl.style.height = rect.height + "px";
      }
    }
    function elementAtPoint(clientX, clientY) {
      var el = document.elementFromPoint(clientX, clientY);
      return isPickerOwnedElement(el) ? null : el;
    }
    function onPickerMouseMove(e) {
      updatePickerHighlight(elementAtPoint(e.clientX, e.clientY));
    }
    function onPickerViewportChange() {
      if (currentTarget)
        updatePickerHighlight(currentTarget);
    }
    function blockPickerEvent(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    function onPickerClick(e) {
      blockPickerEvent(e);
      var el = elementAtPoint(e.clientX, e.clientY) || currentTarget;
      if (el)
        finishPick(el);
    }
    function onPickerKeydown(e) {
      if (e.key !== "Escape" && e.key !== "Esc")
        return;
      blockPickerEvent(e);
      cancelPick();
    }
    function installPickerListeners() {
      document.addEventListener("mousemove", onPickerMouseMove, true);
      document.addEventListener("click", onPickerClick, true);
      document.addEventListener("mousedown", blockPickerEvent, true);
      document.addEventListener("mouseup", blockPickerEvent, true);
      document.addEventListener("pointerdown", blockPickerEvent, true);
      document.addEventListener("pointerup", blockPickerEvent, true);
      document.addEventListener("auxclick", blockPickerEvent, true);
      document.addEventListener("contextmenu", blockPickerEvent, true);
      document.addEventListener("keydown", onPickerKeydown, true);
      document.addEventListener("scroll", onPickerViewportChange, true);
      window.addEventListener("resize", onPickerViewportChange);
    }
    function removePickerListeners() {
      document.removeEventListener("mousemove", onPickerMouseMove, true);
      document.removeEventListener("click", onPickerClick, true);
      document.removeEventListener("mousedown", blockPickerEvent, true);
      document.removeEventListener("mouseup", blockPickerEvent, true);
      document.removeEventListener("pointerdown", blockPickerEvent, true);
      document.removeEventListener("pointerup", blockPickerEvent, true);
      document.removeEventListener("auxclick", blockPickerEvent, true);
      document.removeEventListener("contextmenu", blockPickerEvent, true);
      document.removeEventListener("keydown", onPickerKeydown, true);
      document.removeEventListener("scroll", onPickerViewportChange, true);
      window.removeEventListener("resize", onPickerViewportChange);
    }
    function teardownPicker() {
      removePickerListeners();
      if (pickerHostEl)
        pickerHostEl.remove();
      pickerHostEl = null;
      pickerHighlightEl = null;
      pickerTagEl = null;
      currentTarget = null;
      picking = false;
    }
    function suspendReaderForPicker() {
      pickerResumePlayback = false;
      if (!shadow || !readerHandle)
        return;
      var readoutEl = shadow.querySelector("#wordReadout");
      var match = readoutEl && readoutEl.textContent.match(/Word ([\d,]+) \//);
      var currentWord = match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
      if (hostEl)
        hostEl.setAttribute("data-last-picker-paused-word", String(currentWord));
      var playBtn = shadow.querySelector("#btnPlay");
      if (playBtn && playBtn.getAttribute("aria-label") === "Pause") {
        pickerResumePlayback = true;
        if (hostEl)
          hostEl.setAttribute("data-last-picker-resume-playback", "true");
        playBtn.click();
        if (hostEl) {
          hostEl.setAttribute("data-last-picker-player-state", playBtn.getAttribute("aria-label") || "unknown");
        }
        return;
      }
      var countdownEl = shadow.querySelector("#countdownOverlay");
      if (!countdownEl || countdownEl.hidden) {
        if (hostEl)
          hostEl.setAttribute("data-last-picker-resume-playback", "false");
        if (hostEl)
          hostEl.setAttribute("data-last-picker-player-state", "paused");
        return;
      }
      var currentPacerWord = currentWord > 0 ? shadow.querySelector('.pw[data-idx="' + (currentWord - 1) + '"]') : null;
      if (hostEl)
        hostEl.setAttribute("data-last-picker-resume-playback", "false");
      if (currentPacerWord) {
        pickerResumePlayback = true;
        if (hostEl)
          hostEl.setAttribute("data-last-picker-resume-playback", "true");
        currentPacerWord.click();
        if (hostEl) {
          hostEl.setAttribute("data-last-picker-player-state", countdownEl.hidden ? "countdown-paused" : "countdown-active");
        }
      }
    }
    function resumeReaderAfterPicker() {
      var shouldResume = pickerResumePlayback;
      pickerResumePlayback = false;
      if (!shouldResume || !shadow || !readerHandle)
        return;
      var playBtn = shadow.querySelector("#btnPlay");
      if (playBtn)
        playBtn.click();
    }
    function startElementPicker() {
      if (picking) {
        var existingHadOverlay = pickerHadOverlay;
        teardownPicker();
        pickerHadOverlay = existingHadOverlay;
        picking = true;
        buildPickerLayer();
        installPickerListeners();
        return;
      }
      picking = true;
      pickerHadOverlay = !!hostEl;
      if (hostEl) {
        suspendReaderForPicker();
        hostEl.style.display = "none";
        if (prevOverflow !== null) {
          document.documentElement.style.overflow = prevOverflow;
        }
      }
      buildPickerLayer();
      installPickerListeners();
    }
    function finishPick(el) {
      if (!picking || !el)
        return;
      var extraction = extractFromElement(el);
      var hadOverlay = pickerHadOverlay;
      teardownPicker();
      pickerHadOverlay = false;
      pickerResumePlayback = false;
      if (hadOverlay && hostEl) {
        document.documentElement.style.overflow = "hidden";
      }
      renderIntoOverlay(extraction).catch(function(err) {
        console.error("Speed Reader: picked element failed to open.", err);
        if (hostEl)
          hostEl.style.display = "";
      });
    }
    function cancelPick(restorePlayback) {
      if (!picking)
        return;
      var restoreOverlay = pickerHadOverlay;
      teardownPicker();
      pickerHadOverlay = false;
      if (restoreOverlay && hostEl) {
        hostEl.style.display = "";
        document.documentElement.style.overflow = "hidden";
        if (cardEl)
          cardEl.focus({ preventScroll: true });
        if (restorePlayback !== false) {
          resumeReaderAfterPicker();
        } else {
          pickerResumePlayback = false;
        }
      } else {
        pickerResumePlayback = false;
      }
    }
    chrome.runtime.onMessage.addListener(function(message) {
      if (message && (message.kind === "page" || message.kind === "selection")) {
        if (picking)
          cancelPick(false);
        openOverlay().catch(function(err) {
          console.error("Speed Reader: overlay failed to open.", err);
        });
      } else if (message && message.kind === "pick") {
        startElementPicker();
      }
    });
  })();
})();
