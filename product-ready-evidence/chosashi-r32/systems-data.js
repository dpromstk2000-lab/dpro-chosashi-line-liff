/* DPRO PRODUCT SITE / DPRO MEDICAL CATALOG ADDON V1.2.1
 * Loads the locked 50-system baseline synchronously during document parsing,
 * then adds DPRO MEDICAL as product 51 before PRODUCT SITE rendering starts.
 */
(() => {
  "use strict";

  const CORE = "https://cdn.jsdelivr.net/gh/dpromstk2000-lab/dpro-line-systems-site@d8ac2578c4b713493dd80315f8ba7e6d3bfcc269/systems-data.js";

  function replaceText(root, from, to) {
    if (!root || !from) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if ((node.nodeValue || "").includes(from)) {
        node.nodeValue = node.nodeValue.split(from).join(to);
      }
    });
  }

  function patchStructuredData() {
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent || "");
        const visit = node => {
          if (!node || typeof node !== "object") return;
          if (typeof node.name === "string") {
            node.name = node.name
              .replaceAll("50システム", "51システム")
              .replaceAll("50の業種別", "51の業種別")
              .replaceAll("DPRO LINE SYSTEMS 50製品", "DPRO LINE SYSTEMS 51製品");
          }
          if (typeof node.description === "string") {
            node.description = node.description
              .replaceAll("50システム", "51システム")
              .replaceAll("50の業種別", "51の業種別")
              .replaceAll("50の業種専用", "51の業種専用")
              .replaceAll("50の完成", "51の完成");
          }
          if (Object.prototype.hasOwnProperty.call(node, "numberOfItems") && node.numberOfItems === 50) {
            node.numberOfItems = 51;
          }
          Object.values(node).forEach(value => {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === "object") visit(value);
          });
        };
        visit(data);
        script.textContent = JSON.stringify(data);
      } catch (_) {}
    });
  }

  function patch51Copy() {
    if (typeof document === "undefined") return;
    document.title = String(document.title || "")
      .replaceAll("50システム", "51システム")
      .replaceAll("50の業種別", "51の業種別");

    document.querySelectorAll(
      'meta[name="description"],meta[property="og:title"],meta[property="og:description"]'
    ).forEach(meta => {
      meta.content = String(meta.content || "")
        .replaceAll("50システム", "51システム")
        .replaceAll("50の業種別", "51の業種別")
        .replaceAll("50の業種専用", "51の業種専用")
        .replaceAll("50の完成", "51の完成");
    });

    if (document.body) {
      [
        ["50の業種別システム", "51の業種別システム"],
        ["50の業種専用DPROシステム", "51の業種専用DPROシステム"],
        ["50製品データを読み込み中", "51製品データを読み込み中"],
        ["50システム一覧", "51システム一覧"],
        ["50システムをすべて見る", "51システムをすべて見る"]
      ].forEach(([from,to]) => replaceText(document.body, from, to));
    }
    patchStructuredData();
  }

  function addMedical(global) {
    const base = global.DPROSystemsData;
    if (!base || !Array.isArray(base.systems)) {
      console.error("DPRO MEDICAL addon: locked baseline unavailable.");
      return false;
    }

    if (!(typeof base.getByCode === "function" && base.getByCode("MEDICAL"))) {
      const medical = Object.freeze({
        code: "MEDICAL",
        assetSlug: "medical",
        name: "DPRO MEDICAL",
        category: "medical_pet",
        systemPage: "systems/medical.html",
        lpUrl: "systems/medical.html",
        flyerHtml: "flyer-medical.html",
        flyerPdf: "flyer-medical.pdf",
        demoUrl: "https://dpromstk2000-lab.github.io/dpro-medical-standard/medical-public-demo.html",
        status: "AVAILABLE",
        verificationStatus: "VERIFIED",
        tagline: "予約・WEB問診・来院受付・院内進行・医院管理・医院HPまでを、一つの医療COREにつなぐ。",
        summary: "医療機関向けに、患者スマホ、予約、WEB問診、受付、待ち状況、院内進行、医院管理PC、受付iPad、スタッフ画面、医院HPをONE CORE / ONE CONTRACTでまとめるDPROシステム。",
        targets: Object.freeze([
          "医療機関","一般・内科","眼科","小児科","整形外科","美容医療","婦人科・女性医療"
        ]),
        features: Object.freeze([
          "予約・当日受付","WEB問診","院内進行・待ち状況","患者スマホ","医院管理PC・受付iPad","医院HP・6診療PRESET"
        ]),
        previewAsset: "systems/medical.html",
        experienceScreens: Object.freeze([])
      });

      /* DPRO LIVE DEMO ALL49 CENTRAL OVERRIDES START */
      const liveDemoOverrides = Object.freeze({
        "BAKERY": "https://dpromstk2000-lab.github.io/bakery-line-system/demo-guide.html",
        "BTYPE": "https://dpromstk2000-lab.github.io/dpro-btype-line-liff/demo-guide.html",
        "BUYBACK": "https://dpromstk2000-lab.github.io/dpro-buyback-line/demo-guide.html",
        "CAKE": "https://dpromstk2000-lab.github.io/dpro-cake-line-liff/demo-guide.html",
        "CAR": "https://dpromstk2000-lab.github.io/dpro-used-car-line-liff/demo-guide.html",
        "CAREPLAN": "https://dpromstk2000-lab.github.io/dpro-careplan-line/demo-guide.html",
        "CARETAXI": "https://dpromstk2000-lab.github.io/dpro-caretaxi-line/demo-guide.html",
        "CHOSASHI": "https://dpromstk2000-lab.github.io/dpro-chosashi-line-liff/demo-guide.html",
        "CONSULT": "https://dpromstk2000-lab.github.io/dpro-consult-line/demo-guide.html",
        "COSMETICS": "https://dpromstk2000-lab.github.io/dpro-cosmetics-line-liff/demo-guide.html",
        "DAYCARE": "https://dpromstk2000-lab.github.io/dpro-dayservice-line/demo-guide.html",
        "DENTAL": "https://dpromstk2000-lab.github.io/DEGITAL-QR/demo-guide.html",
        "DISPOSAL": "https://dpromstk2000-lab.github.io/dpro-disposal-line-liff/demo-guide.html",
        "ESTATE": "https://dpromstk2000-lab.github.io/dpro-estate-line-liff/demo-guide.html",
        "ESTHE": "https://dpromstk2000-lab.github.io/dpro-esthe-relax-line-liff/demo-guide.html",
        "EYE": "https://dpromstk2000-lab.github.io/dpro-eye-salon-line/demo-guide.html",
        "FLOWER": "https://dpromstk2000-lab.github.io/dpro-flower-line-liff/demo-guide.html",
        "FUNERAL": "https://dpromstk2000-lab.github.io/dpro-funeral-line/demo-guide.html",
        "GAKUDO": "https://dpromstk2000-lab.github.io/dpro-gakudo-line/demo-guide.html",
        "GREEN": "https://dpromstk2000-lab.github.io/dpro-green-rental-line/demo-guide.html",
        "GYM": "https://dpromstk2000-lab.github.io/liff-gym-demo/demo-guide.html",
        "GYOSEI": "https://dpromstk2000-lab.github.io/dpro-gyosei-permit-line/demo-guide.html",
        "HAISHOKU": "https://dpromstk2000-lab.github.io/dpro-senior-meal-delivery-line/demo-guide.html",
        "HOMECARE": "https://dpromstk2000-lab.github.io/dpro-homecare-family-line/demo-guide.html",
        "HOMENURSING": "https://dpromstk2000-lab.github.io/dpro-home-nursing-line/demo-guide.html",
        "HOUKAGO": "https://dpromstk2000-lab.github.io/dpro-houkago-dayservice-line/demo-guide.html",
        "HOUSEKEEP": "https://dpromstk2000-lab.github.io/dpro-housekeep-line-liff/demo-guide.html",
        "IZAKAYA": "https://izakaya-liff-demo.pages.dev/demo-guide.html",
        "KSH": "https://dpromstk2000-lab.github.io/line-shaken-liff/demo-guide.html",
        "PETSALON": "https://dpromstk2000-lab.github.io/dpro-pet-salon-liff/demo-guide.html",
        "PHOTO": "https://dpromstk2000-lab.github.io/dpro-photo-studio-line/demo-guide.html",
        "REFORM": "https://dpromstk2000-lab.github.io/dpro-reform-line-liff/demo-guide.html",
        "REPAIR": "https://dpromstk2000-lab.github.io/dpro-repair-line-liff/demo-guide.html",
        "SALESNAVI": "https://dpro-salesnavi-demo.pages.dev/demo-guide.html",
        "SALON": "https://dpromstk2000-lab.github.io/liff-salon-reserve/demo-guide.html",
        "SCHOOL": "https://dpromstk2000-lab.github.io/dpro-school-line/demo-guide.html",
        "SEITAI": "https://dpromstk2000-lab.github.io/dpro-seitai-line/demo-guide.html",
        "SHIHO": "https://dpromstk2000-lab.github.io/dpro-shiho-inheritance-line-liff/owner.html?demo=1",
        "SHUTTLE": "https://dpromstk2000-lab.github.io/dpro-welfare-shuttle-line/demo-guide.html",
        "SODAN": "https://dpromstk2000-lab.github.io/dpro-sodan-line/demo-guide.html",
        "STAY": "https://dpromstk2000-lab.github.io/dpro-stay-line/demo-guide.html",
        "TAKEOUT": "https://dpromstk2000-lab.github.io/dpro-takeout-line-liff/demo-guide.html",
        "TAX": "https://dpromstk2000-lab.github.io/dpro-tax-accounting-line-liff/demo-guide.html",
        "VET": "https://dpromstk2000-lab.github.io/DPRO-VET-QR/demo-guide.html",
        "WELFARE": "https://dpromstk2000-lab.github.io/dpro-welfare-equipment-line/demo-guide.html",
        "YAKINIKU": "https://dpromstk2000-lab.github.io/dpro-yakiniku-line-liff/demo-guide.html",
        "YOGA": "https://dpromstk2000-lab.github.io/liff-yoga-reserve/demo-guide.html"
      });
      const sourceCodes = new Set(base.systems.map(item => String((item && item.code) || "").toUpperCase()));
      const missingOverrideCodes = Object.keys(liveDemoOverrides).filter(code => !sourceCodes.has(code));
      if (missingOverrideCodes.length) {
        throw new Error("DPRO LIVE DEMO override codes missing from locked CORE: " + missingOverrideCodes.join(", "));
      }
      const systems = base.systems.map((item) => {
        const code = String((item && item.code) || "").toUpperCase();
        const overrideDemoUrl = liveDemoOverrides[code];
        return overrideDemoUrl ? Object.freeze({ ...item, demoUrl: overrideDemoUrl }) : item;
      });
      /* DPRO LIVE DEMO ALL49 CENTRAL OVERRIDES END */
      const dentalIndex = systems.findIndex(item => item && item.code === "DENTAL");
      systems.splice(dentalIndex >= 0 ? dentalIndex + 1 : systems.length, 0, medical);

      const frozenSystems = Object.freeze(systems);
      const byCode = new Map(frozenSystems.map(item => [String(item.code || "").toUpperCase(), item]));

      global.DPROSystemsData = Object.freeze({
        categories: base.categories,
        systems: frozenSystems,
        systemCount: frozenSystems.length,
        getByCode(code) {
          return byCode.get(String(code == null ? "" : code).trim().toUpperCase()) || null;
        },
        getByCategory(category) {
          const key = String(category || "").trim();
          return frozenSystems.filter(item => item.category === key);
        }
      });
    }

    patch51Copy();
    return global.DPROSystemsData?.systems?.length === 51;
  }

  window.__DPRO_MEDICAL_51_BOOT__ = () => {
    const ok = addMedical(window);
    if (!ok) console.error("DPRO MEDICAL addon: expected 51 systems after bootstrap.");
    try { delete window.__DPRO_MEDICAL_51_BOOT__; } catch (_) {}
  };

  if (document.readyState === "loading") {
    document.write(
      '<script src="' + CORE + '"><\/script>' +
      '<script>window.__DPRO_MEDICAL_51_BOOT__();<\/script>'
    );
  } else {
    const script = document.createElement("script");
    script.src = CORE;
    script.async = false;
    script.onload = () => window.__DPRO_MEDICAL_51_BOOT__?.();
    script.onerror = () => console.error("DPRO MEDICAL addon: locked baseline could not be loaded.");
    (document.head || document.documentElement).appendChild(script);
  }
})();