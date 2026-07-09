/* ============================================================
   NERONE N9 — Portfolio interactions
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header scroll state + progress + wave parallax ---------- */
  var header = document.getElementById("siteHeader");
  var progress = document.getElementById("scrollProgress");
  var bgField = document.getElementById("bgField");
  var heroStage = document.getElementById("heroStage");
  var heroReveal = document.getElementById("heroReveal");
  var revealItems = heroReveal
    ? Array.prototype.slice.call(heroReveal.querySelectorAll(".hero-reveal__item"))
    : [];

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // the 3D logo module (logo3d.js) registers window.n9ResetLogoSpin

  function updateHero(y) {
    if (!heroStage) return;
    var range = heroStage.offsetHeight - window.innerHeight;
    var p = range > 0 ? clamp01(y / range) : 0;

    /* --- Phase A: floating tools fade out (0 → 0.18) --- */
    var toolsOp = 1 - clamp01(p / 0.18);

    /* --- logo zooms bigger (0 → 0.40): scale 1 → 1.9 --- */
    var scale = 1 + clamp01(p / 0.40) * 0.9;

    /* --- Phase B: logo flies up & fades out (0.30 → 0.46) --- */
    var exit = clamp01((p - 0.30) / 0.16);
    var introY = -exit * window.innerHeight * 0.62;   // rise off the top
    var introOp = 1 - exit;
    scale += exit * 0.7;                               // accelerate as it leaves

    heroStage.style.setProperty("--toolsOp", toolsOp.toFixed(3));
    heroStage.style.setProperty("--introScale", scale.toFixed(3));
    heroStage.style.setProperty("--introY", introY.toFixed(1) + "px");
    heroStage.style.setProperty("--introOp", introOp.toFixed(3));

    /* --- Phase C: centred text rises from the bottom, staggered (0.48 → 0.95) --- */
    var r = clamp01((p - 0.48) / 0.47);
    for (var i = 0; i < revealItems.length; i++) {
      var lt = clamp01((r - i * 0.08) / 0.5);
      var el = revealItems[i];
      el.style.opacity = lt.toFixed(3);
      el.style.transform = "translateY(" + ((1 - lt) * 48).toFixed(1) + "px)";
    }
    if (heroReveal) heroReveal.setAttribute("data-on", r > 0.05 ? "1" : "0");
  }

  var ticking = false;
  function applyScroll() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? y / h : 0;
    if (header) header.classList.toggle("scrolled", y > 20);
    if (progress) progress.style.width = p * 100 + "%";
    // gently drift the wave field as the page scrolls
    if (bgField) bgField.style.setProperty("--p", p.toFixed(4));
    updateHero(y);
    updateLogoJourney(y);
  }
  window.addEventListener("resize", function () {
    measureLjStage();
    applyScroll();
  });
  window.addEventListener("load", function () {
    measureLjStage();
    applyScroll();
  });
  function onScroll() {
    if (window.n9ResetLogoSpin) window.n9ResetLogoSpin();   // scrolling straightens the 3D logo
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(applyScroll);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  applyScroll();

  /* ---------- Render work (Logos journey) ---------- */
  var live = (typeof PROJECTS !== "undefined" ? PROJECTS : []).filter(function (p) {
    return p.published;
  });

  var PLACEHOLDER =
    "this.parentNode.innerHTML='<div class=\\'project-card__placeholder\\'><span>N9</span>Image coming soon</div>'";

  function cardMedia(p, index) {
    if (p.cover) {
      return (
        '<img src="' + p.cover + '" alt="' + escapeHtml(p.title) + ' logo" loading="lazy" ' +
        'onerror="' + PLACEHOLDER + '" />'
      );
    }
    return (
      '<div class="project-card__placeholder"><span>N9</span>' +
      "Coming soon</div>"
    );
  }

  function tagList(tags) {
    return (tags || [])
      .map(function (t) {
        return '<span class="tag">' + escapeHtml(t) + "</span>";
      })
      .join("");
  }

  function cardHtml(p, i) {
    var num = String(i + 1).padStart(2, "0");
    var mediaClass = "project-card__media" + (p.coverFit === "contain" ? " project-card__media--contain" : "");
    return (
      '<article class="project-card" data-slug="' + p.slug + '" tabindex="0" role="button" aria-label="Open ' + escapeHtml(p.title) + ' case study">' +
        '<div class="' + mediaClass + '">' +
          '<span class="project-card__num">' + num + "</span>" +
          '<span class="project-card__view">View case →</span>' +
          cardMedia(p, i) +
        "</div>" +
        '<div class="project-card__body">' +
          '<h3 class="project-card__title">' + escapeHtml(p.title) + "</h3>" +
          '<p class="project-card__desc">' + escapeHtml(p.description) + "</p>" +
          '<div class="project-card__tags">' + tagList(p.tags) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderGrid(grid, items, emptyMsg) {
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<div class="work__empty">' + emptyMsg + "</div>";
      return;
    }
    grid.innerHTML = items
      .map(function (p, i) {
        return cardHtml(p, i);
      })
      .join("");

    Array.prototype.forEach.call(grid.querySelectorAll(".project-card"), function (card) {
      card.addEventListener("click", function () {
        openCase(card.getAttribute("data-slug"));
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCase(card.getAttribute("data-slug"));
        }
      });
    });

    observeReveals(grid.querySelectorAll(".project-card"));
  }

  function renderAll() {
    var logos = live.filter(function (p) { return (p.type || "logo") === "logo"; });
    renderLogoJourney(logos);
  }

  /* ---------- Logos journey (pinned road through the 4 brands) ---------- */
  var ljStage = document.getElementById("ljStage");
  var ljBoxesWrap = document.getElementById("ljBoxes");
  var ljPath = document.getElementById("ljPath");
  var ljPathLit = document.getElementById("ljPathLit");
  var ljNodesG = document.getElementById("ljNodes");
  var ljGlow = document.getElementById("ljGlow");
  var ljHint = document.getElementById("ljHint");
  var ljHead = document.getElementById("ljHead");
  var ljRoad = document.getElementById("ljRoad");
  var ljGround = document.querySelector(".lj-ground");

  var ljReady = false;
  var ljMQ = window.matchMedia("(max-width: 860px)");   // phones/tablets -> static stack
  var ljBoxEls = [];
  var ljNodeEls = [];
  var ljBoxDots = [];
  var ljCheckFrac = 0.5;   // fixed checkpoint along the road (end of the red line)
  var ljCount = 0;
  var ljNodeFrac = [];   // path fraction for each stop
  var ljHoldP = [];      // scroll-progress at which each box is centred
  var ljPathLen = 0;
  var ljStageTop = 0, ljStageH = 0;
  var SVGNS = "http://www.w3.org/2000/svg";

  function lerp(a, b, t) { return a + (b - a) * t; }

  function renderLogoJourney(logos) {
    if (!ljBoxesWrap || !ljPath) return;
    ljCount = logos.length;
    if (!ljCount) return;

    // build the boxes
    ljBoxesWrap.innerHTML = logos.map(function (p, i) {
      var num = String(i + 1).padStart(2, "0");
      var sub = [p.client && p.client !== "—" ? p.client : "", p.year && p.year !== "—" ? p.year : ""]
        .filter(Boolean).join(" · ");
      var img = p.cover
        ? '<img src="' + p.cover + '" alt="' + escapeHtml(p.title) + '" loading="lazy" onerror="this.style.display=\'none\'" />'
        : '<span style="font-family:var(--font-mono);color:var(--text-mute)">N9</span>';
      return (
        '<div class="lj-box" data-slug="' + p.slug + '">' +
          '<div class="lj-box__frame" role="button" tabindex="0" aria-label="Open ' + escapeHtml(p.title) + ' case study">' +
            '<span class="lj-box__num">' + num + '</span>' +
            img +
            '<span class="lj-box__view">View case →</span>' +
          '</div>' +
          '<div class="lj-box__cap">' +
            '<div class="lj-box__title">' + escapeHtml(p.title) + '</div>' +
            (sub ? '<div class="lj-box__sub">' + escapeHtml(sub) + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    }).join("");
    ljBoxEls = Array.prototype.slice.call(ljBoxesWrap.querySelectorAll(".lj-box"));

    // wire clicks
    ljBoxEls.forEach(function (box) {
      var slug = box.getAttribute("data-slug");
      var frame = box.querySelector(".lj-box__frame");
      frame.addEventListener("click", function () { openCase(slug); });
      frame.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCase(slug); }
      });
    });

    // path geometry + node/hold positions (skipped on mobile static layout)
    ljNodeFrac = [];
    ljHoldP = [];
    ljNodeEls = [];
    ljBoxDots = [];
    if (ljNodesG) ljNodesG.innerHTML = "";
    try {
      ljPathLen = ljPath.getTotalLength();
      for (var i = 0; i < ljCount; i++) {
        var frac = ljCount > 1 ? 0.15 + 0.75 * (i / (ljCount - 1)) : 0.5;
        ljNodeFrac.push(frac);
        ljHoldP.push((i + 0.5) / ljCount);
        var pt = ljPath.getPointAtLength(frac * ljPathLen);
        var node = document.createElementNS(SVGNS, "circle");
        node.setAttribute("class", "lj-node");
        node.setAttribute("cx", pt.x);
        node.setAttribute("cy", pt.y);
        node.setAttribute("r", "7");
        if (ljNodesG) ljNodesG.appendChild(node);
        ljNodeEls.push(node);

        // one glowing dot per box — rides the road in sync with its box
        var dot = document.createElementNS(SVGNS, "circle");
        dot.setAttribute("class", "lj-boxdot");
        dot.setAttribute("r", "8");
        dot.setAttribute("filter", "url(#ljGlowF)");
        dot.style.opacity = "0";
        if (ljNodesG) ljNodesG.appendChild(dot);
        ljBoxDots.push(dot);
      }
      // permanent red line: from the road start (near) up to the checkpoint
      if (ljPathLit) {
        var litLen = ljCheckFrac * ljPathLen;
        ljPathLit.style.strokeDasharray = litLen + " " + (ljPathLen - litLen);
        ljPathLit.style.strokeDashoffset = "0";
      }
      // fixed checkpoint marker — the point on the road each box arrives at
      if (ljGlow) {
        var cp = ljPath.getPointAtLength(ljCheckFrac * ljPathLen);
        ljGlow.setAttribute("cx", cp.x);
        ljGlow.setAttribute("cy", cp.y);
        ljGlow.setAttribute("r", "6");
      }
      ljReady = true;
    } catch (e) {
      ljReady = false;   // boxes still show via the static mobile/grid CSS
    }

    measureLjStage();
  }

  function measureLjStage() {
    if (!ljStage) return;
    var rect = ljStage.getBoundingClientRect();
    ljStageTop = rect.top + (window.scrollY || document.documentElement.scrollTop);
    ljStageH = ljStage.offsetHeight;
  }

  function ljGlowFrac(p) {
    if (p <= ljHoldP[0]) return lerp(0, ljNodeFrac[0], ljHoldP[0] > 0 ? p / ljHoldP[0] : 1);
    var last = ljCount - 1;
    if (p >= ljHoldP[last]) {
      var denom = 1 - ljHoldP[last];
      return lerp(ljNodeFrac[last], 1, denom > 0 ? (p - ljHoldP[last]) / denom : 1);
    }
    for (var i = 0; i < last; i++) {
      if (p <= ljHoldP[i + 1]) {
        var t = (p - ljHoldP[i]) / (ljHoldP[i + 1] - ljHoldP[i]);
        return lerp(ljNodeFrac[i], ljNodeFrac[i + 1], t);
      }
    }
    return ljNodeFrac[last];
  }

  var ljWasVisible = false;
  function updateLogoJourney(y) {
    if (!ljReady || !ljStage || ljMQ.matches) return;   // static stack on phones

    // Skip all the per-frame work while the Logos section is off-screen. Run one
    // final update as it leaves so boxes/dots settle in their end state.
    var visible = (y + window.innerHeight > ljStageTop) && (y < ljStageTop + ljStageH);
    if (!visible) {
      if (!ljWasVisible) return;
      ljWasVisible = false;
    } else {
      ljWasVisible = true;
    }

    var range = ljStageH - window.innerHeight;
    var p = range > 0 ? clamp01((y - ljStageTop) / range) : 0;

    // Each logo box, with its own dot, travels the road from the far horizon down
    // to a FIXED checkpoint (end of the permanent red line). At the checkpoint the
    // box is fully shown and its dot lights up, then it dwells (a pause) before it
    // slides on toward the viewer and fades, letting the next logo come up.
    var vh = window.innerHeight / 100;
    var C = ljCheckFrac;
    for (var i = 0; i < ljCount; i++) {
      var lt = (p - i / ljCount) * ljCount;          // local 0..1 within this stop

      // three phases: approach [0,0.35] · dwell/pause [0.35,0.65] · depart [0.65,1]
      var tp;                                        // 0 far · 0.5 at checkpoint · 1 passed
      if (lt < 0.35) tp = (lt / 0.35) * 0.5;
      else if (lt < 0.65) tp = 0.5;                  // <-- the pause
      else tp = 0.5 + ((lt - 0.65) / 0.35) * 0.5;
      tp = clamp01(tp);

      var aIn = i === 0 ? clamp01((lt + 0.05) / 0.18) : clamp01((lt + 0.10) / 0.28);
      var pass = clamp01((lt - 0.70) / 0.28);
      var op = Math.min(aIn, 1 - pass);

      var yOff = (-15 + tp * 46) * vh;               // -15vh (far) -> +31vh (passed)
      var sc = 0.5 + tp * 1.35;
      var box = ljBoxEls[i];
      box.style.opacity = op.toFixed(3);
      box.style.transform =
        "translate(-50%, -50%) translateY(" + yOff.toFixed(1) + "px) scale(" + sc.toFixed(3) + ")";
      if (op > 0.5) box.classList.add("is-active"); else box.classList.remove("is-active");

      // the box's dot on the road: far -> checkpoint (dwell, glowing) -> near
      var dot = ljBoxDots[i];
      if (dot) {
        var dfrac;
        if (lt < 0.35) dfrac = 1 - (lt / 0.35) * (1 - C);   // far end -> checkpoint
        else if (lt < 0.65) dfrac = C;                       // hold at checkpoint
        else dfrac = C - clamp01((lt - 0.65) / 0.35) * C;    // checkpoint -> near end
        dfrac = clamp01(dfrac);
        var dp = ljPath.getPointAtLength(dfrac * ljPathLen);
        // bright/large only while at the checkpoint, dim while travelling
        var atPoint = clamp01((lt - 0.28) / 0.07) * (1 - clamp01((lt - 0.66) / 0.08));
        dot.setAttribute("cx", dp.x);
        dot.setAttribute("cy", dp.y);
        dot.setAttribute("r", (5 + atPoint * 11).toFixed(1));
        dot.style.opacity = (op * (0.28 + 0.72 * atPoint)).toFixed(3);
      }
    }

    // road lane dashes flow toward the viewer as you scroll
    if (ljRoad) ljRoad.style.setProperty("--laneoff", (p * ljPathLen * 1.2).toFixed(1));
    // the checkered ground glides smoothly forward/back with the scroll
    if (ljGround) ljGround.style.setProperty("--gy", (p * 1200).toFixed(1) + "px");

    if (ljHint) ljHint.style.opacity = (1 - clamp01(p / 0.04)).toFixed(2);
    // fade the section heading out once scrolling begins so it never sits on a box
    if (ljHead) ljHead.style.opacity = (1 - clamp01((p - 0.03) / 0.07)).toFixed(3);
  }

  /* ---------- Case overlay ---------- */
  var overlay = document.getElementById("overlay");
  var overlayContent = document.getElementById("overlayContent");
  var overlayClose = document.getElementById("overlayClose");

  function openCase(slug) {
    var p = live.find(function (x) {
      return x.slug === slug;
    });
    if (!p || !overlay) return;

    var metaHtml = "";
    var metaKeys = Object.keys(p.meta || {});
    var baseMeta = [];
    if (p.client && p.client !== "—") baseMeta.push(["Client", p.client]);
    if (p.year && p.year !== "—") baseMeta.push(["Year", p.year]);
    if (p.category) baseMeta.push(["Discipline", p.category]);
    var extraMeta = metaKeys.map(function (k) {
      return [k, p.meta[k]];
    });
    var allMeta = baseMeta.concat(extraMeta);
    if (allMeta.length) {
      metaHtml =
        '<dl class="case__meta">' +
        allMeta
          .map(function (pair) {
            return "<div><dt>" + escapeHtml(pair[0]) + "</dt><dd>" + escapeHtml(pair[1]) + "</dd></div>";
          })
          .join("") +
        "</dl>";
    }

    var storyHtml = "";
    if (p.story && p.story.length) {
      storyHtml =
        '<div class="case__story"><h3 class="case__story-title">The concept</h3>' +
        p.story
          .map(function (par) {
            return "<p>" + escapeHtml(par) + "</p>";
          })
          .join("") +
        "</div>";
    }

    var galleryHtml;
    if (p.gallery && p.gallery.length) {
      galleryHtml =
        '<div class="case__gallery">' +
        p.gallery
          .map(function (g) {
            var cap = g.caption ? "<figcaption>" + escapeHtml(g.caption) + "</figcaption>" : "";
            var onerr = "this.closest('.case__figure').style.display='none'";
            return '<figure class="case__figure"><img src="' + g.src + '" alt="' + escapeHtml(g.caption || p.title) + '" loading="lazy" onerror="' + onerr + '" />' + cap + "</figure>";
          })
          .join("") +
        "</div>";
    } else {
      galleryHtml = '<div class="case__gallery--placeholder">Full package visuals coming soon.</div>';
    }

    overlayContent.innerHTML =
      '<p class="case__eyebrow">' + escapeHtml(p.category || "Brand Identity") + "</p>" +
      '<h2 class="case__title">' + escapeHtml(p.title) + "</h2>" +
      '<p class="case__desc">' + escapeHtml(p.description) + "</p>" +
      '<div class="case__tags">' + tagList(p.tags) + "</div>" +
      metaHtml +
      storyHtml +
      galleryHtml;

    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // wire gallery images to the lightbox
    currentGallery = p.gallery || [];
    Array.prototype.forEach.call(overlayContent.querySelectorAll(".case__figure img"), function (img, i) {
      img.addEventListener("click", function () {
        openLightbox(i);
      });
    });
  }

  function closeCase() {
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    overlay.scrollTop = 0;
  }

  if (overlayClose) overlayClose.addEventListener("click", closeCase);
  if (overlay)
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeCase();
    });

  /* ---------- Lightbox (swipeable image viewer) ---------- */
  var currentGallery = [];
  var lbIndex = 0;
  var lightbox = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbCaption = document.getElementById("lbCaption");
  var lbCounter = document.getElementById("lbCounter");

  function renderLightbox() {
    var item = currentGallery[lbIndex];
    if (!item || !lbImg) return;
    lbImg.style.opacity = "0";
    var loader = new Image();
    loader.onload = function () {
      lbImg.src = item.src;
      lbImg.alt = item.caption || "";
      lbImg.style.opacity = "1";
    };
    loader.src = item.src;
    if (lbCaption) lbCaption.textContent = item.caption || "";
    if (lbCounter) lbCounter.textContent = (lbIndex + 1) + " / " + currentGallery.length;
  }
  function openLightbox(i) {
    if (!lightbox || !currentGallery.length) return;
    lbIndex = i;
    renderLightbox();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
  }
  function lbStep(dir) {
    if (!currentGallery.length) return;
    lbIndex = (lbIndex + dir + currentGallery.length) % currentGallery.length;
    renderLightbox();
  }
  function lightboxOpen() {
    return lightbox && lightbox.classList.contains("open");
  }

  var lbClose = document.getElementById("lbClose");
  var lbPrev = document.getElementById("lbPrev");
  var lbNext = document.getElementById("lbNext");
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) lbPrev.addEventListener("click", function () { lbStep(-1); });
  if (lbNext) lbNext.addEventListener("click", function () { lbStep(1); });
  if (lightbox)
    lightbox.addEventListener("click", function (e) {
      // click on the backdrop (not the image or a button) closes
      if (e.target === lightbox || e.target.classList.contains("lightbox__figure")) closeLightbox();
    });

  // swipe (touch) + drag (mouse) navigation
  var swipeX = null;
  function swipeStart(x) { swipeX = x; }
  function swipeEnd(x) {
    if (swipeX === null) return;
    var dx = x - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 45) lbStep(dx < 0 ? 1 : -1);
  }
  if (lightbox) {
    lightbox.addEventListener("touchstart", function (e) { swipeStart(e.changedTouches[0].clientX); }, { passive: true });
    lightbox.addEventListener("touchend", function (e) { swipeEnd(e.changedTouches[0].clientX); }, { passive: true });
  }

  document.addEventListener("keydown", function (e) {
    if (lightboxOpen()) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") lbStep(1);
      else if (e.key === "ArrowLeft") lbStep(-1);
      return;
    }
    if (e.key === "Escape") closeCase();
  });

  /* ---------- Reveal on scroll ---------- */
  function observeReveals(nodes) {
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(nodes, function (n) {
        n.classList.add("in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    Array.prototype.forEach.call(nodes, function (n) {
      io.observe(n);
    });
  }

  /* ---------- Utils ---------- */
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- Cursor glow (desktop only, smooth follow) ---------- */
  var glow = document.getElementById("cursorGlow");
  if (glow && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var gx = window.innerWidth / 2, gy = window.innerHeight / 2;
    var tx = gx, ty = gy, glowRaf = null, glowShown = false;

    function glowFollow() {
      gx += (tx - gx) * 0.16;
      gy += (ty - gy) * 0.16;
      glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      if (Math.abs(tx - gx) > 0.4 || Math.abs(ty - gy) > 0.4) {
        glowRaf = window.requestAnimationFrame(glowFollow);
      } else {
        glow.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0)";
        glowRaf = null;
      }
    }

    window.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!glowShown) { glowShown = true; glow.classList.add("is-on"); }
      if (!glowRaf) glowRaf = window.requestAnimationFrame(glowFollow);
    }, { passive: true });

    document.addEventListener("mouseleave", function () {
      glow.classList.remove("is-on"); glowShown = false;
    });
    window.addEventListener("blur", function () {
      glow.classList.remove("is-on"); glowShown = false;
    });
  }

  /* ---------- Theme toggle (dark <-> light) ---------- */
  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var isLight = document.documentElement.getAttribute("data-theme") === "light";
      var next = isLight ? "dark" : "light";
      if (next === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
      try { localStorage.setItem("n9-theme", next); } catch (e) {}
    });
  }

  /* follow the device theme live — unless the visitor made a manual choice */
  if (window.matchMedia) {
    var themeMQ = window.matchMedia("(prefers-color-scheme: light)");
    var onSchemeChange = function (e) {
      var saved;
      try { saved = localStorage.getItem("n9-theme"); } catch (err) { saved = null; }
      if (saved) return;   // manual override wins
      if (e.matches) document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
    };
    if (themeMQ.addEventListener) themeMQ.addEventListener("change", onSchemeChange);
    else if (themeMQ.addListener) themeMQ.addListener(onSchemeChange);
  }

  /* ---------- Init ---------- */
  renderAll();
  measureLjStage();
  applyScroll();
  observeReveals(document.querySelectorAll(".reveal"));
})();
