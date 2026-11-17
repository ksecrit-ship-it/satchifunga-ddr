(function () {
  "use strict";

  var pageId = document.body.dataset.page || "start";
  var rootAttr = document.body.dataset.root || "";
  var prefix = rootAttr ? rootAttr.replace(/\/$/, "") + "/" : "";
  var mount = document.getElementById("inhalt");

  function ce(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function siteHref(path) {
    if (!path || path === "index.html") return prefix + "index.html";
    return prefix + String(path).replace(/^\//, "");
  }

  function driveUrl(url) {
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== "https:") return null;
      if (parsed.hostname !== "drive.google.com" && parsed.hostname !== "docs.google.com") return null;
      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  function countLabel(count) {
    return count === 1 ? "1 Unterlage" : count + " Unterlagen";
  }

  function zoneById(room, id) {
    return room.zones.filter(function (zone) { return zone.id === id; })[0];
  }

  fetch(prefix + "data/documents.json", { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    })
    .then(render)
    .catch(function () {
      var main = ce("main", "wrap");
      main.appendChild(ce(
        "p",
        "load-error",
        "Die Datei data/documents.json konnte nicht geladen werden. Bitte die Seite über einen Webserver öffnen, nicht als einzelne Datei."
      ));
      mount.appendChild(main);
    });

  function render(room) {
    var shell = ce("div", "shell");
    shell.appendChild(renderMast(room));
    shell.appendChild(renderNav(room));
    var main = ce("main", "wrap");
    main.id = "haupt";
    if (pageId === "start") renderStart(main, room);
    else if (pageId === "missing") renderMissing(main);
    else renderZonePage(main, room, pageId);
    shell.appendChild(main);
    shell.appendChild(renderFooter(room));
    mount.appendChild(shell);
  }

  function renderMast(room) {
    var header = ce("header", "mast");
    var inner = ce("div", "wrap mast-inner");
    var brand = ce("div", "brand");
    brand.appendChild(ce("p", "eyebrow", room.meta.entity + " · Angola · Provinz Lunda Sul"));
    brand.appendChild(ce(pageId === "start" ? "h1" : "p", "wordmark", room.meta.name));
    brand.appendChild(ce("p", "product", room.meta.product));
    var meta = ce("dl", "mast-meta");
    [
      ["Stand", room.meta.stand],
      ["Fassung", room.meta.version + " · Entwurf"],
      ["Gate 1", "nicht erreicht"],
      ["Charakter", room.meta.classification]
    ].forEach(function (pair) {
      var row = ce("div");
      row.appendChild(ce("dt", null, pair[0]));
      row.appendChild(ce("dd", null, pair[1]));
      meta.appendChild(row);
    });
    inner.appendChild(brand);
    inner.appendChild(meta);
    header.appendChild(inner);
    return header;
  }

  function renderNav(room) {
    var bar = ce("nav", "stand-nav");
    bar.setAttribute("aria-label", "Stände");
    var inner = ce("div", "wrap nav-row");
    inner.appendChild(navLink("index.html", "Start", pageId === "start"));
    room.zones.forEach(function (zone) {
      inner.appendChild(navLink(zone.href, zone.nav, pageId === zone.id));
    });
    bar.appendChild(inner);
    return bar;
  }

  function navLink(href, label, current) {
    var link = ce("a", current ? "is-current" : "", label);
    link.href = siteHref(href);
    if (current) link.setAttribute("aria-current", "page");
    return link;
  }

  function renderStart(main, room) {
    main.appendChild(renderHall(room));
    var lead = room.narrative.filter(function (section) {
      return section.id.indexOf("satchifunga") === 0;
    })[0];
    if (lead) {
      var leadBlock = ce("section", "lead-block");
      lead.blocks.forEach(function (block) {
        if (block.type === "p") leadBlock.appendChild(ce("p", null, block.text));
      });
      main.appendChild(leadBlock);
    }

    var jump = ce("nav", "jump");
    jump.setAttribute("aria-label", "Abschnitte der Startseite");
    room.narrative.forEach(function (section) {
      if (section.id.indexOf("satchifunga") === 0) return;
      var link = ce("a", null, section.title.replace(/^\d+\.\s*/, ""));
      link.href = "#" + section.id;
      jump.appendChild(link);
    });
    main.appendChild(jump);

    room.narrative.forEach(function (section) {
      if (section.id.indexOf("satchifunga") === 0) return;
      if (section.id === "unterlagen") {
        var chapter = ce("section", "chapter");
        chapter.id = section.id;
        chapter.appendChild(ce("h2", null, section.title));
        var filters = renderFilters();
        chapter.appendChild(filters.bar);
        room.zones.forEach(function (zone) {
          chapter.appendChild(renderZoneBlock(room, zone, { linked: true }));
        });
        main.appendChild(chapter);
        filters.bind(chapter, { collapseZones: true });
        return;
      }
      main.appendChild(renderNarrative(section));
    });
  }

  function renderHall(room) {
    var section = ce("section", "hall");
    section.setAttribute("aria-label", "Hallenplan");
    var head = ce("div", "hall-head");
    head.appendChild(ce("p", "kicker", "Weg der Prüfung"));
    head.appendChild(ce("h2", null, "Hallenplan"));
    head.appendChild(ce(
      "p",
      "lede",
      "Vom Teaser durch das NDA-Gate in den Deal Room, danach die Pulte. Jeder Stand ist eine Zone dieses Datenraums."
    ));
    section.appendChild(head);

    var floor = ce("div", "hall-floor");
    floor.appendChild(ce("p", "hall-mark", "Halle Satchifunga"));

    var path = ce("div", "hall-path");
    path.appendChild(booth(room, zoneById(room, "lobby")));
    path.appendChild(join());
    path.appendChild(booth(room, zoneById(room, "nda")));
    floor.appendChild(path);

    var deal = zoneById(room, "deal");
    var wing = ce("div", "wing");
    var wingLabel = ce("a", "wing-label");
    wingLabel.href = siteHref(deal.href);
    wingLabel.appendChild(ce("span", "booth-no", deal.code));
    wingLabel.appendChild(ce("span", "booth-name", "Deal Room"));
    wingLabel.appendChild(ce("span", "booth-meta", "Sechs Stände"));
    wing.appendChild(wingLabel);
    var grid = ce("div", "wing-grid");
    room.zones.filter(function (zone) { return zone.hall === "wing"; }).forEach(function (zone) {
      grid.appendChild(booth(room, zone));
    });
    wing.appendChild(grid);
    floor.appendChild(wing);

    var desks = ce("div", "hall-desks");
    room.zones.filter(function (zone) { return zone.hall === "desk"; }).forEach(function (zone) {
      desks.appendChild(booth(room, zone));
    });
    floor.appendChild(desks);

    var indexZone = zoneById(room, "index");
    var side = ce("a", "side-link", "Arbeitsverzeichnis: Index und Manifest");
    side.href = siteHref(indexZone.href);
    floor.appendChild(side);

    section.appendChild(floor);
    return section;
  }

  function join() {
    var node = ce("span", "hall-join");
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function booth(room, zone) {
    var link = ce("a", "booth" + (zone.id === "nda" ? " booth-nda" : ""));
    link.href = siteHref(zone.href);
    link.appendChild(ce("span", "booth-no", zone.code));
    link.appendChild(ce("span", "booth-name", zone.short));
    var count = room.documents.filter(function (doc) { return doc.zone === zone.id; }).length;
    link.appendChild(ce("span", "booth-meta", countLabel(count)));
    return link;
  }

  function renderNarrative(section) {
    var chapter = ce("section", "chapter");
    chapter.id = section.id;
    chapter.appendChild(ce("h2", null, section.title));
    appendBlocks(chapter, section.blocks);
    return chapter;
  }

  function appendBlocks(parent, blocks) {
    blocks.forEach(function (block, index) {
      var next = blocks[index + 1];
      if (block.type === "p" && next && (next.type === "ul" || next.type === "ol") && block.text.length < 60) {
        parent.appendChild(ce("h3", null, block.text));
        return;
      }
      if (block.type === "p") parent.appendChild(ce("p", null, block.text));
      if (block.type === "h") parent.appendChild(ce("h3", null, block.text));
      if (block.type === "ul" || block.type === "ol") {
        var list = ce(block.type);
        block.items.forEach(function (item) {
          list.appendChild(ce("li", null, item));
        });
        parent.appendChild(list);
      }
      if (block.type === "table") parent.appendChild(renderTable(block));
    });
  }

  function renderTable(block) {
    var wrap = ce("div", "table-scroll");
    var table = ce("table");
    var thead = ce("thead");
    var headRow = ce("tr");
    block.headers.forEach(function (header) {
      var cell = ce("th", null, header);
      cell.scope = "col";
      headRow.appendChild(cell);
    });
    thead.appendChild(headRow);
    var tbody = ce("tbody");
    block.rows.forEach(function (row) {
      var tr = ce("tr");
      row.forEach(function (cell, index) {
        var node = ce(index === 0 ? "th" : "td", null, cell);
        if (index === 0) node.scope = "row";
        tr.appendChild(node);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderZonePage(main, room, id) {
    var zone = zoneById(room, id);
    if (!zone) {
      renderMissing(main);
      return;
    }
    main.appendChild(renderCrumb(room, zone));
    main.appendChild(renderZoneBlock(room, zone, { linked: false, filters: true }));
    if (zone.id === "luecken") {
      var gaps = room.narrative.filter(function (section) { return section.id === "luecken"; })[0];
      if (gaps) main.appendChild(renderNarrative(gaps));
    }
    main.appendChild(renderPager(room, zone));
  }

  function renderZoneBlock(room, zone, options) {
    var section = ce("section", "zone-block tone-" + (zone.tone || "plain"));
    section.id = "zone-" + zone.id;
    var head = ce("header", "zone-head");
    if (options.linked) {
      var heading = ce("h3");
      var link = ce("a", null, zone.title);
      link.href = siteHref(zone.href);
      heading.appendChild(link);
      head.appendChild(heading);
    } else {
      head.appendChild(ce("p", "kicker", "Stand " + zone.code));
      head.appendChild(ce("h1", null, zone.short));
    }
    head.appendChild(ce("p", "access", "Zugang: " + zone.access));
    if (zone.folder) head.appendChild(ce("p", "folder", zone.folder));
    var hasFiles = room.documents.some(function (doc) {
      return doc.zone === zone.id && doc.files && doc.files.length;
    });
    if (hasFiles) head.appendChild(ce("p", "drive-note", room.meta.driveNote));
    section.appendChild(head);

    if (zone.statements && zone.statements.length) {
      var quote = ce("blockquote", "statement");
      zone.statements.forEach(function (text) {
        quote.appendChild(ce("p", "statement-line", text));
      });
      if (zone.tone === "geology") {
        quote.appendChild(ce("p", "statement-standard", "Standard: " + room.meta.standard));
      }
      section.appendChild(quote);
    }

    (zone.intro || []).forEach(function (text) {
      section.appendChild(ce("p", "intro tone-" + (zone.tone || "plain"), text));
    });

    if (!options.linked && zone.id === "lobby") section.appendChild(renderSheet(room.lobbySheet));
    if (!options.linked && zone.id === "nda") section.appendChild(renderNda(room));
    if (!options.linked && zone.id === "deal") {
      var grid = ce("div", "wing-grid in-page");
      room.zones.filter(function (child) { return child.parent === "deal"; }).forEach(function (child) {
        grid.appendChild(booth(room, child));
      });
      section.appendChild(grid);
    }

    (zone.groups || [{ id: "main" }]).forEach(function (group) {
      var docs = room.documents.filter(function (doc) {
        return doc.zone === zone.id && doc.group === group.id;
      });
      if (!docs.length && !group.note) return;
      if (group.title || group.note) {
        var note = ce("div", "group-note");
        if (group.title) note.appendChild(ce("h2", null, group.title));
        if (group.note) note.appendChild(ce("p", null, group.note));
        section.appendChild(note);
      }
      if (docs.length) {
        var list = ce("div", "cards");
        docs.forEach(function (doc) { list.appendChild(renderCard(doc)); });
        section.appendChild(list);
      }
    });

    if (options.filters && room.documents.some(function (doc) { return doc.zone === zone.id; })) {
      var filters = renderFilters();
      var anchor = section.querySelector(".group-note, .cards");
      if (anchor) section.insertBefore(filters.bar, anchor);
      else section.appendChild(filters.bar);
      filters.bind(section, { collapseZones: false });
    }
    return section;
  }

  function renderCard(doc) {
    var article = ce("article", "card" + (doc.doNotUse ? " card-stop" : "") + (doc.internalOnly ? " card-internal" : ""));
    article.id = "doc-" + doc.id;
    article.dataset.grade = doc.grade || "";
    article.dataset.kind = doc.kind || "";
    article.dataset.search = [doc.title, doc.description, doc.status]
      .concat((doc.files || []).map(function (file) { return file.filename; }))
      .join(" ")
      .toLowerCase();

    var top = ce("div", "card-top");
    var titles = ce("div", "card-titles");
    if (doc.doNotUse) titles.appendChild(ce("p", "flag flag-stop", "Nicht verwenden"));
    if (doc.internalOnly) titles.appendChild(ce("p", "flag flag-internal", "Nur intern, nicht verlinkt"));
    titles.appendChild(ce("h4", "card-title", doc.title));
    top.appendChild(titles);

    var badges = ce("ul", "badges");
    if (doc.grade) badges.appendChild(ce("li", "badge grade-" + doc.grade, "Grad " + doc.grade));
    if (doc.kind) badges.appendChild(ce("li", "badge kind", doc.kind));
    top.appendChild(badges);
    article.appendChild(top);

    article.appendChild(ce("p", "card-desc", doc.description));
    if (doc.status) article.appendChild(ce("p", "card-status", "Status: " + doc.status));

    if (doc.files && doc.files.length) {
      var list = ce("ul", "files");
      doc.files.forEach(function (file) {
        var item = ce("li");
        var url = driveUrl(file.viewUrl);
        if (url) {
          var link = ce("a", "file-link", file.label + " ansehen");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          var hint = ce("span", "sr", " (öffnet Google Drive in einem neuen Tab)");
          link.appendChild(hint);
          item.appendChild(link);
        }
        var meta = [file.filename, file.issuer, file.date, file.language].filter(Boolean).join(" · ");
        item.appendChild(ce("span", "file-meta", meta));
        list.appendChild(item);
      });
      article.appendChild(list);
    } else if (doc.internalOnly) {
      article.appendChild(ce(
        "p",
        "drive-note",
        "Diese Unterlage ist nicht verlinkt und nicht zur Weitergabe an Investoren bestimmt."
      ));
    }
    return article;
  }

  function renderSheet(sheet) {
    var article = ce("article", "sheet");
    article.appendChild(ce("p", "sheet-kicker", sheet.kicker));
    article.appendChild(ce("p", "sheet-running", sheet.runningHead));
    article.appendChild(ce("h2", null, sheet.title));
    article.appendChild(ce("p", "sheet-sub", sheet.subtitle));
    article.appendChild(ce("p", "sheet-stamp", sheet.stamp));
    article.appendChild(ce("p", null, sheet.lead));
    var list = ce("dl", "sheet-rows");
    sheet.rows.forEach(function (row) {
      var pair = ce("div");
      pair.appendChild(ce("dt", null, row.label));
      pair.appendChild(ce("dd", null, row.text));
      list.appendChild(pair);
    });
    article.appendChild(list);
    article.appendChild(ce("h3", null, sheet.excludesTitle));
    article.appendChild(ce("p", null, sheet.excludes));
    article.appendChild(ce("p", "sheet-foot", sheet.footer));
    return article;
  }

  function renderNda(room) {
    var box = ce("section", "process");
    box.appendChild(ce("h2", null, room.nda.stepsTitle));
    var list = ce("ol", "steps");
    room.nda.steps.forEach(function (step) {
      list.appendChild(ce("li", null, step));
    });
    box.appendChild(list);
    box.appendChild(ce("p", "contact", room.nda.contact));
    box.appendChild(ce("h3", null, room.nda.limitsTitle));
    box.appendChild(ce("p", null, room.nda.limits));
    return box;
  }

  function renderCrumb(room, zone) {
    var nav = ce("nav", "crumb");
    nav.setAttribute("aria-label", "Pfad");
    var home = ce("a", null, "Start");
    home.href = siteHref("index.html");
    nav.appendChild(home);
    if (zone.parent) {
      var parent = zoneById(room, zone.parent);
      nav.appendChild(ce("span", "crumb-sep", "/"));
      var parentLink = ce("a", null, parent.short);
      parentLink.href = siteHref(parent.href);
      nav.appendChild(parentLink);
    }
    nav.appendChild(ce("span", "crumb-sep", "/"));
    nav.appendChild(ce("span", null, zone.short));
    return nav;
  }

  function renderPager(room, zone) {
    var path = ["lobby", "nda", "deal", "titel", "gesellschaft", "vertraege", "geologie", "umwelt", "finanzen", "qa", "desk", "luecken", "quellen"];
    var index = path.indexOf(zone.id);
    var nav = ce("nav", "pager");
    nav.setAttribute("aria-label", "Benachbarte Stände");
    if (index > 0) {
      var prev = zoneById(room, path[index - 1]);
      var prevLink = ce("a", "pager-prev", "Vorheriger Stand: " + prev.short);
      prevLink.href = siteHref(prev.href);
      nav.appendChild(prevLink);
    }
    if (index > -1 && index < path.length - 1) {
      var next = zoneById(room, path[index + 1]);
      var nextLink = ce("a", "pager-next", "Nächster Stand: " + next.short);
      nextLink.href = siteHref(next.href);
      nav.appendChild(nextLink);
    }
    return nav;
  }

  function renderMissing(main) {
    main.appendChild(ce("h1", null, "Diese Seite gibt es in der Halle nicht."));
    var paragraph = ce("p");
    var link = ce("a", null, "Zur Startseite");
    link.href = siteHref("index.html");
    paragraph.appendChild(link);
    main.appendChild(paragraph);
  }

  function renderFooter(room) {
    var footer = ce("footer", "site-footer");
    var inner = ce("div", "wrap");
    inner.appendChild(ce("p", null, room.meta.limits));
    inner.appendChild(ce("p", null, room.meta.contact));
    var rules = room.narrative.filter(function (section) { return section.id === "regeln"; })[0];
    if (rules) {
      var closing = rules.blocks.filter(function (block) { return block.type === "p"; })[0];
      if (closing) inner.appendChild(ce("p", null, closing.text));
    }
    var row = ce("p", "footer-links");
    var home = ce("a", null, "Startseite");
    home.href = siteHref("index.html");
    var rulesLink = ce("a", null, "Nutzungsregeln");
    rulesLink.href = siteHref("index.html") + "#regeln";
    var printButton = ce("button", "print", "Drucken");
    printButton.type = "button";
    printButton.addEventListener("click", function () { window.print(); });
    row.appendChild(home);
    row.appendChild(ce("span", "crumb-sep", "·"));
    row.appendChild(rulesLink);
    row.appendChild(ce("span", "crumb-sep", "·"));
    row.appendChild(printButton);
    inner.appendChild(row);
    footer.appendChild(inner);
    return footer;
  }

  function renderFilters() {
    var bar = ce("div", "filters");
    var search = ce("input", "search");
    search.type = "search";
    search.placeholder = "Suche in Titel und Beschreibung";
    search.setAttribute("aria-label", "Suche in Titel und Beschreibung");
    search.autocomplete = "off";
    bar.appendChild(search);

    var choices = [
      ["all", "Alle"],
      ["grade:A", "Grad A"],
      ["grade:B", "Grad B"],
      ["grade:C", "Grad C"],
      ["kind:Fakt", "Fakt"],
      ["kind:Annahme", "Annahme"],
      ["kind:Arbeitsdokument", "Arbeitsdokument"]
    ];
    var buttons = choices.map(function (choice, index) {
      var button = ce("button", index === 0 ? "is-on" : "", choice[1]);
      button.type = "button";
      button.dataset.filter = choice[0];
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      bar.appendChild(button);
      return button;
    });
    var count = ce("p", "filter-count", "");
    bar.appendChild(count);
    var empty = ce("p", "filter-empty", "Keine Unterlage entspricht der Auswahl.");
    empty.hidden = true;

    var active = "all";

    function apply(scope) {
      var query = search.value.trim().toLowerCase();
      var shown = 0;
      scope.querySelectorAll(".card").forEach(function (card) {
        var filterOk = active === "all" ||
          active === "grade:" + card.dataset.grade ||
          active === "kind:" + card.dataset.kind;
        var textOk = !query || (card.dataset.search || "").indexOf(query) !== -1;
        var visible = filterOk && textOk;
        card.hidden = !visible;
        if (visible) shown += 1;
      });
      scope.querySelectorAll(".group-note").forEach(function (note) {
        var cards = note.nextElementSibling;
        if (!cards || !cards.classList.contains("cards")) return;
        var visibleCard = cards.querySelector(".card:not([hidden])");
        note.hidden = !visibleCard;
        cards.hidden = !visibleCard;
      });
      scope.querySelectorAll(".cards").forEach(function (cards) {
        if (cards.previousElementSibling && cards.previousElementSibling.classList.contains("group-note")) return;
        var visibleCard = cards.querySelector(".card:not([hidden])");
        cards.hidden = !visibleCard;
      });
      if (scope.dataset.collapse === "true") {
        scope.querySelectorAll(".zone-block").forEach(function (block) {
          if (!block.querySelector(".card")) return;
          block.hidden = !block.querySelector(".card:not([hidden])");
        });
      }
      count.textContent = countLabel(shown);
      empty.hidden = shown !== 0;
    }

    return {
      bar: bar,
      bind: function (scope, options) {
        if (options && options.collapseZones) scope.dataset.collapse = "true";
        var barInScope = scope.querySelector(".filters");
        if (barInScope) barInScope.insertAdjacentElement("afterend", empty);
        else scope.appendChild(empty);
        buttons.forEach(function (button) {
          button.addEventListener("click", function () {
            active = button.dataset.filter;
            buttons.forEach(function (other) {
              var on = other === button;
              other.classList.toggle("is-on", on);
              other.setAttribute("aria-pressed", on ? "true" : "false");
            });
            apply(scope);
          });
        });
        search.addEventListener("input", function () { apply(scope); });
        apply(scope);
      }
    };
  }
})();
